import { Group } from './Group.js';
import { Shape } from './Shape.js';
import { Value } from './Value.js';

export class SvgDocument {
  private root = new Group('\u0000svg-root');
  private canvasWidth: number;
  private canvasHeight: number;
  private readonly metadata = new Map<string, string>();

  constructor(width = 800, height = 600) {
    this.canvasWidth = Value.positive(width, 'canvas width');
    this.canvasHeight = Value.positive(height, 'canvas height');
  }

  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get children(): readonly Shape[] { return this.root.children; }
  get rootAttributes(): ReadonlyMap<string, string> {
    return new Map([['viewBox', `0 0 ${this.width} ${this.height}`], ...this.metadata, ['width', String(this.width)], ['height', String(this.height)]]);
  }
  importRootAttribute(name: string, value: string): void { this.metadata.set(name, value); }
  get allShapes(): readonly Shape[] {
    const result: Shape[] = [];
    const visit = (shape: Shape): void => { result.push(shape); shape.children.forEach(visit); };
    this.children.forEach(visit);
    return result;
  }

  resize(width: number, height: number): void {
    const w = Value.positive(width, 'canvas width');
    const h = Value.positive(height, 'canvas height');
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.metadata.delete('viewBox');
  }

  has(id: string): boolean { return this.allShapes.some((shape) => shape.id === id); }
  require(id: string): Shape {
    const found = this.allShapes.find((shape) => shape.id === id);
    if (!found) throw new Error(`no such shape: ${id}`);
    return found;
  }

  container(id: string): Group {
    if (!this.has(id)) throw new Error(`no such container: ${id}`);
    const shape = this.require(id);
    if (!(shape instanceof Group)) throw new Error(`not a container: ${id}`);
    return shape;
  }

  parentOf(id: string): Group | undefined {
    this.require(id);
    const parent = [this.root, ...this.allShapes.filter((shape): shape is Group => shape instanceof Group)]
      .find((group) => group.indexOf(id) >= 0);
    return parent === this.root ? undefined : parent;
  }

  add(shape: Shape, parentId?: string): void {
    const seen = new Set<string>();
    const check = (node: Shape): void => {
      this.assertAvailable(node.id);
      if (seen.has(node.id)) throw new Error(`id already exists: ${node.id}`);
      seen.add(node.id);
      node.children.forEach(check);
    };
    check(shape);
    (parentId === undefined ? this.root : this.container(parentId)).insert(shape);
  }

  delete(id: string): void { this.ownerOf(id).remove(id); }

  group(newId: string, ids: readonly string[]): void {
    this.assertAvailable(newId);
    if (ids.length === 0) throw new Error('group requires at least one shape');
    if (new Set(ids).size !== ids.length) throw new Error('duplicate group member');
    const selected = ids.map((id) => this.require(id));
    for (const outer of selected) {
      for (const inner of selected) {
        if (outer !== inner && outer.find(inner.id)) {
          throw new Error(`cannot group a container into its own descendant: ${outer.id}`);
        }
      }
    }
    // Use original document order, independent of the argument order.
    const ordered = this.allShapes.filter((shape) => ids.includes(shape.id));
    const first = ordered[0]!;
    const owner = this.ownerOf(first.id);
    const index = owner.indexOf(first.id);
    const group = new Group(newId);
    for (const shape of ordered) group.insert(this.ownerOf(shape.id).remove(shape.id));
    owner.insert(group, index);
  }

  ungroup(id: string): void {
    const group = this.container(id);
    const owner = this.ownerOf(id);
    if (owner === this.root) throw new Error(`cannot ungroup top-level container: ${id}`);
    const index = owner.indexOf(id);
    const children = group.children;
    owner.remove(id);
    children.forEach((child, offset) => owner.insert(group.remove(child.id), index + offset));
  }

  addTo(groupId: string, id: string): void {
    const target = this.container(groupId);
    const shape = this.require(id);
    if (shape.find(groupId)) throw new Error(`cannot move a container into its own descendant: ${id}`);
    this.ownerOf(id).remove(id);
    target.insert(shape);
  }

  reorder(id: string, front: boolean): void {
    const owner = this.ownerOf(id);
    const shape = owner.remove(id);
    owner.insert(shape, front ? owner.children.length : 0);
  }

  clone(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height);
    copy.root = this.root.clone();
    for (const [name, value] of this.metadata) copy.metadata.set(name, value);
    return copy;
  }

  private assertAvailable(id: string): void {
    Value.identifier(id);
    if (id === this.root.id || id === this.metadata.get('id') || this.has(id)) throw new Error(`id already exists: ${id}`);
  }

  private ownerOf(id: string): Group { return this.parentOf(id) ?? this.root; }
}
