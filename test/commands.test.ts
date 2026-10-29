import test from 'node:test';
import assert from 'node:assert/strict';
import { Editor } from '../src/application/Editor.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { TreePresenter } from '../src/presentation/TreePresenter.js';
import { Tokenizer } from '../src/cli/Tokenizer.js';

class Harness {
  readonly editor = new Editor();
  readonly cli = new CommandDispatcher(this.editor);
  run(line: string): readonly string[] {
    const result = this.cli.execute(line);
    assert.equal(result.some((message) => message.startsWith('error:')), false, `${line}: ${result.join('\n')}`);
    return result;
  }
  tree(): string { return new TreePresenter().tree(this.editor.document).join('\n'); }
}

test('tokenizer keeps color hashes, quoted spaces, empty strings and literal in; ignores comment lines', () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize('  # comment'), []);
  assert.deepEqual(tokenizer.tokenize('set t text "A \\"quoted\\" title"').map((t) => t.value), ['set', 't', 'text', 'A "quoted" title']);
  assert.deepEqual(tokenizer.tokenize('create rect r 0 0 1 1 #ffffff').at(-1)?.value, '#ffffff');
  assert.equal(tokenizer.tokenize('set t text ""').at(-1)?.value, '');
  assert.throws(() => tokenizer.tokenize('"unfinished'), /unterminated/);
  assert.throws(() => tokenizer.tokenize('"a"b'), /whitespace/);
});

test('no document guards all stateful operations; help is available at startup', () => {
  const h = new Harness();
  for (const line of ['tree', 'show x', 'undo', 'redo', 'canvas', 'save', 'create g x', 'delete x']) {
    assert.deepEqual(h.cli.execute(line), ["error: no document. use 'init' or 'read' first"]);
  }
  assert.ok(h.run('help').includes('undo'));
  assert.deepEqual(h.cli.execute('missing'), ['error: unknown command: missing']);
});

