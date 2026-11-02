import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { buildAdjacency, countEntries, toPayload } from '../../domain/adjacency';
import { formatWeight } from '../../domain/format';
import { useGraphStore } from '../../store/useGraphStore';
import { KeyHint } from '../ui/KeyHint';
import { Zh } from '../ui/Zh';
import { MatrixCompare } from './MatrixCompare';
import styles from './memory.module.css';

export function AdjacencyDrawer() {
  const open = useGraphStore((s) => s.drawerOpen);
  const setOpen = useGraphStore((s) => s.setDrawerOpen);
  const showMatrix = useGraphStore((s) => s.showMatrix);
  const setShowMatrix = useGraphStore((s) => s.setShowMatrix);
  const graph = useGraphStore((s) => s.parsed[s.mode].graph);

  // Mesma regra do adicionar_aresta do backend, então é a lista que está na memória do servidor.
  const adj = useMemo(() => buildAdjacency(toPayload(graph)), [graph]);
  const entries = countEntries(adj);

  return (
    <div className={styles.dock}>
      <button type="button" className={styles.handle} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="memory-drawer">
        <span className={styles.handleBar} aria-hidden="true" />
        {open ? 'Fechar estrutura em memória' : 'Estrutura em memória'}
        <KeyHint k="E" />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.section
            id="memory-drawer"
            className={styles.drawer}
            aria-label="Estrutura em memória"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className={styles.inner}>
              <header className={styles.header}>
                <div>
                  <h2>
                    Lista de adjacência no servidor<Zh className="zh-tag">鄰接表</Zh>
                  </h2>
                  <p className={styles.sub}>
                    {graph.direcionado
                      ? 'Direcionado: cada aresta entra só na lista da origem.'
                      : 'Não direcionado: cada aresta entra nas duas pontas.'}{' '}
                    Ordem exata em que o backend guarda.
                  </p>
                </div>
                <dl className={styles.counters}>
                  <div>
                    <dt>V</dt>
                    <dd>{adj.size}</dd>
                  </div>
                  <div>
                    <dt>E</dt>
                    <dd>{graph.arestas.length}</dd>
                  </div>
                  <div>
                    <dt>Entradas na lista</dt>
                    <dd>{entries}</dd>
                  </div>
                </dl>
                <label className={styles.check}>
                  <input type="checkbox" checked={showMatrix} onChange={(e) => setShowMatrix(e.target.checked)} />
                  Comparar com matriz
                </label>
              </header>

              <div className={showMatrix ? styles.split : undefined}>
                <ol className={styles.board}>
                  {[...adj].map(([v, list]) => (
                    <li key={v} className={styles.boardRow}>
                      <span className={styles.vertex}>{v}</span>
                      <span className={styles.neighbors}>
                        {list.length === 0 && <span className={styles.emptyList}>lista vazia</span>}
                        {list.map((e, i) => (
                          <span key={i} className={styles.pill}>
                            <span>{e.destino}</span>
                            <span className={styles.pillWeight}>{formatWeight(e.peso)}</span>
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ol>
                {showMatrix && <MatrixCompare adj={adj} entries={entries} />}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
