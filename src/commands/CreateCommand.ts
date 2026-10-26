import type { Editor } from '../application/Editor.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import type { ShapeFactory } from '../domain/ShapeFactory.js';
import { Arguments } from './Arguments.js';
import { EditCommand } from './EditCommand.js';

export class CreateCommand extends EditCommand {
  constructor(editor: Editor, private readonly args: Arguments, private readonly factory: ShapeFactory) { super(editor); }
  apply(document: SvgDocument): string {
    const [args, parent] = this.args.withContainer();
    args.count(2, Infinity);
    const shape = this.factory.create(args.value(0), args.value(1), args.values.slice(2));
    document.add(shape, parent);
    return `${shape.label} created${parent === undefined ? '' : ` in g#${parent}`}`;
  }
}
