import { GeometryShape } from './GeometryShape.js';

export class Ellipse extends GeometryShape {
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) { super(id, 'ellipse', { cx, cy, rx, ry }); }
  protected get horizontal(): readonly string[] { return ['cx']; }
  protected get vertical(): readonly string[] { return ['cy']; }
  clone(): Ellipse {
    return this.copyStylesTo(new Ellipse(this.id, this.numberAt('cx'), this.numberAt('cy'), this.numberAt('rx'), this.numberAt('ry')));
  }
}
