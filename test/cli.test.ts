import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';

test('real REPL process replays the required flowchart and produces a readable eight-element SVG', (context) => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-cli-'));
  context.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'flow chart.svg');
  const input = readFileSync('examples/flowchart.commands', 'utf8').replace('save examples/flowchart.svg', `save "${file}"`);
  const child = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts'], { input, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, '');
  assert.doesNotMatch(child.stdout, /^error:/m);
  assert.match(child.stdout, /saved to .* \(8 elements\)/);
  const document = new SvgCodec().decode(readFileSync(file, 'utf8')).document;
  assert.equal(document.allShapes.length, 8);
  assert.equal(document.parentOf('process-label')!.id, 'node2');
  assert.equal(document.require('process').attributes.get('y'), '100');
  assert.equal(document.require('process-label').textContent, '处理数据 v2');
});

test('real REPL continues after the two specified errors in the typical session', (context) => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-cli-'));
  context.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'demo.svg');
  const input = readFileSync('examples/session.commands', 'utf8').replace('save examples/demo.svg', `save "${file}"`);
  const child = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts'], { input, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, '');
  assert.deepEqual(child.stdout.split('\n').filter((line) => line.startsWith('error:')), [
    'error: cannot group a container into its own descendant: markers',
    'error: undo not allowed after io command',
  ]);
  assert.match(child.stdout, /warning: assigned id rect1 to unnamed <rect>/);
  assert.match(child.stdout, /read examples\/other.svg \(7 elements\)/);
  const saved = new SvgCodec().decode(readFileSync(file, 'utf8')).document;
  assert.equal(saved.allShapes.length, 5);
  assert.equal(saved.require('c1').attributes.get('cx'), '130');
  assert.equal(saved.require('title').textContent, 'My Diagram');
});
