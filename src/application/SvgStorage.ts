import type { SvgDocument } from '../domain/SvgDocument.js';

export interface SvgStorage {
  read(path: string): { readonly document: SvgDocument; readonly warnings: readonly string[] };
  write(path: string, document: SvgDocument): void;
}