test('create six types, optional styles, quoted text and nested in clauses', () => {
  const h = new Harness();
  h.run('init');
  h.run('create g scene');
  h.run('create g node in scene');
  h.run('create rect r 1.5 -2 10 20 #ffffff in node');
  h.run('create circle c 5 6 2 red in scene');
  h.run('create ellipse e 1 2 3 4');
  h.run('create line l 1 2 3 4 black');
  h.run('create text t 0 0 "hello world" in node');
  h.run('create text in-label 0 0 "in"');
  h.run('set t text ""');
  assert.equal(h.editor.document.require('t').textContent, '');
  assert.equal(h.editor.document.parentOf('r')!.id, 'node');
  assert.equal(h.editor.document.require('r').attributes.get('fill'), '#ffffff');
  assert.equal(h.editor.document.require('e').attributes.has('fill'), false);
  assert.match(h.run('show r').join('\n'), /parent=g#node/);
  assert.match(h.run('tree scene').join('\n'), /^g#scene\n/);
  assert.match(h.tree(), /x=1.5 y=-2 width=10 height=20/);
});

test('editing group geometry and styles uses the same command path as leaves', () => {
  const h = new Harness();
  h.run('init 400 300');
  h.run('create g scene');
  h.run('create g node in scene');
  h.run('create rect r 10 20 30 40 in node');
  h.run('create text t 10 20 "内容" in node');
  h.run('move node 1 2');
  h.run('scale node 2');
  h.run('set node fill blue');
  h.run('set r stroke-width 1.5');
  assert.equal(h.editor.document.require('r').attributes.get('x'), '22');
  assert.equal(h.editor.document.require('r').attributes.get('width'), '60');
  assert.equal(h.editor.document.require('t').attributes.get('y'), '44');
  assert.equal(h.editor.document.require('node').attributes.get('fill'), 'blue');
});

test('each structural and geometric edit is exactly one reversible history unit', () => {
  const h = new Harness();
  h.run('init');
  h.run('create g scene');
  h.run('create rect a 1 2 3 4 in scene');
  h.run('create circle b 5 6 7 in scene');
  h.run('create text t 8 9 "old" in scene');
  for (const line of ['group pair a b', 'move pair 4 5', 'scale pair 2', 'set t text "new value"', 'front pair', 'back pair', 'addto pair t', 'delete pair']) {
    const before = h.tree();
    h.run(line);
    const after = h.tree();
    h.run('undo');
    assert.equal(h.tree(), before, `undo ${line}`);
    h.run('redo');
    assert.equal(h.tree(), after, `redo ${line}`);
  }
  h.run('undo');
  const before = h.tree();
  h.run('ungroup pair');
  h.run('undo');
  assert.equal(h.tree(), before);
  h.run('redo');
  assert.equal(h.editor.document.has('pair'), false);
});

test('display and failed edits preserve redo; a successful new edit clears it', () => {
  const h = new Harness();
  h.run('init');
  h.run('create rect r 0 0 10 10');
  h.run('move r 1 2');
  h.run('undo');
  h.run('tree');
  h.run('show r');
  h.run('help');
  h.run('canvas');
  assert.deepEqual(h.cli.execute('scale r -1'), ['error: scale factor must be positive']);
  h.run('redo');
  assert.equal(h.editor.document.require('r').attributes.get('x'), '1');
  h.run('undo');
  h.run('set r fill red');
  assert.deepEqual(h.cli.execute('redo'), ['error: nothing to redo']);
});

test('init and canvas resize are history barriers, canvas query and failed resize are not', () => {
  const h = new Harness();
  h.run('init 100');
  assert.equal(h.editor.document.height, 600);
  assert.deepEqual(h.cli.execute('undo'), ['error: undo not allowed after io command']);
  h.run('create g g');
  h.run('canvas');
  assert.deepEqual(h.cli.execute('canvas 20 -1'), ['error: canvas height must be positive']);
  assert.equal(h.editor.document.width, 100);
  h.run('undo');
  h.run('redo');
  h.run('canvas 300 200');
  assert.deepEqual(h.cli.execute('redo'), ['error: undo not allowed after io command']);
  h.run('create g new');
  h.run('undo');
  assert.equal(h.editor.document.has('new'), false);
  assert.deepEqual(h.cli.execute('undo'), ['error: nothing to undo']);
  h.run('init');
  assert.equal(h.editor.document.children.length, 0);
});

test('specified errors do not mutate document or consume an undo unit', () => {
  const h = new Harness();
  h.run('init');
  h.run('create g scene');
  h.run('create rect r 0 0 10 10 in scene');
  const before = h.tree();
  const cases = [
    ['create rect r 0 0 10 10', 'id already exists: r'],
    ['move r9 1 2', 'no such shape: r9'],
    ['create g x in missing', 'no such container: missing'],
    ['create g x in r', 'not a container: r'],
    ['create box x', 'unknown shape type: box (is the plugin loaded?)'],
    ['group bad scene r', 'cannot group a container into its own descendant: scene'],
    ['ungroup scene', 'cannot ungroup top-level container: scene'],
    ['set r foo 1', 'unknown attribute: foo'],
    ['set scene x 1', 'unknown attribute: x'],
  ];
  for (const [line, message] of cases) {
    assert.deepEqual(h.cli.execute(line!), [`error: ${message}`]);
    assert.equal(h.tree(), before);
  }
  h.run('undo');
  assert.equal(h.editor.document.has('r'), false);
});

test('transaction rolls back earlier descendants when a later coordinate overflows', () => {
  const h = new Harness();
  h.run('init');
  h.run('create g g');
  h.run('create rect first 1 2 3 4 in g');
  h.run('create circle last 1e308 0 1 in g');
  const before = h.tree();
  assert.match(h.cli.execute('scale g 2')[0]!, /^error: cx must be a finite number$/);
  assert.equal(h.tree(), before);
  h.run('undo');
  assert.equal(h.editor.document.has('last'), false);
});

test('malformed commands and quote errors produce a single error line and leave state alone', () => {
  const h = new Harness();
  h.run('init');
  const before = h.tree();
  for (const line of ['create', 'create rect r 0 0', 'move', 'canvas 10', 'init 1 2 3', 'set r text "unterminated', 'group pair', 'undo extra', 'read', 'save a b']) {
    const result = h.cli.execute(line);
    assert.equal(result.length, 1);
    assert.match(result[0]!, /^error: [^\r\n]*$/);
    assert.equal(h.tree(), before);
  }
});

test('unserializable text and styles fail without changing document or redo history', () => {
  const h = new Harness();
  h.run('init');
  h.run('create text t 10 20 "original"');
  h.run('move t 5 0');
  h.run('undo');
  const before = h.tree();
  for (const invalid of ['\u0000', '\u000B', '\uD800', '\uFFFF']) {
    for (const line of [
      `create text bad 0 0 "bad${invalid}text"`,
      `create rect bad 0 0 10 10 "red${invalid}"`,
      `set t text "bad${invalid}text"`,
      `set t fill "red${invalid}"`,
      `set t stroke "blue${invalid}"`,
    ]) {
      assert.deepEqual(h.cli.execute(line), ['error: invalid SVG: illegal XML character']);
      assert.equal(h.tree(), before);
    }
  }
  h.run('redo');
  assert.equal(h.editor.document.require('t').attributes.get('x'), '15');
});

test('cross-parent grouping preserves subtrees and undo restores every original sibling slot', () => {
  const h = new Harness();
  for (const line of [
    'init', 'create g scene', 'create g left in scene', 'create g right in scene',
    'create rect a 0 0 10 10 in left', 'create g node in left',
    'create text label 20 30 "nested label" in node', 'create circle c 40 50 6 in left',
    'create rect d 60 70 10 20 in right', 'create ellipse e 80 90 3 4 in right',
    'create line outside 1 2 3 4 black',
  ]) h.run(line);
  const before = h.tree();
  // Reverse argument order to check that original document order is retained.
  h.run('group collected outside e node');
  const doc = h.editor.document;
  assert.deepEqual(doc.require('left').children.map((s) => s.id), ['a', 'collected', 'c']);
  assert.deepEqual(doc.require('right').children.map((s) => s.id), ['d']);
  assert.deepEqual(doc.require('collected').children.map((s) => s.id), ['node', 'e', 'outside']);
  assert.equal(doc.parentOf('label')!.id, 'node');
  assert.equal(doc.require('label').textContent, 'nested label');
  const grouped = h.tree();
  h.run('undo');
  assert.equal(h.tree(), before);
  assert.equal(h.editor.document.has('collected'), false);
  h.run('redo');
  assert.equal(h.tree(), grouped);
  h.run('undo');
  h.run('create g collected');
  assert.deepEqual(h.cli.execute('redo'), ['error: nothing to redo']);
});

test('nested ungroup occupies its old slot and one undo restores the complete container', () => {
  const h = new Harness();
  for (const line of [
    'init', 'create g scene', 'create rect before 0 0 1 1 in scene',
    'create g pair in scene', 'create g nested in pair',
    'create text label 2 3 "kept" in nested', 'create circle dot 4 5 6 in pair',
    'create rect after 7 8 9 10 in scene',
  ]) h.run(line);
  const before = h.tree();
  h.run('ungroup pair');
  assert.deepEqual(h.editor.document.require('scene').children.map((s) => s.id), ['before', 'nested', 'dot', 'after']);
  assert.equal(h.editor.document.parentOf('label')!.id, 'nested');
  assert.equal(h.editor.document.has('pair'), false);
  const ungrouped = h.tree();
  h.run('undo');
  assert.equal(h.tree(), before);
  h.run('redo');
  assert.equal(h.tree(), ungrouped);
});

test('tree and show keep whitespace-bearing attributes inline without changing stored values', () => {
  const h = new Harness();
  h.run('init');
  h.run('create rect r 1 2 10 20 "rgb(255,\\n0,\\t0)"');
  h.run('set r stroke "rgb(0,\\r\\n255,0)"');
  const attributes = new Map(h.editor.document.require('r').attributes);
  const tree = h.run('tree');
  assert.equal(tree.length, 2);
  for (const output of [tree, h.run('tree r'), h.run('show r')]) {
    for (const line of output) assert.doesNotMatch(line, /[\r\n\t]/);
    assert.ok(output.some((line) => line.includes('fill="rgb(255,\\n0,\\t0)"')));
    assert.ok(output.some((line) => line.includes('stroke="rgb(0,\\r\\n255,0)"')));
  }
  assert.match(tree[1]!, /x=1 y=2 width=10 height=20/);
  assert.deepEqual(h.editor.document.require('r').attributes, attributes);
  assert.equal(attributes.get('fill'), 'rgb(255,\n0,\t0)');
  h.run('undo');
  assert.equal(h.editor.document.require('r').attributes.has('stroke'), false);
  h.run('redo');
  assert.deepEqual(h.editor.document.require('r').attributes, attributes);
});
