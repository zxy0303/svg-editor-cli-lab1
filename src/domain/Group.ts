import { Shape } from './Shape.js';
import { Value } from './Value.js';

export class Group extends Shape {
  private readonly items: Shape[] = [];
  constructor(id: string) { super(id, 'g'); }
  override get children(): readonly Shape[] { return [...this.items]; }

  insert(shape: Shape, index = this.items.length): void {
    if (shape.find(this.id)) throw new Error(`cannot move a container into its own descendant: ${shape.id}`);
    if (!Number.isInteger(index) || index < 0 || index > this.items.length) throw new Error('invalid child index');
    this.items.splice(index, 0, shape);
  }

  remove(id: string): Shape {
    const index = this.indexOf(id);
    if (index < 0) throw new Error(`no such shape: ${id}`);
    return this.items.splice(index, 1)[0]!;
  }

  indexOf(id: string): number { return this.items.findIndex((shape) => shape.id === id); }
  override find(id: string): Shape | undefined {
    if (this.id === id) return this;
    for (const child of this.items) {
      const found = child.find(id);
      if (found) return found;
    }
    return undefined;
  }

  move(dx: number, dy: number): void {
    Value.number(dx, 'dx');
    Value.number(dy, 'dy');
    if (this.containsTransform(this)) {
      // Translate outside the existing subtree transforms, in this container's parent coordinates.
      const previous = this.attributes.get('transform');
      this.importAttribute('transform', `translate(${dx},${dy})${previous ? ` ${previous}` : ''}`);
      return;
    }
    for (const child of this.items) child.move(dx, dy);
  }

  scale(factor: number): void {
    Value.positive(factor, 'scale factor');
    for (const child of this.items) child.scale(factor);
  }

  clone(): Group {
    const copy = this.copyStylesTo(new Group(this.id));
    for (const child of this.items) copy.insert(child.clone());
    return copy;
  }

  private containsTransform(shape: Shape): boolean {
    return shape.attributes.has('transform') || shape.children.some((child) => this.containsTransform(child));
  }
}
