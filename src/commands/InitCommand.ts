import type { Editor } from '../application/Editor.js';
import { Arguments } from './Arguments.js';
import { Command } from './Command.js';

export class InitCommand extends Command {
  constructor(private readonly editor: Editor, private readonly args: Arguments) { super(); }
  execute(): readonly string[] {
    this.args.count(0, 2);
    return [this.editor.init(this.args.length > 0 ? this.args.number(0, 'canvas width') : 800, this.args.length > 1 ? this.args.number(1, 'canvas height') : 600)];
  }
}
