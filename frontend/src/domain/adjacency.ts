import type { Graph, GraphPayload } from './types';

export interface AdjEntry {
  destino: string;
  peso: number;
}

/** Map preserva a ordem de inserção, como o dict do Python. */
export type Adjacency = Map<string, AdjEntry[]>;

export function toPayload(graph: Graph): GraphPayload {
  return {
    direcionado: graph.direcionado,
    vertices: [...graph.vertices],
    arestas: graph.arestas.map((a) => ({ origem: a.origem, destino: a.destino, peso: graph.ponderado ? a.peso : 1 })),
  };
}

/**
 * Mesma regra de Grafo.adicionar_vertice/adicionar_aresta do backend, na mesma
 * ordem, então o resultado é idêntico à lista_adj que está na memória do servidor.
 */
export function buildAdjacency(payload: GraphPayload): Adjacency {
  const adj: Adjacency = new Map();
  const addVertex = (v: string) => {
    if (!adj.has(v)) adj.set(v, []);
  };
  for (const v of payload.vertices) addVertex(v);
  for (const { origem, destino, peso } of payload.arestas) {
    addVertex(origem);
    addVertex(destino);
    adj.get(origem)!.push({ destino, peso });
    if (!payload.direcionado) adj.get(destino)!.push({ destino: origem, peso });
  }
  return adj;
}

export function hasEdge(adj: Adjacency, from: string, to: string): boolean {
  return adj.get(from)?.some((e) => e.destino === to) ?? false;
}

export function countEntries(adj: Adjacency): number {
  let n = 0;
  for (const list of adj.values()) n += list.length;
  return n;
}

/** Matriz V × V equivalente, só para a comparação na defesa. Célula vazia = null. */
export function toMatrix(adj: Adjacency): { vertices: string[]; cells: (number | null)[][] } {
  const vertices = [...adj.keys()];
  const index = new Map(vertices.map((v, i) => [v, i]));
  const cells = vertices.map(() => vertices.map((): number | null => null));
  for (const [from, list] of adj) {
    const i = index.get(from)!;
    for (const e of list) {
      const j = index.get(e.destino)!;
      if (cells[i][j] === null) cells[i][j] = e.peso;
    }
  }
  return { vertices, cells };
}
