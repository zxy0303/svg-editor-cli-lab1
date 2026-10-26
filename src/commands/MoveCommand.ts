import type { Editor } from '../application/Editor.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { Arguments } from './Arguments.js';
import { EditCommand } from './EditCommand.js';

export class MoveCommand extends EditCommand {
  constructor(editor: Editor, private readonly args: Arguments) { super(editor); }
  apply(document: SvgDocument): string {
    this.args.count(3);
    const shape = document.require(this.args.value(0));
    const dx = this.args.number(1, 'dx');
    const dy = this.args.number(2, 'dy');
    shape.move(dx, dy);
    return `${shape.label} moved by (${dx},${dy})`;
  }
}
