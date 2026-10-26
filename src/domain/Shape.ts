import { Value } from './Value.js';

export abstract class Shape {
  private readonly styles = new Map<string, string>();

  protected constructor(private readonly identifier: string, private readonly tag: string) {
    if (!identifier.trim()) throw new Error('id must not be empty');
  }

  get id(): string { return this.identifier; }
  get type(): string { return this.tag; }
  get label(): string { return `${this.type}#${this.id}`; }
  get children(): readonly Shape[] { return []; }
  get textContent(): string | undefined { return undefined; }
  get attributes(): ReadonlyMap<string, string> { return new Map(this.styles); }

  setAttribute(name: string, value: string): void {
    if (name === 'fill' || name === 'stroke') {
      if (!value.trim()) throw new Error(`${name} must not be empty`);
      this.styles.set(name, value);
    } else if (name === 'stroke-width') {
      this.styles.set(name, String(Value.nonnegative(value, name)));
    } else {
      this.setSpecificAttribute(name, value);
    }
  }

  find(id: string): Shape | undefined { return this.id === id ? this : undefined; }
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract clone(): Shape;

  protected setSpecificAttribute(name: string, _value: string): void {
    throw new Error(`unknown attribute: ${name}`);
  }

  protected copyStylesTo<T extends Shape>(copy: T): T {
    for (const [name, value] of this.styles) copy.setAttribute(name, value);
    return copy;
  }
}
