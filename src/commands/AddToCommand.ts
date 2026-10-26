import type { Editor } from '../application/Editor.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { Arguments } from './Arguments.js';
import { EditCommand } from './EditCommand.js';

export class AddToCommand extends EditCommand {
  constructor(editor: Editor, private readonly args: Arguments) { super(editor); }
  apply(document: SvgDocument): string {
    this.args.count(2);
    const id = this.args.value(1);
    document.addTo(this.args.value(0), id);
    return `${document.require(id).label} added to g#${this.args.value(0)}`;
  }
}
