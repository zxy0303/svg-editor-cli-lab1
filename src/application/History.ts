import { EditRecord } from './EditRecord.js';

export class History {
  private readonly past: EditRecord[] = [];
  private readonly future: EditRecord[] = [];
  private blocked = true;

  record(record: EditRecord): void {
    this.past.push(record);
    this.future.length = 0;
    this.blocked = false;
  }

  barrier(): void {
    this.past.length = 0;
    this.future.length = 0;
    this.blocked = true;
  }

  undo(): EditRecord {
    this.checkBarrier();
    const record = this.past.pop();
    if (!record) throw new Error('nothing to undo');
    this.future.push(record);
    return record;
  }

  redo(): EditRecord {
    this.checkBarrier();
    const record = this.future.pop();
    if (!record) throw new Error('nothing to redo');
    this.past.push(record);
    return record;
  }

  private checkBarrier(): void {
    if (this.blocked) throw new Error('undo not allowed after io command');
  }
}
