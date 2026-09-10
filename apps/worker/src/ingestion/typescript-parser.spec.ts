import {
  PARSEABLE_LANGUAGES,
  detectParserLanguage,
  genericParserFor,
  pythonParser,
  shouldSkipPath,
  tryParserFor,
  typescriptParser,
} from '@code-archaeologist/parser';

const SAMPLE = `
import { Router } from 'express';

export class AuthService extends BaseService implements Authenticable {
  login(email: string) {
    if (!email) {
      return false;
    }
    return this.store.find(email);
  }
}

export function createRouter() {
  const router = Router();
  router.get('/login', () => AuthService);
  return router;
}

export const VERSION = '1';

export interface Authenticable {
  login(email: string): boolean;
}
`;

describe('TypeScriptParser', () => {
  it('extracts classes, methods, functions, constants, and heritage', async () => {
    const parsed = await typescriptParser.parse({
      path: 'src/auth.ts',
      language: 'typescript',
      content: SAMPLE,
    });
    const names = parsed.symbols.map((symbol) => symbol.name);
    expect(names).toEqual(expect.arrayContaining(['AuthService', 'login', 'createRouter', 'VERSION', 'Authenticable']));
    expect(parsed.relations.some((relation) => relation.type === 'imports' && relation.targetQualifiedName === 'express')).toBe(
      true,
    );
    expect(parsed.relations.some((relation) => relation.type === 'extends' && relation.targetQualifiedName === 'BaseService')).toBe(
      true,
    );
    expect(parsed.relations.some((relation) => relation.type === 'calls' && relation.targetQualifiedName === 'find')).toBe(
      true,
    );
    expect(parsed.metrics.loc).toBeGreaterThan(10);
    const login = parsed.symbols.find((symbol) => symbol.name === 'login' && symbol.kind === 'METHOD');
    expect(login?.metrics.complexity).toBeGreaterThan(1);
  });

  it('stays bounded on oversized and malformed input', async () => {
    const huge = `${'export const x = 1;\n'.repeat(8_000)}export function broken( {`;
    const parsed = await typescriptParser.parse({
      path: 'src/huge.ts',
      language: 'typescript',
      content: huge,
    });
    expect(parsed.symbols.length).toBeLessThanOrEqual(400);
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
  });

  it('collects diagnostics without throwing on malformed source', async () => {
    const parsed = await typescriptParser.parse({
      path: 'src/broken.ts',
      language: 'typescript',
      content: 'export function broken( {',
    });
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
    expect(parsed.symbols.some((symbol) => symbol.name === 'broken.ts')).toBe(true);
  });

  it('normalizes duplicate qualified names and compares structural changes', async () => {
    const previous = await typescriptParser.parse({
      path: 'src/a.ts',
      language: 'typescript',
      content: 'export function oldName() { return 1; }',
    });
    const current = await typescriptParser.parse({
      path: 'src/a.ts',
      language: 'typescript',
      content: 'export function newName() { return 1; }',
    });
    const diff = await typescriptParser.compare(previous, current);
    expect(diff.added.some((symbol) => symbol.name === 'newName')).toBe(true);
    expect(diff.removed.some((symbol) => symbol.name === 'oldName')).toBe(true);
  });

  it('detects parseable languages and skips vendor paths', () => {
    expect(detectParserLanguage('apps/web/src/App.tsx')).toBe('typescript');
    expect(detectParserLanguage('lib/index.mjs')).toBe('javascript');
    expect(detectParserLanguage('alembic/env.py')).toBe('python');
    expect(detectParserLanguage('alembic/versions/create_users_table.py')).toBe('python');
    expect(detectParserLanguage('cmd/server/main.go')).toBe('go');
    expect(detectParserLanguage('src/lib.rs')).toBe('rust');
    expect(detectParserLanguage('src/Main.java')).toBe('java');
    expect(detectParserLanguage('src/App.kt')).toBe('kotlin');
    expect(detectParserLanguage('app/user.rb')).toBe('ruby');
    expect(detectParserLanguage('src/User.php')).toBe('php');
    expect(detectParserLanguage('src/User.cs')).toBe('csharp');
    expect(detectParserLanguage('src/user.cpp')).toBe('cpp');
    expect(detectParserLanguage('src/user.c')).toBe('c');
    expect(detectParserLanguage('src/User.swift')).toBe('swift');
    expect(detectParserLanguage('src/User.scala')).toBe('scala');
    expect(detectParserLanguage('lib/user.dart')).toBe('dart');
    expect(shouldSkipPath('node_modules/lodash/index.js')).toBe(true);
    expect(shouldSkipPath('.venv/lib/site.py')).toBe(true);
    expect(shouldSkipPath('src/auth.ts')).toBe(false);
    expect(shouldSkipPath('alembic/env.py')).toBe(false);
  });

  it('registers a parser for every parseable language', () => {
    for (const language of PARSEABLE_LANGUAGES) {
      expect(tryParserFor(language)).not.toBeNull();
    }
  });
});

