/**
 * Grafo de teste da proposta (página 3 do PDF) posicionado sobre os distritos de Hong Kong.
 *
 * - A letra é o identificador oficial do vértice (é o que vai para a API e o que o professor confere).
 * - O distrito é só apresentação (subtítulo + posição no mapa).
 * - lon/lat = ponto interno de cada distrito (calculado com mapshaper -points inner sobre hk-districts.geojson).
 * - labelAnchor diz de que lado do círculo o rótulo fica, para não colidir com arestas.
 *
 * Resultados esperados (rodando o backend atual com início em "O"), úteis como teste:
 *   DFS:      O A B C E D T F
 *   BFS:      O A B C D F E T
 *   Dijkstra: O 0 | A 2 (O) | B 4 (A) | C 4 (O) | E 7 (B) | D 8 (B) | T 13 (D) | F 14 (A)
 *   Kruskal:  B-C 1, A-B 2, O-A 2, B-E 3, F-T 3, B-D 4, D-T 5  => custo 20
 */

export type LabelAnchor = 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface MapNode {
  id: string;            // letra usada na API
  district: string;      // nome em inglês, igual a properties.name do GeoJSON
  districtZh: string;    // nome em chinês tradicional (como nas placas do MTR)
  lon: number;
  lat: number;
  labelAnchor: LabelAnchor;
}

export interface EdgeInput {
  origem: string;
  destino: string;
  peso: number;
}

export const HK_NODES: MapNode[] = [
  { id: 'O', district: 'Tuen Mun',     districtZh: '屯門',   lon: 113.978, lat: 22.396, labelAnchor: 'bottom' },
  { id: 'A', district: 'Yuen Long',    districtZh: '元朗',   lon: 114.054, lat: 22.445, labelAnchor: 'top' },
  { id: 'B', district: 'Tsuen Wan',    districtZh: '荃灣',   lon: 114.105, lat: 22.388, labelAnchor: 'bottom-left' },
  { id: 'C', district: 'Islands',      districtZh: '離島',   lon: 113.951, lat: 22.262, labelAnchor: 'bottom' },
  { id: 'D', district: 'Sha Tin',      districtZh: '沙田',   lon: 114.183, lat: 22.377, labelAnchor: 'top-right' },
  { id: 'E', district: 'Kowloon City', districtZh: '九龍城', lon: 114.186, lat: 22.323, labelAnchor: 'bottom' },
  { id: 'F', district: 'Tai Po',       districtZh: '大埔',   lon: 114.153, lat: 22.449, labelAnchor: 'top' },
  { id: 'T', district: 'Sai Kung',     districtZh: '西貢',   lon: 114.356, lat: 22.382, labelAnchor: 'right' },
];

/** Grafo não direcionado e ponderado da proposta. */
export const HK_EDGES: EdgeInput[] = [
  { origem: 'O', destino: 'A', peso: 2 },
  { origem: 'O', destino: 'B', peso: 5 },
  { origem: 'O', destino: 'C', peso: 4 },
  { origem: 'A', destino: 'B', peso: 2 },
  { origem: 'A', destino: 'D', peso: 7 },
  { origem: 'A', destino: 'F', peso: 12 },
  { origem: 'B', destino: 'C', peso: 1 },
  { origem: 'B', destino: 'D', peso: 4 },
  { origem: 'B', destino: 'E', peso: 3 },
  { origem: 'C', destino: 'E', peso: 4 },
  { origem: 'D', destino: 'E', peso: 4 },
  { origem: 'D', destino: 'T', peso: 5 },
  { origem: 'E', destino: 'T', peso: 7 },
  { origem: 'F', destino: 'T', peso: 3 },
];

/** Payload pronto para POST /api/iniciar-grafo. */
export const HK_GRAPH_PAYLOAD = {
  direcionado: false,
  vertices: HK_NODES.map((n) => n.id),
  arestas: HK_EDGES,
};

/** Nomes em chinês dos 18 distritos, para tooltip ao passar o mouse nos distritos sem vértice. */
export const DISTRICT_ZH: Record<string, string> = {
  'Central and Western': '中西區',
  'Wan Chai': '灣仔',
  'Eastern': '東區',
  'Southern': '南區',
  'Yau Tsim Mong': '油尖旺',
  'Sham Shui Po': '深水埗',
  'Kowloon City': '九龍城',
  'Wong Tai Sin': '黃大仙',
  'Kwun Tong': '觀塘',
  'Kwai Tsing': '葵青',
  'Tsuen Wan': '荃灣',
  'Tuen Mun': '屯門',
  'Yuen Long': '元朗',
  'North': '北區',
  'Tai Po': '大埔',
  'Sha Tin': '沙田',
  'Sai Kung': '西貢',
  'Islands': '離島',
};
