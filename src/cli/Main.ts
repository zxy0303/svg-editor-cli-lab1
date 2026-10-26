import { createInterface } from 'node:readline';
import { Editor } from '../application/Editor.js';
import { FileSvgStorage } from '../infrastructure/FileSvgStorage.js';
import { CommandDispatcher } from './CommandDispatcher.js';

export class Main {
  run(): void {
    const dispatcher = new CommandDispatcher(new Editor(new FileSvgStorage()));
    const terminal = Boolean(process.stdin.isTTY);
    const input = createInterface({ input: process.stdin, output: process.stdout, terminal });
    console.log("svg-editor 0.1 — type 'help' for commands");
    input.setPrompt('svg> ');
    if (terminal) input.prompt();
    input.on('line', (line) => {
      for (const message of dispatcher.execute(line)) console.log(message);
      if (terminal) input.prompt();
    });
  }
}
