import { createInterface } from 'node:readline';

export class Main {
  run(): void {
    const terminal = Boolean(process.stdin.isTTY);
    const input = createInterface({ input: process.stdin, output: process.stdout, terminal });
    console.log("svg-editor 0.1 — type 'help' for commands");
    input.setPrompt('svg> ');
    if (terminal) input.prompt();
    input.on('line', (line) => {
      if (line.trim() && !line.trimStart().startsWith('#')) {
        console.log('error: editor commands are not implemented yet');
      }
      if (terminal) input.prompt();
    });
  }
}
