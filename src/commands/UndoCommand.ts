import type { Editor } from '../application/Editor.js';
import { Arguments } from './Arguments.js';
import { Command } from './Command.js';

export class UndoCommand extends Command {
  constructor(private readonly editor: Editor, private readonly args: Arguments) { super(); }
  execute(): readonly string[] { this.args.count(0); return [this.editor.undo()]; }
}
