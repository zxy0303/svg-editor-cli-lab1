import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';

test('production module imports obey the documented dependency directions', () => {
  const allowed: Readonly<Record<string, readonly string[]>> = {
    domain: ['domain'],
    application: ['application', 'domain'],
    presentation: ['presentation', 'domain'],
    infrastructure: ['infrastructure', 'application', 'domain'],
    commands: ['commands', 'application', 'domain', 'presentation'],
    cli: ['cli', 'commands', 'application', 'domain', 'infrastructure', 'presentation'],
  };
  for (const file of readdirSync('src', { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'))) {
    const module = file.split('/')[0]!;
    if (file === 'cli.ts') continue;
    assert.ok(allowed[module], `undeclared module: ${module}`);
    const source = readFileSync(resolve('src', file), 'utf8');
    for (const imported of source.matchAll(/\bimport\s+(?:type\s+)?[^;]*?\bfrom\s+['"]([^'"]+)['"]/g)) {
      const specifier = imported[1]!;
      if (specifier.startsWith('.')) {
        const target = relative(resolve('src'), resolve('src', dirname(file), specifier)).split('/')[0]!;
        assert.ok(allowed[module]!.includes(target), `${file} must not depend on ${specifier}`);
      } else {
        assert.ok(module === 'cli' || module === 'infrastructure', `${file}: external IO/library dependency ${specifier}`);
      }
    }
  }
});

test('production classes each have their own matching file; no top-level procedural function declarations', () => {
  for (const file of readdirSync('src', { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'))) {
    const source = readFileSync(resolve('src', file), 'utf8');
    const classes = [...source.matchAll(/^export\s+(?:abstract\s+)?class\s+(\w+)/gm)];
    assert.ok(classes.length <= 1, `${file}: more than one class`);
    if (classes.length) assert.equal(classes[0]![1], basename(file, '.ts'));
    assert.doesNotMatch(source, /^(?:export\s+)?(?:async\s+)?function\s/m, `${file}: top-level function`);
  }
});
