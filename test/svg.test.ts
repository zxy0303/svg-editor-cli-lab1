import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { FileSvgStorage } from '../src/infrastructure/FileSvgStorage.js';
import { Editor } from '../src/application/Editor.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { TreePresenter } from '../src/presentation/TreePresenter.js';
import type { SvgDocument } from '../src/domain/SvgDocument.js';
import type { Shape } from '../src/domain/Shape.js';

const svg = (body: string, attrs = 'width="400" height="300"'): string => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

test('required external sample loads seven elements, assigns a missing id and round trips', () => {
  const codec = new SvgCodec();
  const loaded = codec.decode(readFileSync('examples/other.svg', 'utf8'));
  assert.deepEqual(loaded.warnings, ['warning: assigned id rect1 to unnamed <rect>']);
  assert.equal(loaded.document.allShapes.length, 7);
  assert.equal(loaded.document.parentOf('r2')!.id, 'g1');
  const restored = codec.decode(codec.encode(loaded.document));
  assert.deepEqual(restored.warnings, []);
  const presenter = new TreePresenter();
  assert.deepEqual(presenter.tree(restored.document), presenter.tree(loaded.document));
});

test('auto ids reserve later explicit ids and are unique across nested groups', () => {
  const { document, warnings } = new SvgCodec().decode(svg('<rect/><g><rect/><circle/></g><rect id="rect1"/>'));
  assert.deepEqual(warnings, [
    'warning: assigned id rect2 to unnamed <rect>',
    'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id rect3 to unnamed <rect>',
    'warning: assigned id circle1 to unnamed <circle>',
  ]);
  assert.equal(new Set(document.allShapes.map((s) => s.id)).size, 5);
});

test('SVG serialization escapes text and attributes and preserves Unicode and omitted styles', () => {
  const codec = new SvgCodec();
  const { document } = codec.decode(svg('<text id="t" x="1" y="2" fill="a&amp;b">你好 &lt;&amp;&gt; "引号" 😀</text><line id="l"/>'));
  const source = codec.encode(document);
  assert.match(source, /a&amp;b/);
  assert.match(source, /你好 &lt;&amp;&gt;/);
  const roundtrip = codec.decode(source).document;
  assert.equal(roundtrip.require('t').textContent, '你好 <&> "引号" 😀');
  assert.equal(roundtrip.require('l').attributes.has('stroke'), false);
  assert.equal(roundtrip.require('l').attributes.has('fill'), false);
});

test('external transform, font, data attributes and viewBox survive round trip and undo snapshots', () => {
  const codec = new SvgCodec();
  const source = svg('<g id="g" transform="translate(60,40)"><text id="t" font-size="16" text-anchor="middle" data-note="keep">hi</text></g>', 'width="400px" height="300px" viewBox="-10 -20 200 150"');
  const document = codec.decode(source).document.clone();
  assert.equal(document.require('g').attributes.get('transform'), 'translate(60,40)');
  assert.equal(document.require('t').attributes.get('font-size'), '16');
  assert.throws(() => document.require('t').setAttribute('font-size', '20'), /unknown attribute/);
  const restored = codec.decode(codec.encode(document)).document;
  assert.equal(restored.rootAttributes.get('viewBox'), '-10 -20 200 150');
  assert.equal(restored.require('t').attributes.get('data-note'), 'keep');
  restored.resize(600, 400);
  assert.equal(restored.rootAttributes.get('viewBox'), '0 0 600 400');
});