describe('PythonParser', () => {
  it('extracts classes, methods, functions, imports, and constants', async () => {
    const parsed = await pythonParser.parse({
      path: 'app/models/user.py',
      language: 'python',
      content: `
from sqlalchemy import Column
import os

VERSION = "1"

class User(Base):
    def __init__(self):
        self.id = None

    async def save(self):
        if not self.id:
            return False
        return self.store.persist()

def create_app():
    return User()
`,
    });
    const names = parsed.symbols.map((symbol) => symbol.name);
    expect(names).toEqual(expect.arrayContaining(['User', '__init__', 'save', 'create_app', 'VERSION']));
    expect(parsed.symbols.find((symbol) => symbol.name === 'save')?.kind).toBe('METHOD');
    expect(parsed.relations.some((relation) => relation.type === 'imports' && relation.targetQualifiedName === 'sqlalchemy')).toBe(
      true,
    );
    expect(parsed.relations.some((relation) => relation.type === 'extends' && relation.targetQualifiedName === 'Base')).toBe(
      true,
    );
  });
});

describe('GenericParser', () => {
  it('extracts Go functions and structs', async () => {
    const parsed = await genericParserFor('go').parse({
      path: 'cmd/server/main.go',
      language: 'go',
      content: `
package main
import "fmt"
type User struct {}
func (u User) Save() {}
func NewUser() User { return User{} }
`,
    });
    expect(parsed.symbols.map((symbol) => symbol.name)).toEqual(
      expect.arrayContaining(['User', 'Save', 'NewUser']),
    );
    expect(parsed.relations.some((relation) => relation.targetQualifiedName === 'fmt')).toBe(true);
  });

  it('extracts symbols from other supported languages', async () => {
    const samples = [
      { language: 'rust', path: 'src/lib.rs', content: 'pub struct User {}\npub fn save() {}', names: ['User', 'save'] },
      { language: 'java', path: 'src/User.java', content: 'public class User {\n  public void save() {}\n}', names: ['User', 'save'] },
      { language: 'ruby', path: 'app/user.rb', content: 'class User\n  def save\n  end\nend', names: ['User', 'save'] },
      { language: 'php', path: 'src/User.php', content: 'class User {\n  public function save() {}\n}', names: ['User', 'save'] },
      { language: 'csharp', path: 'src/User.cs', content: 'public class User {\n  public void Save() {}\n}', names: ['User', 'Save'] },
      { language: 'swift', path: 'src/User.swift', content: 'class User {}\nfunc save() {}', names: ['User', 'save'] },
    ];
    for (const sample of samples) {
      const parsed = await genericParserFor(sample.language).parse({
        path: sample.path,
        language: sample.language,
        content: sample.content,
      });
      expect(parsed.symbols.map((symbol) => symbol.name)).toEqual(expect.arrayContaining(sample.names));
    }
  });
});

