import type { DijkstraRow } from '../api/client';
import { hasEdge, type Adjacency } from './adjacency';

/*
 * Nada aqui roda DFS, BFS ou Dijkstra. As funções só reconstroem a apresentação
 * (árvore, níveis, caminho) a partir da resposta da API + a lista de adjacência.
 */

export type Parents = Map<string, string | null>;

/**
 * Árvore do DFS a partir da ordem de visita. O DFS do backend é recursivo:
 * quem descobre v é o topo da pilha de recursão, e tudo acima dele que tivesse
 * aresta para v já teria visitado v antes.
 */
export function dfsParents(order: string[], adj: Adjacency): Parents {
  const parent: Parents = new Map();
  if (order.length === 0) return parent;
  parent.set(order[0], null);
  const stack = [order[0]];
  for (const v of order.slice(1)) {
    while (stack.length && !hasEdge(adj, stack[stack.length - 1], v)) stack.pop();
    parent.set(v, stack.length ? stack[stack.length - 1] : null);
    stack.push(v);
  }
  return parent;
}

/**
 * Árvore e níveis do BFS. Fila FIFO: v é descoberto pelo primeiro vértice
 * desenfileirado (antes de v na ordem) que tem aresta para ele.
 */
export function bfsTree(order: string[], adj: Adjacency): { parent: Parents; level: Map<string, number> } {
  const parent: Parents = new Map();
  const level = new Map<string, number>();
  order.forEach((v, i) => {
    if (i === 0) {
      parent.set(v, null);
      level.set(v, 0);
      return;
    }
    const p = order.slice(0, i).find((u) => hasEdge(adj, u, v)) ?? null;
    parent.set(v, p);
    level.set(v, p === null ? 0 : level.get(p)! + 1);
  });
  return { parent, level };
}

export function groupByLevel(order: string[], level: Map<string, number>): string[][] {
  const groups: string[][] = [];
  for (const v of order) {
    const l = level.get(v) ?? 0;
    (groups[l] ??= []).push(v);
  }
  return groups;
}

/** Segue veio_de de trás para frente. null quando o destino é inalcançável. */
export function dijkstraPath(rows: DijkstraRow[], start: string, target: string): string[] | null {
  const prev = new Map(rows.map((r) => [r.destino, r]));
  const row = prev.get(target);
  if (!row || row.distancia_minima === 'Inalcançável') return null;
  const path = [target];
  let cur = target;
  while (cur !== start) {
    const p = prev.get(cur)?.veio_de ?? null;
    if (p === null || path.length > rows.length) return null;
    path.push(p);
    cur = p;
  }
  return path.reverse();
}

export interface TreeLine {
  prefix: string;
  vertex: string;
}

/** Árvore em texto com conectores, filhos na ordem de visita. */
export function treeLines(order: string[], parent: Parents): TreeLine[] {
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const v of order) {
    const p = parent.get(v) ?? null;
    if (p === null) roots.push(v);
    else (children.get(p) ?? children.set(p, []).get(p)!).push(v);
  }
  const lines: TreeLine[] = [];
  const walk = (v: string, indent: string, connector: string) => {
    lines.push({ prefix: indent + connector, vertex: v });
    const kids = children.get(v) ?? [];
    const childIndent = connector === '' ? indent : indent + (connector === '└─ ' ? '   ' : '│  ');
    kids.forEach((k, i) => walk(k, childIndent, i === kids.length - 1 ? '└─ ' : '├─ '));
  };
  for (const r of roots) walk(r, '', '');
  return lines;
}

/** Arestas da árvore na ordem em que os filhos foram visitados. */
export function treeEdges(order: string[], parent: Parents): { origem: string; destino: string }[] {
  const edges: { origem: string; destino: string }[] = [];
  for (const v of order) {
    const p = parent.get(v);
    if (p) edges.push({ origem: p, destino: v });
  }
  return edges;
}
