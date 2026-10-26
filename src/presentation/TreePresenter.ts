import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class TreePresenter {
  tree(document: SvgDocument, id?: string): readonly string[] {
    const lines: string[] = [];
    if (id !== undefined) {
      const shape = document.require(id);
      lines.push(this.describe(shape));
      this.append(shape.children, '', lines);
    } else {
      lines.push(`svg (${document.width}x${document.height})`);
      this.append(document.children, '', lines);
    }
    return lines;
  }

  show(document: SvgDocument, id: string): readonly string[] {
    const shape = document.require(id);
    const lines = [`${shape.label}  parent=${document.parentOf(id)?.label ?? 'svg'}`];
    for (const [name, value] of shape.attributes) lines.push(`  ${name}=${value}`);
    if (shape.textContent !== undefined) lines.push(`  text=${JSON.stringify(shape.textContent)}`);
    return lines;
  }

  private describe(shape: Shape): string {
    const attrs = [...shape.attributes].map(([name, value]) => `${name}=${value}`).join(' ');
    const text = shape.textContent === undefined ? '' : ` ${JSON.stringify(shape.textContent)}`;
    return `${shape.label}${attrs ? `  ${attrs}` : ''}${text}`;
  }

  private append(children: readonly Shape[], prefix: string, lines: string[]): void {
    children.forEach((shape, index) => {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${this.describe(shape)}`);
      this.append(shape.children, `${prefix}${last ? '    ' : '│   '}`, lines);
    });
  }
}
