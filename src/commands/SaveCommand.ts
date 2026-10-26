import type { Editor } from '../application/Editor.js';
import { Arguments } from './Arguments.js';
import { Command } from './Command.js';

export class SaveCommand extends Command {
  constructor(private readonly editor: Editor, private readonly args: Arguments) { super(); }
  execute(): readonly string[] {
    this.args.count(0, 1);
    return [this.editor.save(this.args.length === 1 ? this.args.value(0) : undefined)];
  }
}
