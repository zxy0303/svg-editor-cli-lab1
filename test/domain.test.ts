import test from 'node:test';
import assert from 'node:assert/strict';
import { Rect } from '../src/domain/Rect.js';
import { Circle } from '../src/domain/Circle.js';
import { Ellipse } from '../src/domain/Ellipse.js';
import { Line } from '../src/domain/Line.js';
import { Text } from '../src/domain/Text.js';
import { Group } from '../src/domain/Group.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

test('all five leaves move and scale every coordinate and dimension', () => {
  const cases = [
    [new Rect('r', 1, 2, 3, 4), { x: '6', y: '10', width: '6', height: '8' }],
    [new Circle('c', 1, 2, 3), { cx: '6', cy: '10', r: '6' }],
    [new Ellipse('e', 1, 2, 3, 4), { cx: '6', cy: '10', rx: '6', ry: '8' }],
    [new Line('l', 1, 2, 3, 4), { x1: '6', y1: '10', x2: '10', y2: '14' }],
    [new Text('t', 1, 2, '你好 world'), { x: '6', y: '10' }],
  ] as const;
  for (const [shape, expected] of cases) {
    shape.move(2, 3);
    shape.scale(2);
    assert.deepEqual(Object.fromEntries(shape.attributes), expected);
  }
});

test('composite recursively moves/scales; clone has independent geometry, styles and children', () => {
  const group = new Group('outer');
  const inner = new Group('inner');
  inner.insert(new Rect('r', 1, 2, 3, 4));
  group.insert(inner);
  group.setAttribute('fill', 'red');
  const copy = group.clone();
  group.move(10, 20);
  group.scale(0.5);
  assert.equal(group.find('r')!.attributes.get('x'), '5.5');
  assert.equal(copy.find('r')!.attributes.get('x'), '1');
  assert.equal(copy.attributes.get('fill'), 'red');
  assert.throws(() => inner.insert(group), /own descendant/);
});

test('document ids are globally unique and case sensitive; deleting a group removes descendants', () => {
  const doc = new SvgDocument();
  doc.add(new Group('g'));
  doc.add(new Rect('r', 0, 0, 10, 10), 'g');
  doc.add(new Group('R'));
  assert.throws(() => doc.add(new Group('r')), /id already exists: r/);
  assert.throws(() => doc.add(new Group('new'), 'r'), /not a container: r/);
  assert.throws(() => doc.add(new Group('new'), 'missing'), /no such container/);
  doc.delete('g');
  assert.equal(doc.has('r'), false);
  assert.equal(doc.has('R'), true);
});

test('group keeps document order; nested ungroup restores the slot; root ungroup is rejected', () => {
  const doc = new SvgDocument();
  doc.add(new Group('scene'));
  for (const id of ['a', 'b', 'c']) doc.add(new Circle(id, 1, 1, 1), 'scene');
  doc.group('pair', ['c', 'a']);
  assert.deepEqual(doc.require('scene').children.map((s) => s.id), ['pair', 'b']);
  assert.deepEqual(doc.require('pair').children.map((s) => s.id), ['a', 'c']);
  doc.ungroup('pair');
  assert.deepEqual(doc.require('scene').children.map((s) => s.id), ['a', 'c', 'b']);
  assert.throws(() => doc.ungroup('scene'), /cannot ungroup top-level container: scene/);
});

test('structural edits reject cycles and mixed ancestor selections before mutation', () => {
  const doc = new SvgDocument();
  doc.add(new Group('g'));
  doc.add(new Group('child'), 'g');
  assert.throws(() => doc.group('bad', ['g', 'child']), /own descendant: g/);
  assert.throws(() => doc.addTo('child', 'g'), /own descendant: g/);
  assert.throws(() => doc.addTo('g', 'g'), /own descendant: g/);
  assert.equal(doc.parentOf('child')!.id, 'g');
  assert.equal(doc.has('bad'), false);
});

test('front is last in SVG paint order, back is first; addto appends', () => {
  const doc = new SvgDocument();
  for (const id of ['a', 'b', 'c']) doc.add(new Group(id));
  doc.reorder('a', true);
  assert.deepEqual(doc.children.map((s) => s.id), ['b', 'c', 'a']);
  doc.reorder('a', false);
  assert.deepEqual(doc.children.map((s) => s.id), ['a', 'b', 'c']);
  doc.addTo('c', 'a');
  assert.equal(doc.parentOf('a')!.id, 'c');
});

test('invalid numeric values and unknown attributes are rejected without changing the leaf', () => {
  const rect = new Rect('r', 1, 2, 3, 4);
  assert.throws(() => rect.setAttribute('r', '3'), /unknown attribute: r/);
  assert.throws(() => rect.setAttribute('width', '-1'), /nonnegative/);
  assert.throws(() => rect.scale(0), /scale factor must be positive/);
  assert.throws(() => rect.move(Infinity, 0), /finite/);
  assert.throws(() => new SvgDocument(0, 10), /positive/);
  assert.equal(rect.attributes.get('width'), '3');
  assert.equal(rect.attributes.has('fill'), false);
});
