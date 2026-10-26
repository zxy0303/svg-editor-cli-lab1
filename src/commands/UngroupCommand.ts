import type { Editor } from '../application/Editor.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { Arguments } from './Arguments.js';
import { EditCommand } from './EditCommand.js';

export class UngroupCommand extends EditCommand {
  constructor(editor: Editor, private readonly args: Arguments) { super(editor); }
  apply(document: SvgDocument): string {
    this.args.count(1);
    document.ungroup(this.args.value(0));
    return `g#${this.args.value(0)} ungrouped`;
  }
}
