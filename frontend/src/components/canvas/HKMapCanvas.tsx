import { useMemo } from 'react';
import { DISTRICT_ZH, HK_NODES } from '../../data/hongKongGraph';
import type { Graph } from '../../domain/types';
import { ACTIVE_DISTRICTS, projectMap } from './geo';
import { GraphScene, type SceneNode } from './GraphScene';
import type { SceneMarks } from './marks';
import styles from './canvas.module.css';

interface Props {
  width: number;
  height: number;
  graph: Graph;
  marks: SceneMarks;
}

export function HKMapCanvas({ width, height, graph, marks }: Props) {
  const { paths, nodes } = useMemo(() => {
    const { projection, paths } = projectMap(width, height, Math.min(48, Math.max(16, width * 0.04)));
    const nodes: SceneNode[] = HK_NODES.map((n) => {
      const [x, y] = projection([n.lon, n.lat]) ?? [0, 0];
      return { id: n.id, x, y, title: n.district, titleZh: n.districtZh, anchor: n.labelAnchor };
    });
    return { paths, nodes };
  }, [width, height]);

  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mapa de Hong Kong com o grafo">
      <g>
        {paths.map((p) => (
          <path key={p.name} d={p.d} className={`${styles.district} ${ACTIVE_DISTRICTS.has(p.name) ? styles.districtActive : ''}`}>
            <title>{`${p.name} ${DISTRICT_ZH[p.name] ?? ''}`}</title>
          </path>
        ))}
      </g>
      <GraphScene nodes={nodes} graph={graph} marks={marks} />
    </svg>
  );
}
