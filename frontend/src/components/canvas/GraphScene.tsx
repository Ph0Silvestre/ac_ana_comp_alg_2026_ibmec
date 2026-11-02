import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { LabelAnchor } from '../../data/hongKongGraph';
import { formatWeight } from '../../domain/format';
import { ALGO_COLOR_VAR, type Algo, type Graph } from '../../domain/types';
import { useGraphStore } from '../../store/useGraphStore';
import type { SceneMarks } from './marks';
import styles from './canvas.module.css';

export interface SceneNode {
  id: string;
  x: number;
  y: number;
  /** Placa abaixo/ao lado da estação (distrito no mapa, nome longo no grafo personalizado). */
  title?: string;
  titleZh?: string;
  anchor: LabelAnchor;
}

interface Props {
  nodes: SceneNode[];
  graph: Graph;
  marks: SceneMarks;
  onStationPointerDown?: (id: string, e: ReactPointerEvent<SVGGElement>) => void;
  draggable?: boolean;
}

export const STATION_R = 16;
const LANE = 9;
const PAIR_OFFSET = 6;
const LINE_GAP = 18;

type Pos = { x: number; y: number };

/** Segmento o -> d deslocado `off` px na normal canônica (mesma normal para o->d e d->o). */
function segment(a: Pos, b: Pos, aId: string, bId: string, off: number) {
  const [lo, hi] = aId < bId ? [a, b] : [b, a];
  const len = Math.hypot(hi.x - lo.x, hi.y - lo.y) || 1;
  const nx = -(hi.y - lo.y) / len;
  const ny = (hi.x - lo.x) / len;
  const blen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return {
    x1: a.x + nx * off,
    y1: a.y + ny * off,
    x2: b.x + nx * off,
    y2: b.y + ny * off,
    ux: (b.x - a.x) / blen,
    uy: (b.y - a.y) / blen,
    nx,
    ny,
  };
}

function edgeKey(o: string, d: string, directed: boolean) {
  if (directed) return `${o}>${d}`;
  return o < d ? `${o}>${d}` : `${d}>${o}`;
}

function labelLines(anchor: LabelAnchor, n: number, r: number): { x: number; y: number[]; textAnchor: 'start' | 'middle' | 'end' } {
  const stack = (first: number) => Array.from({ length: n }, (_, i) => first + i * LINE_GAP);
  const middle = stack(-((n - 1) * LINE_GAP) / 2 + 5);
  const d = r * 0.75 + 4;
  switch (anchor) {
    case 'top':
      return { x: 0, y: stack(-(r + 10) - (n - 1) * LINE_GAP), textAnchor: 'middle' };
    case 'bottom':
      return { x: 0, y: stack(r + 19), textAnchor: 'middle' };
    case 'left':
      return { x: -(r + 9), y: middle, textAnchor: 'end' };
    case 'right':
      return { x: r + 9, y: middle, textAnchor: 'start' };
    case 'top-left':
      return { x: -d, y: stack(-d - 6 - (n - 1) * LINE_GAP), textAnchor: 'end' };
    case 'top-right':
      return { x: d, y: stack(-d - 6 - (n - 1) * LINE_GAP), textAnchor: 'start' };
    case 'bottom-left':
      return { x: -d, y: stack(d + 15), textAnchor: 'end' };
    case 'bottom-right':
      return { x: d, y: stack(d + 15), textAnchor: 'start' };
  }
}

