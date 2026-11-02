import { useMemo } from 'react';
import { buildAdjacency, toPayload } from '../../domain/adjacency';
import { ALGO_COLOR_VAR, ALGO_LABEL, ALGO_PURPOSE, ALGO_ZH, ALGOS, type Algo } from '../../domain/types';
import { Zh } from '../ui/Zh';
import { blockReason, useGraphStore } from '../../store/useGraphStore';
import { BfsResult } from './BfsResult';
import { DfsResult } from './DfsResult';
import { DijkstraResult } from './DijkstraResult';
import { KruskalResult } from './KruskalResult';
import styles from './results.module.css';

export function ResultsPanel() {
  const parsed = useGraphStore((s) => s.parsed[s.mode]);
  const results = useGraphStore((s) => s.results);
  const activeAlgo = useGraphStore((s) => s.activeAlgo);
  const setActiveAlgo = useGraphStore((s) => s.setActiveAlgo);
  const start = useGraphStore((s) => s.start);
  const running = useGraphStore((s) => s.running);
  const run = useGraphStore((s) => s.run);

  const tab: Algo = activeAlgo ?? 'dfs';
  const adj = useMemo(() => buildAdjacency(toPayload(parsed.graph)), [parsed.graph]);

  const content = () => {
    if (tab === 'dfs' && results.dfs) return <DfsResult data={results.dfs} adj={adj} direcionado={parsed.graph.direcionado} />;
    if (tab === 'bfs' && results.bfs) return <BfsResult data={results.bfs} adj={adj} />;
    if (tab === 'dijkstra' && results.dijkstra) return <DijkstraResult data={results.dijkstra} />;
    if (tab === 'kruskal' && results.kruskal) return <KruskalResult data={results.kruskal} vertexCount={parsed.graph.vertices.length} />;
    const reason = blockReason(tab, parsed, start);
    return (
      <div className={styles.placeholder}>
        <p>
          {running === tab
            ? `Sincronizando o grafo e executando o ${ALGO_LABEL[tab]}...`
            : `Execute o ${ALGO_LABEL[tab]} para ver o resultado.`}
        </p>
        <button type="button" className={styles.runButton} onClick={() => run(tab)} disabled={Boolean(reason) || running !== null}>
          Executar {ALGO_LABEL[tab]}
        </button>
        {reason && <p className={styles.help}>{reason}</p>}
      </div>
    );
  };

  return (
    <section className={styles.panel} aria-labelledby="results-title" style={{ ['--line' as string]: ALGO_COLOR_VAR[tab] }}>
      <header className={styles.header}>
        <h2 id="results-title">
          Resultado<Zh className="zh-tag">結果</Zh>
        </h2>
        <div className={styles.tabs} role="tablist" aria-label="Algoritmos">
          {ALGOS.map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={tab === a}
              className={styles.tab}
              style={{ ['--line' as string]: ALGO_COLOR_VAR[a] }}
              onClick={() => setActiveAlgo(a)}
            >
              {ALGO_LABEL[a]}
              {results[a] && <span className={styles.tabDot} aria-label="com resultado" />}
            </button>
          ))}
        </div>
        <p className={styles.purpose}>
          {ALGO_PURPOSE[tab]}
          <Zh className="zh-tag">{ALGO_ZH[tab]}</Zh>
        </p>
      </header>
      <div className={styles.scroll} role="tabpanel" aria-label={ALGO_LABEL[tab]}>
        {content()}
      </div>
    </section>
  );
}