test('course SVG group moves as a whole through consecutive edits, undo/redo and save/read', (context) => {
  const source = [...readFileSync('phase_cli_1.md', 'utf8').matchAll(/```xml\n([\s\S]*?)\n```/g)]
    .map((match) => match[1]!)
    .find((xml) => xml.includes('<g id="diagram" transform="translate(60,40)">'));
  assert.ok(source, 'the course nested-transform SVG example must be present');
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  context.after(() => rmSync(dir, { recursive: true, force: true }));
  const input = join(dir, 'course input.svg');
  const output = join(dir, 'course moved.svg');
  writeFileSync(input, source);
  const editor = new Editor(new FileSvgStorage());
  const cli = new CommandDispatcher(editor);
  const codec = new SvgCodec();
  const run = (line: string): void => {
    const result = cli.execute(line);
    assert.ok(result.every((message) => !message.startsWith('error:')), result.join('\n'));
  };
  run(`read ${JSON.stringify(input)}`);
  const points = (): readonly (readonly [number, number])[] => ['a', 'rect1'].flatMap((id) => rectanglePoints(editor.document, id));
  const before = codec.encode(editor.document);
  const original = points();
  run('move diagram 10 0');
  assertTranslation(points(), original, 10, 0);
  const first = codec.encode(editor.document);
  run('move diagram -2.5 1.25');
  assertTranslation(points(), original, 7.5, 1.25);
  const second = codec.encode(editor.document);
  run('undo');
  assert.equal(codec.encode(editor.document), first);
  run('undo');
  assert.equal(codec.encode(editor.document), before);
  assert.deepEqual(cli.execute('set diagram transform "scale(2)"'), ['error: unknown attribute: transform']);
  run('redo');
  assert.equal(codec.encode(editor.document), first);
  run('redo');
  assert.equal(codec.encode(editor.document), second);
  run(`save ${JSON.stringify(output)}`);
  run(`read ${JSON.stringify(output)}`);
  assertTranslation(points(), original, 7.5, 1.25);
  assert.equal(editor.document.require('nodeB').attributes.get('transform'), 'translate(200,0) scale(0.8)');
});

test('transformed subtrees move together under plain or transformed outer containers', () => {
  for (const outer of ['', 'transform="rotate(90) scale(1.5)"']) {
    const codec = new SvgCodec();
    const { document } = codec.decode(svg(`<g id="outer" ${outer}>
      <rect id="a" x="1" y="2" width="3" height="4" transform="rotate(30,2,3)"/>
      <g id="inner" transform="matrix(-2,0,0,3,40,-10)">
        <rect id="b" x="5" y="6" width="7" height="8"/>
        <g id="flat" transform="scale(0)"><rect id="c" x="9" y="10" width="11" height="12"/></g>
      </g>
    </g>`));
    const points = (doc: SvgDocument): readonly (readonly [number, number])[] => ['a', 'b', 'c'].flatMap((id) => rectanglePoints(doc, id));
    const before = points(document);
    document.require('outer').move(0.75, -2.5);
    assertTranslation(points(document), before, 0.75, -2.5);
    const restored = codec.decode(codec.encode(document)).document;
    assertTranslation(points(restored), before, 0.75, -2.5);
  }
});

// Reference geometry for the transform forms used above; production code does not use this evaluator.
function canvasPoint(document: SvgDocument, id: string, x: number, y: number): readonly [number, number] {
  for (let shape: Shape | undefined = document.require(id); shape; shape = document.parentOf(shape.id)) {
    const transforms = [...(shape.attributes.get('transform') ?? '').matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g)];
    for (const match of transforms.reverse()) {
      const values = match[2]!.trim().split(/[\s,]+/).map(Number);
      const a = values[0]!;
      const b = values[1];
      switch (match[1]) {
        case 'translate': [x, y] = [x + a, y + (b ?? 0)]; break;
        case 'scale': [x, y] = [x * a, y * (b ?? a)]; break;
        case 'matrix': [x, y] = [a * x + values[2]! * y + values[4]!, b! * x + values[3]! * y + values[5]!]; break;
        case 'rotate': {
          const angle = a * Math.PI / 180;
          const cx = b ?? 0;
          const cy = values[2] ?? 0;
          const dx = x - cx;
          const dy = y - cy;
          [x, y] = [cx + Math.cos(angle) * dx - Math.sin(angle) * dy, cy + Math.sin(angle) * dx + Math.cos(angle) * dy];
          break;
        }
        default: assert.fail(`unhandled transform in test fixture: ${match[1]}`);
      }
    }
  }
  return [x, y];
}

function rectanglePoints(document: SvgDocument, id: string): readonly (readonly [number, number])[] {
  const attrs = document.require(id).attributes;
  const x = Number(attrs.get('x'));
  const y = Number(attrs.get('y'));
  const width = Number(attrs.get('width'));
  const height = Number(attrs.get('height'));
  const corners: readonly (readonly [number, number])[] = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]];
  return corners.map(([px, py]) => canvasPoint(document, id, px, py));
}

