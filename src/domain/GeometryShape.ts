import { Shape } from './Shape.js';
import { Value } from './Value.js';

export abstract class GeometryShape extends Shape {
  private readonly geometry = new Map<string, number>();

  protected constructor(id: string, tag: string, initial: Record<string, number>) {
    super(id, tag);
    for (const [name, value] of Object.entries(initial)) {
      this.geometry.set(name, this.validate(name, value));
    }
  }

  protected abstract get horizontal(): readonly string[];
  protected abstract get vertical(): readonly string[];

  override get attributes(): ReadonlyMap<string, string> {
    return new Map([...this.geometry].map(([name, value]): [string, string] => [name, String(value)]).concat([...super.attributes]));
  }

  move(dx: number, dy: number): void {
    Value.number(dx, 'dx');
    Value.number(dy, 'dy');
    const next = new Map(this.geometry);
    for (const name of this.horizontal) next.set(name, this.validate(name, this.numberAt(name) + dx));
    for (const name of this.vertical) next.set(name, this.validate(name, this.numberAt(name) + dy));
    this.replace(next);
  }

  scale(factor: number): void {
    Value.positive(factor, 'scale factor');
    const next = new Map<string, number>();
    for (const [name, value] of this.geometry) next.set(name, this.validate(name, value * factor));
    this.replace(next);
  }

  protected numberAt(name: string): number {
    const value = this.geometry.get(name);
    if (value === undefined) throw new Error(`unknown geometry: ${name}`);
    return value;
  }

  protected override setSpecificAttribute(name: string, value: string): void {
    if (!this.geometry.has(name)) return super.setSpecificAttribute(name, value);
    this.geometry.set(name, this.validate(name, value));
  }

  private validate(name: string, value: string | number): number {
    return ['width', 'height', 'r', 'rx', 'ry'].includes(name)
      ? Value.nonnegative(value, name) : Value.number(value, name);
  }

  private replace(next: ReadonlyMap<string, number>): void {
    for (const [name, value] of next) this.geometry.set(name, value);
  }
}
