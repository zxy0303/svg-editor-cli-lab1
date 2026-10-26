export interface Token {
  readonly value: string;
  readonly quoted: boolean;
}

export class Tokenizer {
  tokenize(line: string): readonly Token[] {
    if (line.trimStart().startsWith('#')) return [];
    const tokens: Token[] = [];
    let index = 0;
    while (index < line.length) {
      if (/\s/.test(line[index]!)) { index++; continue; }
      const quoted = line[index] === '"';
      let value = '';
      if (quoted) {
        index++;
        let closed = false;
        while (index < line.length) {
          const character = line[index++]!;
          if (character === '"') { closed = true; break; }
          if (character === '\\') {
            const next = line[index++];
            if (next === undefined) throw new Error('unterminated quoted argument');
            const escapes: Record<string, string> = { n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\' };
            value += escapes[next] ?? `\\${next}`;
          } else value += character;
        }
        if (!closed) throw new Error('unterminated quoted argument');
        if (index < line.length && !/\s/.test(line[index]!)) throw new Error('expected whitespace after quoted argument');
      } else {
        while (index < line.length && !/\s/.test(line[index]!)) {
          if (line[index] === '"') throw new Error('quote must start an argument');
          value += line[index++];
        }
      }
      tokens.push({ value, quoted });
    }
    return tokens;
  }
}
