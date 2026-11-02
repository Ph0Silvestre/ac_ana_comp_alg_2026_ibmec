import { useMemo } from 'react';
import { buildAdjacency, toPayload } from '../../domain/adjacency';
import { deriveBfs, deriveDfs, deriveDijkstra, deriveKruskal } from '../../domain/derive';
import { formatWeight } from '../../domain/format';
import { ALGOS, type Algo } from '../../domain/types';
import { useGraphStore } from '../../store/useGraphStore';

export interface OverlayEdge {
  origem: string;
  destino: string;
  thin?: boolean;
  /** Posição na sequência de desenho (0 = primeiro). */
  step: number;
}

export interface Overlay {
  algo: Algo;
  edges: OverlayEdge[];
}

export interface NodeMark {
  algo: Algo;
  step: number;
  isStart: boolean;
}

export interface SceneMarks {
  overlays: Overlay[];
  nodes: Map<string, NodeMark>;
  dimmed: Set<string>;
  legend: { algo: Algo; text: string }[];
}

/** Traduz os resultados da API em linhas e estações acesas no canvas. */
export function useSceneMarks(): SceneMarks {
  const mode = useGraphStore((s) => s.mode);
  const parsed = useGraphStore((s) => s.parsed[mode]);
  const results = useGraphStore((s) => s.results);
  const activeAlgo = useGraphStore((s) => s.activeAlgo);
  const overlayAll = useGraphStore((s) => s.overlayAll);
  const target = useGraphStore((s) => s.target);

  return useMemo(() => {
    const adj = buildAdjacency(toPayload(parsed.graph));
    const overlays: Overlay[] = [];
    const nodes = new Map<string, NodeMark>();
    let dimmed = new Set<string>();
    const legend: SceneMarks['legend'] = [];

    const visible = ALGOS.filter((a) => results[a] && (overlayAll || a === activeAlgo));

    for (const algo of visible) {
      const isActive = algo === activeAlgo;
      if (algo === 'dfs' && results.dfs) {
        const v = deriveDfs(results.dfs, adj, parsed.graph.direcionado);
        const stepOf = new Map(v.order.map((x, i) => [x, i]));
        overlays.push({ algo, edges: v.edges.map((e) => ({ ...e, step: stepOf.get(e.destino)! - 1 })) });
        legend.push({ algo, text: `DFS a partir de ${v.start}` });
        if (isActive) {
          v.order.forEach((x, i) => nodes.set(x, { algo, step: i, isStart: i === 0 }));
          dimmed = new Set(v.unreached);
        }
      }
      if (algo === 'bfs' && results.bfs) {
        const v = deriveBfs(results.bfs, adj);
        overlays.push({ algo, edges: v.edges.map((e) => ({ ...e, step: v.level.get(e.destino)! - 1 })) });
        legend.push({ algo, text: `BFS a partir de ${v.start}, ${v.levels.length} ${v.levels.length === 1 ? 'nível' : 'níveis'}` });
        if (isActive) {
          v.order.forEach((x) => nodes.set(x, { algo, step: v.level.get(x)!, isStart: x === v.start }));
          dimmed = new Set(v.unreached);
        }
      }
      if (algo === 'dijkstra' && results.dijkstra) {
        const v = deriveDijkstra(results.dijkstra);
        const route = v.rows.find((r) => r.destino === target)?.path ?? null;
        const routeKeys = new Set<string>();
        const edges: OverlayEdge[] = [];
        if (route) {
          for (let i = 1; i < route.length; i++) {
            routeKeys.add(`${route[i - 1]}>${route[i]}`);
            edges.push({ origem: route[i - 1], destino: route[i], step: i - 1 });
          }
        }
        for (const e of v.edges) {
          if (!routeKeys.has(`${e.origem}>${e.destino}`)) edges.push({ ...e, thin: true, step: 0 });
        }
        overlays.push({ algo, edges });
        const row = v.rows.find((r) => r.destino === target);
        const dist = row && row.distancia_minima !== 'Inalcançável' ? formatWeight(row.distancia_minima) : 'inalcançável';
        legend.push({ algo, text: `Dijkstra ${v.start} a ${target} ${dist}` });
        if (isActive) {
          (route ?? [v.start]).forEach((x, i) => nodes.set(x, { algo, step: i, isStart: i === 0 }));
          dimmed = new Set(v.rows.filter((r) => r.distancia_minima === 'Inalcançável').map((r) => r.destino));
        }
      }
      if (algo === 'kruskal' && results.kruskal) {
        const v = deriveKruskal(results.kruskal, parsed.graph.vertices.length);
        overlays.push({ algo, edges: v.rows.map((e, i) => ({ origem: e.origem, destino: e.destino, step: i })) });
        legend.push({ algo, text: `Kruskal custo ${formatWeight(v.total)}` });
      }
    }

    return { overlays, nodes, dimmed, legend };
  }, [parsed, results, activeAlgo, overlayAll, target]);
}
