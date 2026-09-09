import { collectGraphEdges } from './graph-edges';

describe('collectGraphEdges', () => {
  it('records containment, symbol imports, and a file dependency', () => {
    const edges = collectGraphEdges({
      symbols: [
        {
          id: 'mod-a',
          fileId: 'file-a',
          parentSymbolId: null,
          qualifiedName: 'src/a.ts',
        },
        {
          id: 'fn-a',
          fileId: 'file-a',
          parentSymbolId: 'mod-a',
          qualifiedName: 'src/a.ts:run',
        },
        {
          id: 'mod-b',
          fileId: 'file-b',
          parentSymbolId: null,
          qualifiedName: 'src/b.ts',
        },
      ],
      relations: [
        {
          sourceSymbolId: 'fn-a',
          targetSymbolId: 'mod-b',
          targetQualifiedName: 'src/b.ts',
          type: 'IMPORTS',
          confidence: 0.9,
        },
      ],
    });

    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'FILE',
          sourceId: 'file-a',
          targetId: 'mod-a',
          type: 'CONTAINS',
        }),
        expect.objectContaining({
          sourceType: 'SYMBOL',
          sourceId: 'mod-a',
          targetId: 'fn-a',
          type: 'CONTAINS',
        }),
        expect.objectContaining({
          sourceType: 'SYMBOL',
          sourceId: 'fn-a',
          targetId: 'mod-b',
          type: 'IMPORTS',
          confidence: 0.9,
        }),
        expect.objectContaining({
          sourceType: 'FILE',
          sourceId: 'file-a',
          targetType: 'FILE',
          targetId: 'file-b',
          type: 'DEPENDS_ON',
        }),
      ]),
    );
  });

  it('keeps unresolved imports as symbol edges only', () => {
    const edges = collectGraphEdges({
      symbols: [{ id: 'mod-a', fileId: 'file-a', parentSymbolId: null, qualifiedName: 'a.py' }],
      relations: [
        {
          sourceSymbolId: 'mod-a',
          targetSymbolId: null,
          targetQualifiedName: 'sqlalchemy',
          type: 'IMPORTS',
          confidence: 0.4,
        },
      ],
    });

    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'IMPORTS',
          targetId: null,
          targetKey: 'sqlalchemy',
        }),
      ]),
    );
    expect(edges.some((edge) => edge.type === 'DEPENDS_ON')).toBe(false);
  });
});
