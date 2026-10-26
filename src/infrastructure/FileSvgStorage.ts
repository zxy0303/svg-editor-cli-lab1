import { accessSync, constants, existsSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { SvgStorage } from '../application/SvgStorage.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { SvgCodec } from './SvgCodec.js';

export class FileSvgStorage implements SvgStorage {
  constructor(private readonly codec = new SvgCodec()) {}

  read(path: string): ReturnType<SvgStorage['read']> {
    let source: string;
    try { source = readFileSync(path, 'utf8'); }
    catch { throw new Error(`cannot read file: ${path}`); }
    return this.codec.decode(source);
  }

  write(path: string, document: SvgDocument): void {
    const source = this.codec.encode(document);
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    try {
      if (existsSync(path)) {
        if (!statSync(path).isFile()) throw new Error('not a file');
        accessSync(path, constants.W_OK);
      }
      writeFileSync(temporary, source, { encoding: 'utf8', flag: 'wx' });
      renameSync(temporary, path);
    } catch {
      throw new Error(`cannot write file: ${path}`);
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }
}
