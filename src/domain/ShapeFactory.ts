import { Shape } from './Shape.js';
import { Rect } from './Rect.js';
import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Line } from './Line.js';
import { Text } from './Text.js';
import { Group } from './Group.js';
import { Value } from './Value.js';

interface Definition {
  readonly parameters: readonly string[];
  readonly style?: string;
  readonly build: (id: string, parameters: readonly string[]) => Shape;
}

/** The only shape-name dispatch point; replace with provider registration in the plugin phase. */
export class ShapeFactory {
  private readonly definitions = new Map<string, Definition>([
    ['rect', { parameters: ['x', 'y', 'width', 'height'], style: 'fill', build: (id, p) => new Rect(id, Value.number(p[0]!, 'x'), Value.number(p[1]!, 'y'), Value.number(p[2]!, 'width'), Value.number(p[3]!, 'height')) }],
    ['circle', { parameters: ['cx', 'cy', 'r'], style: 'fill', build: (id, p) => new Circle(id, Value.number(p[0]!, 'cx'), Value.number(p[1]!, 'cy'), Value.number(p[2]!, 'r')) }],
    ['ellipse', { parameters: ['cx', 'cy', 'rx', 'ry'], style: 'fill', build: (id, p) => new Ellipse(id, Value.number(p[0]!, 'cx'), Value.number(p[1]!, 'cy'), Value.number(p[2]!, 'rx'), Value.number(p[3]!, 'ry')) }],
    ['line', { parameters: ['x1', 'y1', 'x2', 'y2'], style: 'stroke', build: (id, p) => new Line(id, Value.number(p[0]!, 'x1'), Value.number(p[1]!, 'y1'), Value.number(p[2]!, 'x2'), Value.number(p[3]!, 'y2')) }],
    ['text', { parameters: ['x', 'y', 'text'], build: (id, p) => new Text(id, Value.number(p[0]!, 'x'), Value.number(p[1]!, 'y'), p[2]!) }],
    ['g', { parameters: [], build: (id) => new Group(id) }],
  ]);

  create(type: string, id: string, parameters: readonly string[]): Shape {
    const definition = this.definition(type);
    Value.identifier(id);
    const min = definition.parameters.length;
    const max = min + (definition.style ? 1 : 0);
    if (parameters.length < min || parameters.length > max) {
      throw new Error(`invalid parameters for ${type}: expected ${definition.parameters.join(' ')}${definition.style ? ` [${definition.style}]` : ''}`);
    }
    const shape = definition.build(id, parameters);
    if (definition.style && parameters.length > min) shape.setAttribute(definition.style, parameters[min]!);
    return shape;
  }

  fromAttributes(type: string, id: string, attributes: ReadonlyMap<string, string>, text: string): Shape {
    const definition = this.definition(type);
    const parameters = definition.parameters.map((name) => name === 'text' ? text : attributes.get(name) ?? '0');
    const shape = definition.build(id, parameters);
    for (const [name, value] of attributes) shape.importAttribute(name, value);
    return shape;
  }

  private definition(type: string): Definition {
    const definition = this.definitions.get(type);
    if (!definition) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return definition;
  }
}
