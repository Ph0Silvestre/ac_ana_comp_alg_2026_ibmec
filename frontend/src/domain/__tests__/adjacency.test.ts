import { describe, expect, it } from 'vitest';
import { buildAdjacency, countEntries, toMatrix } from '../adjacency';
import { formatWeight } from '../format';
import { proposalAdj } from './fixtures';

function render(adj: ReturnType<typeof buildAdjacency>): string[] {
  return [...adj].map(([v, list]) => `${v}: ${list.map((e) => `${e.destino}(${formatWeight(e.peso)})`).join(' ')}`);
}

describe('lista de adjacência', () => {
  it('reproduz a ordem exata do servidor para o grafo da proposta', () => {
    expect(render(proposalAdj)).toEqual([
      'O: A(2) B(5) C(4)',
      'A: O(2) B(2) D(7) F(12)',
      'B: O(5) A(2) C(1) D(4) E(3)',
      'C: O(4) B(1) E(4)',
      'D: A(7) B(4) E(4) T(5)',
      'E: B(3) C(4) D(4) T(7)',
      'F: A(12) T(3)',
      'T: D(5) E(7) F(3)',
    ]);
  });

  it('conta 28 entradas e 36 células vazias na matriz', () => {
    expect(countEntries(proposalAdj)).toBe(28);
    const { cells } = toMatrix(proposalAdj);
    expect(cells.flat().filter((c) => c === null)).toHaveLength(36);
  });

  it('em grafo direcionado só adiciona origem -> destino', () => {
    const adj = buildAdjacency({ direcionado: true, vertices: ['A', 'B', 'X'], arestas: [{ origem: 'A', destino: 'B', peso: 3 }] });
    expect(render(adj)).toEqual(['A: B(3)', 'B: ', 'X: ']);
  });
});