function assertTranslation(actual: readonly (readonly [number, number])[], before: readonly (readonly [number, number])[], dx: number, dy: number): void {
  assert.equal(actual.length, before.length);
  actual.forEach(([x, y], index) => {
    assert.ok(Math.abs(x - before[index]![0] - dx) < 1e-9, `point ${index}: x displacement must equal ${dx}`);
    assert.ok(Math.abs(y - before[index]![1] - dy) < 1e-9, `point ${index}: y displacement must equal ${dy}`);
  });
}

test('CLI-authored CR/LF/tab text survives SVG XML newline normalization', () => {
  const editor = new Editor();
  const cli = new CommandDispatcher(editor);
  cli.execute('init');
  cli.execute('create text t 0 0 "a\\r\\nb\\t中😀"');
  const codec = new SvgCodec();
  const encoded = codec.encode(editor.document);
  assert.match(encoded, /&#13;/);
  assert.equal(codec.decode(encoded).document.require('t').textContent, 'a\r\nb\t中😀');
});

test('invalid XML, duplicate ids, foreign types, mixed content and invalid dimensions are rejected', () => {
  const codec = new SvgCodec();
  const cases = [
    ['<svg><g></svg>', /malformed XML/],
    ['<svg><rect x=1/></svg>', /malformed XML/],
    [svg('<rect id="r"/><g><circle id="r"/></g>'), /id already exists: r/],
    [svg('<rect id="r"/>', 'id="r" width="100" height="100"'), /id already exists: r/],
    [svg('<path id="p"/>'), /unknown shape type: path/],
    [svg('<rect id="r"><circle id="c"/></rect>'), /cannot contain child elements/],
    [svg('<text id="t"><tspan>hi</tspan></text>'), /cannot contain child elements/],
    [svg('<g id="g">stray text</g>'), /unexpected text/],
    [svg('', 'width="-1" height="100"'), /width must be positive/],
    [svg('<rect id="r" width="-10"/>'), /width must be nonnegative/],
    ['<svg xmlns="http://example.com"/>', /unsupported namespace/],
    ['<!DOCTYPE svg><svg/>', /DTD and entities/],
    ['<!DOCTYPE svg [<!ENTITY sample "value">]><svg><text id="t">&sample;</text></svg>', /invalid SVG:/],
    ['<!ENTITY sample "value"><svg/>', /invalid SVG:/],
    ['<other/>', /expected <svg> root/],
  ] as const;
  for (const [source, expected] of cases) assert.throws(() => codec.decode(source), expected, source);
});

test('save/read barriers, default paths and new edit unlocking history', (context) => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  context.after(() => rmSync(dir, { recursive: true, force: true }));
  const editor = new Editor(new FileSvgStorage());
  const cli = new CommandDispatcher(editor);
  const run = (line: string): readonly string[] => {
    const result = cli.execute(line);
    assert.ok(!result.some((v) => v.startsWith('error:')), result.join('\n'));
    return result;
  };
  const file = join(dir, 'diagram with spaces.svg');
  run('init');
  run('create rect r 1 2 3 4');
  assert.deepEqual(cli.execute('save'), ['error: no file path. use save <file.svg>']);
  run(`save "${file}"`);
  assert.deepEqual(cli.execute('undo'), ['error: undo not allowed after io command']);
  assert.deepEqual(cli.execute('redo'), ['error: undo not allowed after io command']);
  assert.deepEqual(cli.execute('save'), ['error: no file path. use save <file.svg>']);
  run(`read "${file}"`);
  run('move r 1 0');
  run('undo');
  assert.equal(editor.document.require('r').attributes.get('x'), '1');
  run('redo');
  run('save');
  assert.equal(new FileSvgStorage().read(file).document.require('r').attributes.get('x'), '2');
  run(`read "${file}"`);
  assert.deepEqual(cli.execute('undo'), ['error: undo not allowed after io command']);
  run('set r fill red');
  run('save');
  assert.equal(new FileSvgStorage().read(file).document.require('r').attributes.get('fill'), 'red');
  assert.equal(readdirSync(dir).length, 1);
  const copy = join(dir, 'copy.svg');
  run(`save "${copy}"`);
  run('set r fill blue');
  run('save');
  assert.equal(new FileSvgStorage().read(file).document.require('r').attributes.get('fill'), 'blue');
  assert.equal(new FileSvgStorage().read(copy).document.require('r').attributes.get('fill'), 'red');
  run('init');
  assert.deepEqual(cli.execute('save'), ['error: no file path. use save <file.svg>']);
});

