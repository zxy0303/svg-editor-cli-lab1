import type { Editor } from '../application/Editor.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { Arguments } from './Arguments.js';
import { EditCommand } from './EditCommand.js';

export class ReorderCommand extends EditCommand {
  constructor(editor: Editor, private readonly args: Arguments, private readonly front: boolean) { super(editor); }
  apply(document: SvgDocument): string {
    this.args.count(1);
    const id = this.args.value(0);
    document.reorder(id, this.front);
    return `${document.require(id).label} moved to ${this.front ? 'front' : 'back'}`;
  }
}
