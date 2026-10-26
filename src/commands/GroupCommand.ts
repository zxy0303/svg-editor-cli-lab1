import type { Editor } from '../application/Editor.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { Arguments } from './Arguments.js';
import { EditCommand } from './EditCommand.js';

export class GroupCommand extends EditCommand {
  constructor(editor: Editor, private readonly args: Arguments) { super(editor); }
  apply(document: SvgDocument): string {
    this.args.count(2, Infinity);
    document.group(this.args.value(0), this.args.values.slice(1));
    return `g#${this.args.value(0)} created with ${this.args.length - 1} children`;
  }
}
