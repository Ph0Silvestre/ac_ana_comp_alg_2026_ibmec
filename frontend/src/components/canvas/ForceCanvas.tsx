import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Graph } from '../../domain/types';
import { useGraphStore, type Point } from '../../store/useGraphStore';
import { GraphScene, type SceneNode } from './GraphScene';
import type { SceneMarks } from './marks';
import styles from './canvas.module.css';

interface Props {
  width: number;
  height: number;
  graph: Graph;
  marks: SceneMarks;
  relayoutToken: number;
}

const CX = 500;
const CY = 350;

interface SimNode extends SimulationNodeDatum {
  id: string;
}

/**
 * Layout automático rodado até estabilizar antes de aparecer (sem "dança").
 * Vértices que já tinham posição ficam parados; só os novos são encaixados.
 */
function computeLayout(graph: Graph, prev: Record<string, Point>, fresh: boolean): Record<string, Point> {
  const n = graph.vertices.length;
  const known = fresh ? {} : prev;
  const nodes: SimNode[] = graph.vertices.map((id, i) => {
    const p = known[id];
    if (p) return { id, x: p.x, y: p.y, fx: p.x, fy: p.y };
    const a = (2 * Math.PI * i) / Math.max(1, n) - Math.PI / 2;
    return { id, x: CX + 220 * Math.cos(a), y: CY + 220 * Math.sin(a) };
  });
  const links = graph.arestas.filter((a) => a.origem !== a.destino).map((a) => ({ source: a.origem, target: a.destino }));
  const sim = forceSimulation(nodes)
    .force(
      'link',
      forceLink<SimNode, { source: string; target: string }>(links)
        .id((d) => d.id)
        .distance(120)
        .strength(0.5),
    )
    .force('charge', forceManyBody().strength(-520))
    .force('x', forceX(CX).strength(0.05))
    .force('y', forceY(CY).strength(0.07))
    .force('collide', forceCollide(46))
    .stop();
  sim.tick(320);
  return Object.fromEntries(nodes.map((d) => [d.id, { x: d.x ?? CX, y: d.y ?? CY }]));
}

export function ForceCanvas({ width, height, graph, marks, relayoutToken }: Props) {
  const positions = useGraphStore((s) => s.positions);
  const setPositions = useGraphStore((s) => s.setPositions);
  const movePosition = useGraphStore((s) => s.movePosition);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<string | null>(null);
  const [fitVersion, setFitVersion] = useState(0);
  const lastRelayout = useRef(relayoutToken);

  const structureKey = JSON.stringify([graph.vertices, graph.arestas.map((a) => [a.origem, a.destino])]);

  useLayoutEffect(() => {
    const fresh = lastRelayout.current !== relayoutToken;
    lastRelayout.current = relayoutToken;
    const current = useGraphStore.getState().positions;
    const missing = graph.vertices.some((v) => !current[v]);
    if (!fresh && !missing) return;
    setPositions(computeLayout(graph, current, fresh || Object.keys(current).length === 0));
    setFitVersion((v) => v + 1);
    // structureKey resume vértices e arestas; graph inteiro mudaria a cada peso digitado.
  }, [structureKey, relayoutToken, setPositions]);

  // Enquadramento calculado só quando o layout muda ou a janela muda, não durante o arrasto.
  const fit = useMemo(() => {
    const pts = graph.vertices.map((v) => positions[v]).filter(Boolean);
    if (!pts.length || !width || !height) return { k: 1, tx: 0, ty: 0 };
    const pad = 70;
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const k = Math.min((width - pad * 2) / bw, (height - pad * 2) / bh, 1.4);
    return { k, tx: width / 2 - ((minX + maxX) / 2) * k, ty: height / 2 - ((minY + maxY) / 2) * k };
  }, [fitVersion, width, height]);

  const nodes: SceneNode[] = graph.vertices
    .filter((v) => positions[v])
    .map((v) => ({ id: v, x: positions[v].x * fit.k + fit.tx, y: positions[v].y * fit.k + fit.ty, anchor: 'bottom' }));

  const toLayout = (e: ReactPointerEvent): Point | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const x = Math.min(width - 20, Math.max(20, pt.x));
    const y = Math.min(height - 20, Math.max(20, pt.y));
    return { x: (x - fit.tx) / fit.k, y: (y - fit.ty) / fit.k };
  };

  return (
    <svg
      ref={svgRef}
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Desenho do grafo personalizado"
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const p = toLayout(e);
        if (p) movePosition(dragging.current, p);
      }}
      onPointerUp={() => (dragging.current = null)}
      onPointerCancel={() => (dragging.current = null)}
    >
      <GraphScene
        nodes={nodes}
        graph={graph}
        marks={marks}
        draggable
        onStationPointerDown={(id, e) => {
          dragging.current = id;
          svgRef.current?.setPointerCapture(e.pointerId);
        }}
      />
    </svg>
  );
}
