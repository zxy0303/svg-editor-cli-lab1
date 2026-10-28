import { GeometryShape } from './GeometryShape.js';
import { Value } from './Value.js';

export class Text extends GeometryShape {
  constructor(id: string, x: number, y: number, private content: string) {
    super(id, 'text', { x, y });
    Value.xmlText(content);
  }
  protected get horizontal(): readonly string[] { return ['x']; }
  protected get vertical(): readonly string[] { return ['y']; }
  override get textContent(): string { return this.content; }
  protected override setSpecificAttribute(name: string, value: string): void {
    if (name === 'text') {
      Value.xmlText(value);
      this.content = value;
    }
    else super.setSpecificAttribute(name, value);
  }
  clone(): Text {
    return this.copyStylesTo(new Text(this.id, this.numberAt('x'), this.numberAt('y'), this.content));
  }
}
