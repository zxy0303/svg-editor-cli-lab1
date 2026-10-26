import type { Editor } from '../application/Editor.js';
import type { TreePresenter } from '../presentation/TreePresenter.js';
import { Arguments } from './Arguments.js';
import { Command } from './Command.js';

export class ShowCommand extends Command {
  constructor(private readonly editor: Editor, private readonly args: Arguments, private readonly presenter: TreePresenter) { super(); }
  execute(): readonly string[] { this.args.count(1); return this.presenter.show(this.editor.document, this.args.value(0)); }
}
