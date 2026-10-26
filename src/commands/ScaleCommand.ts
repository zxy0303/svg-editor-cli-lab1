import type { Editor } from '../application/Editor.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { Arguments } from './Arguments.js';
import { EditCommand } from './EditCommand.js';

export class ScaleCommand extends EditCommand {
  constructor(editor: Editor, private readonly args: Arguments) { super(editor); }
  apply(document: SvgDocument): string {
    this.args.count(2);
    const shape = document.require(this.args.value(0));
    const factor = this.args.number(1, 'scale factor');
    shape.scale(factor);
    return `${shape.label} scaled by ${factor}`;
  }
}