export function GraphScene({ nodes, graph, marks, onStationPointerDown, draggable }: Props) {
  const speed = useGraphStore((s) => s.speed);
  const replayToken = useGraphStore((s) => s.replayToken);
  const stepMs = speed === 0 ? 0 : 340 / speed;

  const pos = new Map(nodes.map((n) => [n.id, n]));
  const directed = graph.direcionado;
  const edgeSet = new Set(graph.arestas.map((a) => `${a.origem}>${a.destino}`));
  const baseOff = (o: string, d: string) => (directed && o !== d && edgeSet.has(`${d}>${o}`) ? PAIR_OFFSET * (o < d ? 1 : -1) : 0);

  // Linhas paralelas: cada aresta destacada por mais de um algoritmo ganha uma faixa.
  const lanes = new Map<string, Algo[]>();
  for (const ov of marks.overlays) {
    for (const e of ov.edges) {
      const k = edgeKey(e.origem, e.destino, directed);
      const list = lanes.get(k) ?? [];
      if (!list.includes(ov.algo)) list.push(ov.algo);
      lanes.set(k, list);
    }
  }
  const laneOff = (algo: Algo, k: string) => {
    const list = lanes.get(k) ?? [algo];
    return (list.indexOf(algo) - (list.length - 1) / 2) * LANE;
  };

  const drawStyle = (step: number, color: string): CSSProperties =>
    stepMs
      ? { stroke: color, strokeDasharray: 1, animation: `draw-route ${stepMs}ms var(--ease-route) ${step * stepMs}ms both` }
      : { stroke: color };

  const lightStyle = (step: number): CSSProperties | undefined =>
    stepMs ? { animation: `light-up ${stepMs * 0.6}ms ease-out ${step * stepMs}ms both` } : undefined;

  const baseEdges = graph.arestas.filter((a) => pos.has(a.origem) && pos.has(a.destino));

  return (
    <g className={styles.scene}>
      {/* Arestas sem destaque */}
      <g>
        {baseEdges.map((a, i) => {
          const p = pos.get(a.origem)!;
          if (a.origem === a.destino) {
            return <circle key={i} className={styles.edgeIdle} cx={p.x} cy={p.y - STATION_R - 9} r={11} fill="none" />;
          }
          const s = segment(p, pos.get(a.destino)!, a.origem, a.destino, baseOff(a.origem, a.destino));
          return <line key={i} className={styles.edgeIdle} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />;
        })}
      </g>

      {/* Resultados dos algoritmos, desenhados em sequência */}
      <g key={`ov-${replayToken}`}>
        {marks.overlays.map((ov) =>
          ov.edges.map((e) => {
            const a = pos.get(e.origem);
            const b = pos.get(e.destino);
            if (!a || !b || e.origem === e.destino) return null;
            const k = edgeKey(e.origem, e.destino, directed);
            const s = segment(a, b, e.origem, e.destino, baseOff(e.origem, e.destino) + laneOff(ov.algo, k));
            return (
              <path
                key={`${ov.algo}-${e.origem}-${e.destino}`}
                className={e.thin ? styles.edgeThin : styles.edgeHot}
                d={`M${s.x1},${s.y1}L${s.x2},${s.y2}`}
                pathLength={1}
                style={drawStyle(e.step, ALGO_COLOR_VAR[ov.algo])}
              />
            );
          }),
        )}
      </g>

      {/* Setas do grafo direcionado, antes do círculo */}
      {directed && (
        <g>
          {baseEdges.map((a, i) => {
            if (a.origem === a.destino) return null;
            const s = segment(pos.get(a.origem)!, pos.get(a.destino)!, a.origem, a.destino, baseOff(a.origem, a.destino));
            const tipX = s.x2 - s.ux * (STATION_R + 4);
            const tipY = s.y2 - s.uy * (STATION_R + 4);
            const bx = tipX - s.ux * 12;
            const by = tipY - s.uy * 12;
            const px = -s.uy * 6;
            const py = s.ux * 6;
            const lane = lanes.get(edgeKey(a.origem, a.destino, true));
            const color = lane ? ALGO_COLOR_VAR[lane[0]] : 'var(--edge-idle)';
            return <polygon key={i} points={`${tipX},${tipY} ${bx + px},${by + py} ${bx - px},${by - py}`} style={{ fill: color }} />;
          })}
        </g>
      )}

      {/* Pesos */}
      {graph.ponderado && (
        <g>
          {baseEdges.map((a, i) => {
            const p = pos.get(a.origem)!;
            let mx: number;
            let my: number;
            if (a.origem === a.destino) {
              mx = p.x;
              my = p.y - STATION_R - 20;
            } else {
              const s = segment(p, pos.get(a.destino)!, a.origem, a.destino, baseOff(a.origem, a.destino) * 2.4);
              mx = (s.x1 + s.x2) / 2;
              my = (s.y1 + s.y2) / 2;
            }
            const text = formatWeight(a.peso);
            const w = 14 + text.length * 8;
            return (
              <g key={i} transform={`translate(${mx},${my})`}>
                <rect className={styles.weightPill} x={-w / 2} y={-11} width={w} height={22} rx={11} />
                <text className={styles.weightText} y={5}>
                  {text}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Estações */}
      <g key={`st-${replayToken}`}>
        {nodes.map((n) => {
          const mark = marks.nodes.get(n.id);
          const color = mark ? ALGO_COLOR_VAR[mark.algo] : undefined;
          const inside = n.id.length <= 2;
          const lines = [n.title ?? (inside ? undefined : n.id), n.titleZh].filter((x): x is string => Boolean(x));
          const lp = labelLines(n.anchor, lines.length, STATION_R);
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              className={`${styles.station} ${marks.dimmed.has(n.id) ? styles.dimmed : ''} ${draggable ? styles.draggable : ''}`}
              onPointerDown={onStationPointerDown ? (e) => onStationPointerDown(n.id, e) : undefined}
            >
              <title>{n.title ? `${n.id}, ${n.title}${n.titleZh ? ` ${n.titleZh}` : ''}` : n.id}</title>
              {mark?.isStart && <circle r={STATION_R + 6} className={styles.startRing} style={{ stroke: color, ...lightStyle(mark.step) }} />}
              <circle r={inside ? STATION_R : 10} className={styles.stationCircle} />
              {mark && (
                <circle r={inside ? STATION_R : 10} className={styles.stationMark} style={{ stroke: color, ...lightStyle(mark.step) }} />
              )}
              {inside && (
                <text className={styles.stationId} y={6} fontSize={n.id.length === 1 ? 17 : 14}>
                  {n.id}
                </text>
              )}
              {lines.map((t, i) => (
                <text
                  key={i}
                  x={lp.x}
                  y={lp.y[i]}
                  textAnchor={lp.textAnchor}
                  className={i === 0 && (n.title || !inside) ? styles.labelEn : `${styles.labelZh} zh`}
                >
                  {t}
                </text>
              ))}
            </g>
          );
        })}
      </g>
    </g>
  );
}
