import type { Editor } from '../application/Editor.js';
import { Arguments } from './Arguments.js';
import { Command } from './Command.js';

export class CanvasCommand extends Command {
  constructor(private readonly editor: Editor, private readonly args: Arguments) { super(); }
  execute(): readonly string[] {
    if (this.args.length === 0) return [this.editor.canvas()];
    this.args.count(2);
    return [this.editor.canvas(this.args.number(0, 'canvas width'), this.args.number(1, 'canvas height'))];
  }
}
