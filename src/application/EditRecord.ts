import { SvgDocument } from '../domain/SvgDocument.js';

/** Mementos are private; restoring never exposes a stored snapshot to later mutation. */
export class EditRecord {
  constructor(private readonly before: SvgDocument, private readonly after: SvgDocument, private readonly summary: string) {}
  undo(): SvgDocument { return this.before.clone(); }
  redo(): SvgDocument { return this.after.clone(); }
  get undoMessage(): string { return `undone: ${this.summary}`; }
  get redoMessage(): string { return `redone: ${this.summary}`; }
}
