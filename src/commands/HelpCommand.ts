import { Arguments } from './Arguments.js';
import { Command } from './Command.js';

export class HelpCommand extends Command {
  constructor(private readonly args: Arguments, private readonly usages: readonly string[]) { super(); }
  execute(): readonly string[] {
    this.args.count(0);
    return [...this.usages, 'types: rect <id> <x> <y> <w> <h> [fill]; circle <id> <cx> <cy> <r> [fill]', '       ellipse <id> <cx> <cy> <rx> <ry> [fill]; line <id> <x1> <y1> <x2> <y2> [stroke]', '       text <id> <x> <y> "content"; g <id>', 'create supports trailing: in <containerId>'];
  }
}
