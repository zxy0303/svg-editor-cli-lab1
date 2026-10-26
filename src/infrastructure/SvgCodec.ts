import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Document, Element, Node } from '@xmldom/xmldom';
import { SvgDocument } from '../domain/SvgDocument.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { Shape } from '../domain/Shape.js';
import { Group } from '../domain/Group.js';
import { Value } from '../domain/Value.js';

export class SvgCodec {
  private static readonly namespace = 'http://www.w3.org/2000/svg';
  constructor(private readonly factory = new ShapeFactory()) {}

  decode(source: string): { readonly document: SvgDocument; readonly warnings: readonly string[] } {
    this.validateXmlText(source);
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('invalid SVG: DTD and entities are not supported');
    let xml: Document;
    try {
      xml = new DOMParser({ onError: () => { throw new Error('malformed XML'); } }).parseFromString(source, 'image/svg+xml');
    } catch {
      throw new Error('invalid SVG: malformed XML');
    }
    const root = xml.documentElement;
    if (!root || root.localName !== 'svg') throw new Error('invalid SVG: expected <svg> root');
    this.validateNamespace(root);
    const document = new SvgDocument(this.dimension(root.getAttribute('width'), 800, 'width'), this.dimension(root.getAttribute('height'), 600, 'height'));
    for (let i = 0; i < root.attributes.length; i++) {
      const attr = root.attributes.item(i)!;
      if (!['width', 'height', 'xmlns'].includes(attr.name)) document.importRootAttribute(attr.name, attr.value);
    }
    // Reserve all explicit ids before generating any id, including ids later in the file.
    const used = new Set<string>();
    const collect = (element: Element): void => {
      const id = element.getAttribute('id');
      if (id) {
        this.validateId(id);
        if (used.has(id)) throw new Error(`id already exists: ${id}`);
        used.add(id);
      }
      this.elementChildren(element).forEach(collect);
    };
    collect(root);
    const warnings: string[] = [];
    const read = (element: Element): Shape => {
      this.validateNamespace(element);
      let id = element.getAttribute('id') ?? '';
      if (!id) {
        let sequence = 1;
        do { id = `${element.localName}${sequence++}`; } while (used.has(id));
        used.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${element.localName}>`);
      }
      const attributes = new Map<string, string>();
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes.item(i)!;
        if (attr.name !== 'id' && attr.name !== 'xmlns') attributes.set(attr.name, attr.value);
      }
      const children = this.elementChildren(element);
      const shape = this.factory.fromAttributes(element.localName ?? element.tagName, id, attributes, element.textContent ?? '');
      if (shape instanceof Group) {
        this.checkContainerText(element);
        for (const child of children) shape.insert(read(child));
      } else if (children.length) {
        throw new Error(`invalid SVG: <${element.localName}> cannot contain child elements`);
      } else if (shape.textContent === undefined) {
        this.checkContainerText(element);
      }
      return shape;
    };
    this.checkContainerText(root);
    for (const child of this.elementChildren(root)) document.add(read(child));
    return { document, warnings };
  }

  encode(document: SvgDocument): string {
    const xml = new DOMImplementation().createDocument(SvgCodec.namespace, 'svg', null);
    const root = xml.documentElement!;
    for (const [name, value] of document.rootAttributes) this.setAttribute(root, name, value);
    for (const child of document.children) root.appendChild(this.writeShape(xml, child));
    // XML normalizes literal CR on input; character references retain CLI-authored CR exactly.
    const body = new XMLSerializer().serializeToString(xml).replace(/\r/g, '&#13;');
    return `<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`;
  }

  private writeShape(xml: Document, shape: Shape): Element {
    this.validateId(shape.id);
    const element = xml.createElementNS(SvgCodec.namespace, shape.type);
    this.setAttribute(element, 'id', shape.id);
    for (const [name, value] of shape.attributes) this.setAttribute(element, name, value);
    if (shape.textContent !== undefined) {
      this.validateXmlText(shape.textContent);
      element.appendChild(xml.createTextNode(shape.textContent));
    }
    for (const child of shape.children) element.appendChild(this.writeShape(xml, child));
    return element;
  }

  private setAttribute(element: Element, name: string, value: string): void {
    this.validateXmlText(value);
    element.setAttribute(name, value);
  }

  private elementChildren(element: Element): readonly Element[] {
    const result: Element[] = [];
    for (let node: Node | null = element.firstChild; node; node = node.nextSibling) {
      if (node.nodeType === 1) result.push(node as Element);
    }
    return result;
  }

  private checkContainerText(element: Element): void {
    for (let node: Node | null = element.firstChild; node; node = node.nextSibling) {
      if ((node.nodeType === 3 || node.nodeType === 4) && node.textContent?.trim()) {
        throw new Error(`invalid SVG: unexpected text in <${element.localName}>`);
      }
    }
  }

  private dimension(value: string | null, fallback: number, name: string): number {
    return value === null ? fallback : Value.positive(value.replace(/px$/, ''), name);
  }

  private validateNamespace(element: Element): void {
    if (element.namespaceURI && element.namespaceURI !== SvgCodec.namespace) throw new Error('invalid SVG: unsupported namespace');
  }

  private validateId(id: string): void {
    this.validateXmlText(id);
    Value.identifier(id);
  }

  private validateXmlText(value: string): void {
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF\uD800-\uDFFF]/u.test(value)) {
      throw new Error('invalid SVG: illegal XML character');
    }
  }
}
