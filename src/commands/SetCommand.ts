import type { Editor } from '../application/Editor.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { Arguments } from './Arguments.js';
import { EditCommand } from './EditCommand.js';

export class SetCommand extends EditCommand {
  constructor(editor: Editor, private readonly args: Arguments) { super(editor); }
  apply(document: SvgDocument): string {
    this.args.count(3);
    const shape = document.require(this.args.value(0));
    const attribute = this.args.value(1);
    const value = this.args.value(2);
    shape.setAttribute(attribute, value);
    return `${shape.label} updated: ${attribute}=${JSON.stringify(value)}`;
  }
}
