# Parser adapters

Language parsers live in `@code-archaeologist/parser`. The graph, DNA, and Ask layers consume normalized symbols. They must not import a language-specific AST library.

The PDF mentions Tree-sitter. This repo uses the TypeScript compiler API for TS/JS, a dedicated Python adapter, and a generic regex adapter for other extensions. Repository code is never executed.

## Contract

```ts
interface LanguageParser {
  parse(file: SourceFile): Promise<ParseResult>;
  normalize(facts: ParseResult): Promise<ParsedSymbol[]>;
  compare(previous: ParseResult, current: ParseResult): Promise<StructuralDiff>;
}
```

`parse` returns symbols, relations, diagnostics, and file metrics. Diagnostics must not abort the rest of the repository. `normalize` drops duplicate qualified names. `compare` reports added, removed, and changed symbols by `qualifiedName` and `astHash`.

Register a parser in `packages/parser/src/registry.ts` via `tryParserFor`. The worker calls `parserFor(language)` during AST index.

## What is extracted

- File language from extension (`detectParserLanguage`)
- Classes, functions, methods, interfaces, constants (TS/JS/Python; generic languages get a shallower set)
- Imports, exports, calls, extends, implements where the adapter can see them
- LOC, nesting, and cyclomatic-style complexity
- Per-file caps: `MAX_PARSE_BYTES` (400_000) and `MAX_SYMBOLS_PER_FILE` (400)

Vendor, generated, binary, and lockfile paths are skipped (`shouldSkipPath` plus optional `.gitignore`).

## Adding a language

1. Implement `LanguageParser` in `packages/parser`.
2. Map extensions in `language.ts`.
3. Return the adapter from `tryParserFor`.
4. Add fixtures in `apps/worker/src/ingestion/typescript-parser.spec.ts` (or a sibling spec).
5. Keep confidence below 1.0 on guessed relations.

Do not change `@code-archaeologist/shared` graph or investigation types for a new language.
