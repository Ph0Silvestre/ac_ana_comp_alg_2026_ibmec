import type { DijkstraRow } from '../../api/client';
import { HK_GRAPH_PAYLOAD } from '../../data/hongKongGraph';
import { buildAdjacency } from '../adjacency';

// Saídas reais do backend/grafo.py para o grafo da proposta, início em O (spec, seção 9).
export const proposalAdj = buildAdjacency(HK_GRAPH_PAYLOAD);
export const DFS_ORDER = ['O', 'A', 'B', 'C', 'E', 'D', 'T', 'F'];
export const BFS_ORDER = ['O', 'A', 'B', 'C', 'D', 'F', 'E', 'T'];
export const DIJKSTRA_ROWS: DijkstraRow[] = [
  { destino: 'O', distancia_minima: 0, veio_de: null },
  { destino: 'A', distancia_minima: 2, veio_de: 'O' },
  { destino: 'B', distancia_minima: 4, veio_de: 'A' },
  { destino: 'C', distancia_minima: 4, veio_de: 'O' },
  { destino: 'D', distancia_minima: 8, veio_de: 'B' },
  { destino: 'E', distancia_minima: 7, veio_de: 'B' },
  { destino: 'F', distancia_minima: 14, veio_de: 'A' },
  { destino: 'T', distancia_minima: 13, veio_de: 'D' },
];
