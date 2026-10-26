import { SvgDocument } from '../domain/SvgDocument.js';
import type { EditAction } from './EditAction.js';
import { EditRecord } from './EditRecord.js';
import { History } from './History.js';
import type { SvgStorage } from './SvgStorage.js';

export class Editor {
  private current: SvgDocument | undefined;
  private sourcePath: string | undefined;
  private readonly history = new History();

  constructor(private readonly storage?: SvgStorage) {}

  get document(): SvgDocument {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }

  init(width = 800, height = 600): string {
    const document = new SvgDocument(width, height);
    this.current = document;
    this.sourcePath = undefined;
    this.history.barrier();
    return `canvas ${width}x${height} created`;
  }

  canvas(width?: number, height?: number): string {
    const document = this.document;
    if (width === undefined && height === undefined) return `canvas ${document.width}x${document.height}`;
    if (width === undefined || height === undefined) throw new Error('canvas requires both width and height');
    document.resize(width, height);
    this.history.barrier();
    return `canvas resized to ${width}x${height}`;
  }

  edit(action: EditAction): string {
    const before = this.document.clone();
    try {
      const message = action.apply(this.document);
      this.history.record(new EditRecord(before, this.document.clone(), message));
      return message;
    } catch (error) {
      this.current = before;
      throw error;
    }
  }

  undo(): string {
    this.document;
    const record = this.history.undo();
    this.current = record.undo();
    return record.undoMessage;
  }

  redo(): string {
    this.document;
    const record = this.history.redo();
    this.current = record.redo();
    return record.redoMessage;
  }

  read(path: string): readonly string[] {
    if (!this.storage) throw new Error('SVG storage is not configured');
    const loaded = this.storage.read(path);
    this.current = loaded.document;
    this.sourcePath = path;
    this.history.barrier();
    return [...loaded.warnings, `read ${path} (${loaded.document.allShapes.length} elements)`];
  }

  save(path?: string): string {
    const document = this.document;
    const target = path ?? this.sourcePath;
    if (!target) throw new Error('no file path. use save <file.svg>');
    if (!this.storage) throw new Error('SVG storage is not configured');
    this.storage.write(target, document);
    this.history.barrier();
    return `saved to ${target} (${document.allShapes.length} elements)`;
  }
}
