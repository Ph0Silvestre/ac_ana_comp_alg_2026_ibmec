import { describe, expect, it } from 'vitest';
import { buildAdjacency } from '../adjacency';
import { bfsTree, dfsParents, dijkstraPath, groupByLevel, treeLines } from '../trees';
import { BFS_ORDER, DFS_ORDER, DIJKSTRA_ROWS, proposalAdj } from './fixtures';

describe('árvore do DFS', () => {
  it('reconstrói a corrente O A B C E D T F', () => {
    const parent = dfsParents(DFS_ORDER, proposalAdj);
    expect(Object.fromEntries(parent)).toEqual({ O: null, A: 'O', B: 'A', C: 'B', E: 'C', D: 'E', T: 'D', F: 'T' });
  });

  it('desempilha quando o topo não tem aresta para o próximo', () => {
    // A-B, A-C: o DFS visita A B C; C é filho de A, não de B
    const adj = buildAdjacency({
      direcionado: false,
      vertices: ['A', 'B', 'C'],
      arestas: [
        { origem: 'A', destino: 'B', peso: 1 },
        { origem: 'A', destino: 'C', peso: 1 },
      ],
    });
    const parent = dfsParents(['A', 'B', 'C'], adj);
    expect(parent.get('C')).toBe('A');
    expect(treeLines(['A', 'B', 'C'], parent).map((l) => l.prefix + l.vertex)).toEqual(['A', '├─ B', '└─ C']);
  });

  it('desenha a árvore indentada como na spec', () => {
    const lines = treeLines(DFS_ORDER, dfsParents(DFS_ORDER, proposalAdj)).map((l) => l.prefix + l.vertex);
    expect(lines[0]).toBe('O');
    expect(lines[1]).toBe('└─ A');
    expect(lines[2]).toBe('   └─ B');
    expect(lines[7]).toBe('                  └─ F');
  });
});

describe('árvore do BFS', () => {
  it('encontra os pais e os níveis da seção 9', () => {
    const { parent, level } = bfsTree(BFS_ORDER, proposalAdj);
    expect(Object.fromEntries(parent)).toEqual({ O: null, A: 'O', B: 'O', C: 'O', D: 'A', F: 'A', E: 'B', T: 'D' });
    expect(groupByLevel(BFS_ORDER, level)).toEqual([['O'], ['A', 'B', 'C'], ['D', 'F', 'E'], ['T']]);
  });
});

describe('caminho do Dijkstra', () => {
  it('segue veio_de de T até O', () => {
    expect(dijkstraPath(DIJKSTRA_ROWS, 'O', 'T')).toEqual(['O', 'A', 'B', 'D', 'T']);
    expect(dijkstraPath(DIJKSTRA_ROWS, 'O', 'O')).toEqual(['O']);
    expect(dijkstraPath(DIJKSTRA_ROWS, 'O', 'F')).toEqual(['O', 'A', 'F']);
  });

  it('devolve null para inalcançável', () => {
    const rows = [...DIJKSTRA_ROWS, { destino: 'X', distancia_minima: 'Inalcançável' as const, veio_de: null }];
    expect(dijkstraPath(rows, 'O', 'X')).toBeNull();
  });
});
