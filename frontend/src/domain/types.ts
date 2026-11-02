export interface Edge {
  origem: string;
  destino: string;
  peso: number;
}

/** Grafo como o front guarda. `ponderado` é só apresentação: sem peso, tudo vai com peso 1. */
export interface Graph {
  direcionado: boolean;
  ponderado: boolean;
  vertices: string[];
  arestas: Edge[];
}

/** Corpo exato de POST /api/iniciar-grafo. */
export interface GraphPayload {
  direcionado: boolean;
  vertices: string[];
  arestas: Edge[];
}

export type Algo = 'dfs' | 'bfs' | 'dijkstra' | 'kruskal';

export const ALGOS: Algo[] = ['dfs', 'bfs', 'dijkstra', 'kruskal'];

export const ALGO_LABEL: Record<Algo, string> = {
  dfs: 'DFS',
  bfs: 'BFS',
  dijkstra: 'Dijkstra',
  kruskal: 'Kruskal',
};

export const ALGO_PURPOSE: Record<Algo, string> = {
  dfs: 'Auditoria de rotas',
  bfs: 'Propagação de alerta',
  dijkstra: 'Rota de emergência',
  kruskal: 'Rede de fibra',
};

export const ALGO_ZH: Record<Algo, string> = {
  dfs: '深度優先搜尋',
  bfs: '廣度優先搜尋',
  dijkstra: '最短路徑',
  kruskal: '最小生成樹',
};

export const ALGO_COLOR_VAR: Record<Algo, string> = {
  dfs: 'var(--line-dfs)',
  bfs: 'var(--line-bfs)',
  dijkstra: 'var(--line-dijkstra)',
  kruskal: 'var(--line-kruskal)',
};

export type Mode = 'map' | 'custom';
