import type { SvgDocument } from '../domain/SvgDocument.js';

export interface EditAction {
  apply(document: SvgDocument): string;
}