test('ids are validated consistently for create and group, including before any structural mutation', () => {
  const editor = new Editor();
  const cli = new CommandDispatcher(editor);
  cli.execute('init');
  cli.execute('create rect r 1 2 3 4');
  const before = new SvgCodec().encode(editor.document);
  for (const line of ['create g "has space"', 'create g ""', 'group "has space" r', 'group "" r']) {
    assert.match(cli.execute(line)[0]!, /^error: invalid SVG id:/);
    assert.equal(new SvgCodec().encode(editor.document), before);
  }
});

test('failed file operations preserve document, source path and redo; writes are atomic and leave no temp files', (context) => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  context.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'valid.svg');
  const invalid = join(dir, 'invalid.svg');
  writeFileSync(file, svg('<rect id="r" x="1"/>'));
  writeFileSync(invalid, '<svg><g></svg>');
  const editor = new Editor(new FileSvgStorage());
  const cli = new CommandDispatcher(editor);
  cli.execute(`read ${file}`);
  cli.execute('move r 1 0');
  cli.execute('undo');
  const before = new SvgCodec().encode(editor.document);
  for (const line of [`read ${join(dir, 'missing.svg')}`, `read ${invalid}`, `save ${join(dir, 'missing', 'out.svg')}`, `save ${dir}`]) {
    assert.match(cli.execute(line)[0]!, /^error:/);
    assert.equal(new SvgCodec().encode(editor.document), before);
  }
  assert.deepEqual(readdirSync(dir).sort(), ['invalid.svg', 'valid.svg']);
  assert.match(cli.execute('redo')[0]!, /^redone:/);
  assert.equal(editor.document.require('r').attributes.get('x'), '2');
  assert.match(cli.execute('save')[0]!, /^saved to/);
  assert.equal(new FileSvgStorage().read(file).document.require('r').attributes.get('x'), '2');
});

test('read-only file errors use the required message and preserve the original file', (context) => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  const file = join(dir, 'readonly.svg');
  writeFileSync(file, 'original');
  chmodSync(file, 0o444);
  context.after(() => { chmodSync(file, 0o644); rmSync(dir, { recursive: true, force: true }); });
  const editor = new Editor(new FileSvgStorage());
  const cli = new CommandDispatcher(editor);
  cli.execute('init');
  assert.deepEqual(cli.execute(`save ${file}`), [`error: cannot write file: ${file}`]);
  assert.equal(readFileSync(file, 'utf8'), 'original');
});

test('failed read emits no partial missing-id warnings and cannot replace the current document', (context) => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  context.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'bad.svg');
  writeFileSync(file, svg('<rect/><box/>'));
  const editor = new Editor(new FileSvgStorage());
  const cli = new CommandDispatcher(editor);
  cli.execute('init');
  cli.execute('create g old');
  assert.deepEqual(cli.execute(`read ${file}`), ['error: unknown shape type: box (is the plugin loaded?)']);
  assert.equal(editor.document.has('old'), true);
  cli.execute('undo');
  assert.equal(editor.document.children.length, 0);
});

test('decoded XML character references must also be valid in text and attributes', () => {
  const codec = new SvgCodec();
  for (const reference of ['&#0;', '&#11;', '&#xFFFF;', '&#xD800;']) {
    for (const source of [
      svg(`<text id="t">${reference}</text>`),
      svg(`<rect id="r" fill="red${reference}"/>`),
      svg(`<g id="g" data-note="${reference}"/>`),
      svg('', `width="400" height="300" data-note="${reference}"`),
    ]) {
      assert.throws(() => codec.decode(source), /invalid SVG:/, source);
    }
  }
});

