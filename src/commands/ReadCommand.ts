import type { Editor } from '../application/Editor.js';
import { Arguments } from './Arguments.js';
import { Command } from './Command.js';

export class ReadCommand extends Command {
  constructor(private readonly editor: Editor, private readonly args: Arguments) { super(); }
  execute(): readonly string[] { this.args.count(1); return this.editor.read(this.args.value(0)); }
}
