import type { Editor } from '../application/Editor.js';
import type { EditAction } from '../application/EditAction.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { Command } from './Command.js';

export abstract class EditCommand extends Command implements EditAction {
  constructor(private readonly editor: Editor) { super(); }
  execute(): readonly string[] { return [this.editor.edit(this)]; }
  abstract apply(document: SvgDocument): string;
}
