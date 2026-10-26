import { Value } from '../domain/Value.js';

export interface ArgumentToken { readonly value: string; readonly quoted: boolean; }

export class Arguments {
  constructor(private readonly tokens: readonly ArgumentToken[], private readonly usage: string) {}
  get length(): number { return this.tokens.length; }
  get values(): readonly string[] { return this.tokens.map((token) => token.value); }
  value(index: number): string {
    const token = this.tokens[index];
    if (!token) throw new Error(`usage: ${this.usage}`);
    return token.value;
  }
  number(index: number, name: string): number { return Value.number(this.value(index), name); }
  count(min: number, max = min): void {
    if (this.length < min || this.length > max) throw new Error(`usage: ${this.usage}`);
  }
  withContainer(): readonly [Arguments, string | undefined] {
    const marker = this.tokens[this.length - 2];
    if (marker?.value === 'in' && !marker.quoted) {
      return [new Arguments(this.tokens.slice(0, -2), this.usage), this.value(this.length - 1)];
    }
    return [this, undefined];
  }
}
