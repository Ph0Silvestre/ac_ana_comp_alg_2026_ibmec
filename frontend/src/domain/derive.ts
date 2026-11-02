import type { BfsResponse, DfsResponse, DijkstraResponse, DijkstraRow, KruskalResponse } from '../api/client';
import type { Adjacency } from './adjacency';
import { bfsTree, dfsParents, dijkstraPath, groupByLevel, treeEdges, treeLines, type Parents, type TreeLine } from './trees';

/* Apresentação dos resultados da API. Nenhum algoritmo é recalculado aqui. */

export interface DfsView {
  start: string;
  order: string[];
  parent: Parents;
  lines: TreeLine[];
  edges: { origem: string; destino: string }[];
  unreached: string[];
  deadEnds: string[];
  lineEnds: string[];
}

export function deriveDfs(res: DfsResponse, adj: Adjacency, direcionado: boolean): DfsView {
  const order = res.caminho_percorrido;
  const parent = dfsParents(order, adj);
  const visited = new Set(order);
  const all = [...adj.keys()];
  const deadEnds = all.filter((v) => (adj.get(v)?.length ?? 0) === 0);
  // Em não direcionado, grau 1 é "ponta de linha": só dá para voltar por onde veio.
  const lineEnds = direcionado ? [] : all.filter((v) => adj.get(v)?.length === 1);
  return {
    start: res.ponto_partida,
    order,
    parent,
    lines: treeLines(order, parent),
    edges: treeEdges(order, parent),
    unreached: all.filter((v) => !visited.has(v)),
    deadEnds,
    lineEnds,
  };
}

export interface BfsView {
  start: string;
  order: string[];
  parent: Parents;
  level: Map<string, number>;
  levels: string[][];
  edges: { origem: string; destino: string }[];
  unreached: string[];
}

export function deriveBfs(res: BfsResponse, adj: Adjacency): BfsView {
  const order = res.fila_execucao;
  const { parent, level } = bfsTree(order, adj);
  const visited = new Set(order);
  return {
    start: res.ponto_partida,
    order,
    parent,
    level,
    levels: groupByLevel(order, level),
    edges: treeEdges(order, parent),
    unreached: [...adj.keys()].filter((v) => !visited.has(v)),
  };
}

export interface DijkstraEntry extends DijkstraRow {
  path: string[] | null;
}

export interface DijkstraView {
  start: string;
  rows: DijkstraEntry[];
  /** Árvore de caminhos mínimos (veio_de -> destino). */
  edges: { origem: string; destino: string }[];
}

export function deriveDijkstra(res: DijkstraResponse): DijkstraView {
  const start = res.ponto_partida;
  const rows = res.resultados.map((r) => ({ ...r, path: dijkstraPath(res.resultados, start, r.destino) }));
  // Ordenada por distância (empate pela ordem da API); inalcançáveis no fim.
  const sorted = rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const da = a.r.distancia_minima;
      const db = b.r.distancia_minima;
      if (da === 'Inalcançável' && db === 'Inalcançável') return a.i - b.i;
      if (da === 'Inalcançável') return 1;
      if (db === 'Inalcançável') return -1;
      return da - db || a.i - b.i;
    })
    .map((x) => x.r);
  const edges = res.resultados.filter((r) => r.veio_de !== null).map((r) => ({ origem: r.veio_de!, destino: r.destino }));
  return { start, rows: sorted, edges };
}

export interface KruskalView {
  rows: { origem: string; destino: string; peso: number; acumulado: number }[];
  total: number;
  isForest: boolean;
}

export function deriveKruskal(res: KruskalResponse, vertexCount: number): KruskalView {
  let acc = 0;
  const rows = res.arestas_selecionadas.map((a) => {
    acc += a.peso;
    return { ...a, acumulado: acc };
  });
  return { rows, total: res.custo_total_fibra, isForest: rows.length < vertexCount - 1 };
}