test('invalid decoded text cannot replace the current document or reset its history', (context) => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  context.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'invalid-reference.svg');
  writeFileSync(file, svg('<rect/><text id="bad">&#0;</text>'));
  const editor = new Editor(new FileSvgStorage());
  const cli = new CommandDispatcher(editor);
  cli.execute('init');
  cli.execute('create rect old 10 20 30 40');
  cli.execute('move old 5 0');
  cli.execute('undo');
  const before = new SvgCodec().encode(editor.document);
  assert.deepEqual(cli.execute(`read ${file}`), ['error: invalid SVG: illegal XML character']);
  assert.equal(new SvgCodec().encode(editor.document), before);
  assert.match(cli.execute('redo')[0]!, /^redone:/);
  assert.equal(editor.document.require('old').attributes.get('x'), '15');
});

test('declaration-like words in comments and CDATA do not reject an otherwise supported SVG', () => {
  const codec = new SvgCodec();
  const literal = '<!DOCTYPE example> and <!ENTITY example "value">';
  for (const [prefix, comment, content, expected] of [
    ['<!-- literal <!DOCTYPE svg> -->', '', 'ordinary', 'ordinary'],
    ['', '<!-- literal <!ENTITY example "value"> -->', 'ordinary', 'ordinary'],
    ['', '', `<![CDATA[${literal}]]>`, literal],
  ]) {
    const source = prefix + svg(`<g id="scene">${comment}<text id="t">${content}</text></g>`);
    const loaded = codec.decode(source);
    assert.deepEqual(loaded.warnings, []);
    assert.equal(loaded.document.allShapes.length, 2);
    assert.equal(loaded.document.require('t').textContent, expected);
    const restored = codec.decode(codec.encode(loaded.document));
    assert.equal(restored.document.require('t').textContent, expected);
  }
});

test('SVG namespace checks reject explicit resets without breaking supported SVG inputs', () => {
  const codec = new SvgCodec();
  for (const source of [
    '<svg xmlns=""><rect id="r"/></svg>',
    svg('<g id="g" xmlns=""><rect id="r"/></g>'),
    svg('<g id="g"><rect id="r" xmlns=""/></g>'),
    svg('<g id="g" xmlns="urn:foreign"><rect id="r"/></g>'),
  ]) assert.throws(() => codec.decode(source), /invalid SVG: unsupported namespace/, source);

  // Both the existing default namespace behavior and namespace prefixes must remain supported.
  for (const source of [
    '<svg><rect id="r" x="1" y="2" width="3" height="4"/></svg>',
    svg('<rect id="r" x="1" y="2" width="3" height="4"/>'),
    '<s:svg xmlns:s="http://www.w3.org/2000/svg"><s:rect id="r" x="1" y="2" width="3" height="4"/></s:svg>',
  ]) {
    const loaded = codec.decode(source);
    assert.deepEqual(loaded.warnings, []);
    const restored = codec.decode(codec.encode(loaded.document));
    assert.equal(restored.document.allShapes.length, 1);
    assert.deepEqual([...restored.document.require('r').attributes], [...loaded.document.require('r').attributes]);
    assert.equal(restored.document.require('r').type, 'rect');
    assert.equal(restored.document.width, loaded.document.width);
    assert.equal(restored.document.height, loaded.document.height);
  }
});

test('a failed namespace read preserves document, default path and redo', (context) => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  context.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'namespace-reset.svg');
  writeFileSync(file, svg('<rect/><g xmlns=""><rect id="foreign"/></g>'));
  const editor = new Editor(new FileSvgStorage());
  const cli = new CommandDispatcher(editor);
  cli.execute('init');
  cli.execute('create rect old 10 20 30 40');
  cli.execute('move old 5 0');
  cli.execute('undo');
  const before = new SvgCodec().encode(editor.document);
  assert.deepEqual(cli.execute(`read ${file}`), ['error: invalid SVG: unsupported namespace']);
  assert.equal(new SvgCodec().encode(editor.document), before);
  assert.deepEqual(cli.execute('save'), ['error: no file path. use save <file.svg>']);
  assert.match(cli.execute('redo')[0]!, /^redone:/);
  assert.equal(editor.document.require('old').attributes.get('x'), '15');
});
