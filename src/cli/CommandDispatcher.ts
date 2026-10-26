import type { Editor } from '../application/Editor.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { TreePresenter } from '../presentation/TreePresenter.js';
import { Arguments } from '../commands/Arguments.js';
import type { Command } from '../commands/Command.js';
import { InitCommand } from '../commands/InitCommand.js';
import { CanvasCommand } from '../commands/CanvasCommand.js';
import { ReadCommand } from '../commands/ReadCommand.js';
import { SaveCommand } from '../commands/SaveCommand.js';
import { CreateCommand } from '../commands/CreateCommand.js';
import { DeleteCommand } from '../commands/DeleteCommand.js';
import { MoveCommand } from '../commands/MoveCommand.js';
import { ScaleCommand } from '../commands/ScaleCommand.js';
import { SetCommand } from '../commands/SetCommand.js';
import { GroupCommand } from '../commands/GroupCommand.js';
import { UngroupCommand } from '../commands/UngroupCommand.js';
import { AddToCommand } from '../commands/AddToCommand.js';
import { ReorderCommand } from '../commands/ReorderCommand.js';
import { UndoCommand } from '../commands/UndoCommand.js';
import { RedoCommand } from '../commands/RedoCommand.js';
import { TreeCommand } from '../commands/TreeCommand.js';
import { ShowCommand } from '../commands/ShowCommand.js';
import { HelpCommand } from '../commands/HelpCommand.js';
import { Tokenizer } from './Tokenizer.js';

interface Definition { readonly usage: string; readonly build: (args: Arguments) => Command; }

/** The only command-name dispatch point; candidates for provider registration in the next phase. */
export class CommandDispatcher {
  private readonly tokenizer = new Tokenizer();
  private readonly definitions: ReadonlyMap<string, Definition>;

  constructor(editor: Editor, factory = new ShapeFactory(), presenter = new TreePresenter()) {
    this.definitions = new Map<string, Definition>([
      ['init', { usage: 'init [w] [h]', build: (a) => new InitCommand(editor, a) }],
      ['read', { usage: 'read <file.svg>', build: (a) => new ReadCommand(editor, a) }],
      ['save', { usage: 'save [file.svg]', build: (a) => new SaveCommand(editor, a) }],
      ['canvas', { usage: 'canvas [w] [h]', build: (a) => new CanvasCommand(editor, a) }],
      ['create', { usage: 'create <type> <id> [params...] [in <containerId>]', build: (a) => new CreateCommand(editor, a, factory) }],
      ['delete', { usage: 'delete <id>', build: (a) => new DeleteCommand(editor, a) }],
      ['move', { usage: 'move <id> <dx> <dy>', build: (a) => new MoveCommand(editor, a) }],
      ['scale', { usage: 'scale <id> <factor>', build: (a) => new ScaleCommand(editor, a) }],
      ['set', { usage: 'set <id> <attr> <value>', build: (a) => new SetCommand(editor, a) }],
      ['group', { usage: 'group <newGid> <id1> <id2>...', build: (a) => new GroupCommand(editor, a) }],
      ['ungroup', { usage: 'ungroup <gid>', build: (a) => new UngroupCommand(editor, a) }],
      ['addto', { usage: 'addto <gid> <id>', build: (a) => new AddToCommand(editor, a) }],
      ['front', { usage: 'front <id>', build: (a) => new ReorderCommand(editor, a, true) }],
      ['back', { usage: 'back <id>', build: (a) => new ReorderCommand(editor, a, false) }],
      ['tree', { usage: 'tree [id]', build: (a) => new TreeCommand(editor, a, presenter) }],
      ['show', { usage: 'show <id>', build: (a) => new ShowCommand(editor, a, presenter) }],
      ['help', { usage: 'help', build: (a) => new HelpCommand(a, [...this.definitions.values()].map((d) => d.usage)) }],
      ['undo', { usage: 'undo', build: (a) => new UndoCommand(editor, a) }],
      ['redo', { usage: 'redo', build: (a) => new RedoCommand(editor, a) }],
    ]);
  }

  execute(line: string): readonly string[] {
    try {
      const tokens = this.tokenizer.tokenize(line);
      if (!tokens.length) return [];
      const name = tokens[0]!.value;
      const definition = this.definitions.get(name);
      if (!definition) throw new Error(`unknown command: ${name}`);
      return definition.build(new Arguments(tokens.slice(1), definition.usage)).execute();
    } catch (error) {
      return [`error: ${error instanceof Error ? error.message.replace(/[\r\n]+/g, ' ') : 'command failed'}`];
    }
  }
}
