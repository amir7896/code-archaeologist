import { type PrismaClient } from '@code-archaeologist/core';
import { type GitProvider, type GitTreeEntry } from '@code-archaeologist/git';
import {
  detectParserLanguage,
  isParseableLanguage,
  shouldSkipPath,
  tryParserFor,
  MAX_PARSE_BYTES,
  type ParseResult,
  type ParsedSymbol,
} from '@code-archaeologist/parser';

type AstGit = Pick<GitProvider, 'listTree' | 'readBlob'>;

const RELATION_TYPES = {
  imports: 'IMPORTS',
  exports: 'EXPORTS',
  calls: 'CALLS',
  references: 'REFERENCES',
  extends: 'EXTENDS',
  implements: 'IMPLEMENTS',
} as const;

const SYMBOL_KINDS = new Set([
  'MODULE',
  'CLASS',
  'INTERFACE',
  'ENUM',
  'FUNCTION',
  'METHOD',
  'VARIABLE',
  'CONSTANT',
  'TYPE',
  'NAMESPACE',
]);

export async function indexAst(input: {
  prisma: PrismaClient;
  git: AstGit;
  gitDir: string;
  repositoryId: string;
  revision: string;
  onProgress?: (progress: number) => Promise<void>;
}): Promise<void> {
  const { prisma, git, gitDir, repositoryId, revision } = input;
  const tree = (await git.listTree(gitDir, revision)).filter(
    (entry) => !shouldSkipPath(entry.path) && entry.size > 0 && entry.size <= MAX_PARSE_BYTES,
  );
  const parseable = tree.filter((entry) => isParseableLanguage(detectParserLanguage(entry.path)));
  const existing = await prisma.repoFile.findMany({
    where: { repositoryId },
    select: { id: true, path: true, hash: true, lastParsedRevision: true },
  });
  const byPath = new Map(existing.map((file) => [file.path, file]));
  const seen = new Set<string>();

  for (const [index, entry] of parseable.entries()) {
    seen.add(entry.path);
    const current = byPath.get(entry.path);
    if (current?.hash === entry.hash && current.lastParsedRevision === revision) {
      continue;
    }
    const language = detectParserLanguage(entry.path);
    const file = await upsertFile(prisma, {
      repositoryId,
      entry,
      language,
      revision,
      existingId: current?.id,
    });
    byPath.set(entry.path, {
      id: file.id,
      path: entry.path,
      hash: entry.hash,
      lastParsedRevision: revision,
    });
    try {
      const parser = tryParserFor(language);
      if (!parser) {
        continue;
      }
      const content = await git.readBlob(gitDir, revision, entry.path);
      const parsed = await parser.parse({ path: entry.path, language, content });
      const symbols = await parser.normalize(parsed);
      await replaceFileSymbols(prisma, file.id, revision, symbols, parsed);
    } catch {
      await prisma.repoFile.update({
        where: { id: file.id },
        data: { lastParsedRevision: revision },
      });
    }
    if (index % 8 === 0 || index === parseable.length - 1) {
      await input.onProgress?.(72 + Math.floor(((index + 1) / Math.max(parseable.length, 1)) * 24));
    }
  }

  const staleIds = existing
    .filter((file) => isParseableLanguage(detectParserLanguage(file.path)) && !seen.has(file.path))
    .map((file) => file.id);
  if (staleIds.length > 0) {
    await prisma.codeSymbol.deleteMany({ where: { fileId: { in: staleIds } } });
  }

  await prisma.repository.update({
    where: { id: repositoryId },
    data: { lastParsedRevision: revision },
  });
}

async function upsertFile(
  prisma: PrismaClient,
  input: {
    repositoryId: string;
    entry: GitTreeEntry;
    language: string;
    revision: string;
    existingId?: string;
  },
) {
  const data = {
    hash: input.entry.hash,
    size: input.entry.size,
    language: input.language,
    lastRevision: input.revision,
  };
  if (input.existingId) {
    return prisma.repoFile.update({ where: { id: input.existingId }, data });
  }
  return prisma.repoFile.upsert({
    where: { repositoryId_path: { repositoryId: input.repositoryId, path: input.entry.path } },
    create: {
      repositoryId: input.repositoryId,
      path: input.entry.path,
      firstRevision: input.revision,
      ...data,
    },
    update: data,
  });
}

async function replaceFileSymbols(
  prisma: PrismaClient,
  fileId: string,
  revision: string,
  symbols: ParsedSymbol[],
  parsed: ParseResult,
): Promise<void> {
  await prisma.symbolRelation.deleteMany({
    where: { OR: [{ source: { fileId } }, { target: { fileId } }] },
  });
  await prisma.codeSymbol.updateMany({ where: { fileId }, data: { parentSymbolId: null } });
  await prisma.codeSymbol.deleteMany({ where: { fileId } });

  const created = new Map<string, string>();
  for (const symbol of symbols) {
    const row = await prisma.codeSymbol.create({
      data: {
        fileId,
        kind: toKind(symbol.kind),
        name: symbol.name.slice(0, 240),
        qualifiedName: symbol.qualifiedName.slice(0, 1024),
        startLine: symbol.startLine,
        endLine: symbol.endLine,
        astHash: symbol.astHash,
        loc: symbol.metrics.loc,
        complexity: symbol.metrics.complexity,
        nesting: symbol.metrics.nesting,
      },
    });
    created.set(symbol.qualifiedName, row.id);
  }

  for (const symbol of symbols) {
    const id = created.get(symbol.qualifiedName);
    const parentId = symbol.parentQualifiedName ? created.get(symbol.parentQualifiedName) : undefined;
    if (id && parentId && parentId !== id) {
      await prisma.codeSymbol.update({ where: { id }, data: { parentSymbolId: parentId } });
    }
  }

  await prisma.repoFile.update({
    where: { id: fileId },
    data: {
      loc: parsed.metrics.loc,
      complexity: parsed.metrics.complexity,
      lastParsedRevision: revision,
    },
  });

  const rows = parsed.relations.flatMap((relation) => {
    const sourceSymbolId = created.get(relation.sourceQualifiedName);
    if (!sourceSymbolId) {
      return [];
    }
    return [
      {
        sourceSymbolId,
        targetSymbolId: created.get(relation.targetQualifiedName) ?? null,
        targetQualifiedName: relation.targetQualifiedName.slice(0, 1024),
        type: RELATION_TYPES[relation.type],
        confidence: clampConfidence(relation.confidence),
      },
    ];
  });
  if (rows.length > 0) {
    await prisma.symbolRelation.createMany({ data: rows });
  }
}

function toKind(
  kind: string,
):
  | 'MODULE'
  | 'CLASS'
  | 'INTERFACE'
  | 'ENUM'
  | 'FUNCTION'
  | 'METHOD'
  | 'VARIABLE'
  | 'CONSTANT'
  | 'TYPE'
  | 'NAMESPACE' {
  return SYMBOL_KINDS.has(kind)
    ? (kind as
        | 'MODULE'
        | 'CLASS'
        | 'INTERFACE'
        | 'ENUM'
        | 'FUNCTION'
        | 'METHOD'
        | 'VARIABLE'
        | 'CONSTANT'
        | 'TYPE'
        | 'NAMESPACE')
    : 'VARIABLE';
}

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}
