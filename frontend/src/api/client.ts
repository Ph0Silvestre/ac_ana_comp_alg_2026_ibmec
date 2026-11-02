import type { Algo, Edge, GraphPayload } from '../domain/types';

// Chamadas sempre relativas: o proxy do Vite repassa /api e /status para a porta 8000.

export interface StatusResponse {
  status: string;
}

export interface LoadGraphResponse {
  mensagem: string;
  total_vertices: number;
  total_arestas: number;
  direcionado: boolean;
}

export interface DfsResponse {
  algoritmo: 'DFS';
  ponto_partida: string;
  caminho_percorrido: string[];
}

export interface BfsResponse {
  algoritmo: 'BFS';
  ponto_partida: string;
  fila_execucao: string[];
}

export interface DijkstraRow {
  destino: string;
  distancia_minima: number | 'Inalcançável';
  veio_de: string | null;
}

export interface DijkstraResponse {
  algoritmo: 'Dijkstra';
  ponto_partida: string;
  resultados: DijkstraRow[];
}

export interface KruskalResponse {
  algoritmo: 'Kruskal';
  custo_total_fibra: number;
  arestas_selecionadas: Edge[];
}

export type AlgoResponse =
  | { algo: 'dfs'; data: DfsResponse }
  | { algo: 'bfs'; data: BfsResponse }
  | { algo: 'dijkstra'; data: DijkstraResponse }
  | { algo: 'kruskal'; data: KruskalResponse };

export class ApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function describeDetail(detail: unknown): string | null {
  if (typeof detail === 'string') return detail;
  // 422 do FastAPI: lista de erros de validação do Pydantic
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : null))
      .filter(Boolean);
    if (msgs.length) return msgs.join('; ');
  }
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError('Não foi possível falar com o servidor. Confira se o backend está rodando.', null);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const detail = body && typeof body === 'object' && 'detail' in body ? describeDetail((body as { detail: unknown }).detail) : null;
    // O proxy do Vite responde 500/502 sem corpo JSON quando o backend está fora do ar.
    const fallback = res.status >= 500 ? 'Servidor indisponível. Confira se o backend está rodando.' : `Erro ${res.status} do servidor.`;
    throw new ApiError(detail ?? fallback, res.status);
  }
  if (body === null) throw new ApiError('Resposta inválida do servidor.', res.status);
  return body as T;
}

const v = (vertex: string) => encodeURIComponent(vertex);

export const api = {
  status: () => request<StatusResponse>('/status'),
  loadGraph: (payload: GraphPayload) =>
    request<LoadGraphResponse>('/api/iniciar-grafo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  dfs: (start: string) => request<DfsResponse>(`/api/dfs/${v(start)}`),
  bfs: (start: string) => request<BfsResponse>(`/api/bfs/${v(start)}`),
  dijkstra: (start: string) => request<DijkstraResponse>(`/api/dijkstra/${v(start)}`),
  kruskal: () => request<KruskalResponse>('/api/kruskal'),
};

/**
 * Sincroniza e roda. O backend guarda o grafo numa variável global, então todo
 * algoritmo é precedido do POST com o grafo atual: o servidor nunca roda um grafo velho.
 */
export async function runAlgorithm(algo: Algo, payload: GraphPayload, start: string): Promise<AlgoResponse> {
  await api.loadGraph(payload);
  switch (algo) {
    case 'dfs':
      return { algo, data: await api.dfs(start) };
    case 'bfs':
      return { algo, data: await api.bfs(start) };
    case 'dijkstra':
      return { algo, data: await api.dijkstra(start) };
    case 'kruskal':
      return { algo, data: await api.kruskal() };
  }
}
