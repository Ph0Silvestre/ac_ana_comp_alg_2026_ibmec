import type { DijkstraResponse } from '../../api/client';
import { deriveDijkstra } from '../../domain/derive';
import { formatWeight } from '../../domain/format';
import { useGraphStore } from '../../store/useGraphStore';
import styles from './results.module.css';

export function DijkstraResult({ data }: { data: DijkstraResponse }) {
  const target = useGraphStore((s) => s.target);
  const setTarget = useGraphStore((s) => s.setTarget);
  const v = deriveDijkstra(data);
  const selected = v.rows.find((r) => r.destino === target);

  return (
    <div className={styles.body}>
      <section>
        <h3>Rota de {v.start} a {target}</h3>
        {selected?.path ? (
          <p className={styles.route}>
            <span className={styles.routeCost}>{formatWeight(selected.distancia_minima as number)}</span>
            <span>{selected.path.join(', ')}</span>
          </p>
        ) : (
          <p className={styles.diag}>{target} é inalcançável a partir de {v.start}.</p>
        )}
      </section>

      <section>
        <h3>Distâncias a partir de {v.start}</h3>
        <p className={styles.help}>Clique numa linha para ver a rota no desenho.</p>
        <table className={`${styles.table} ${styles.clickable}`}>
          <thead>
            <tr>
              <th scope="col">Destino</th>
              <th scope="col">Distância</th>
              <th scope="col">Anterior</th>
              <th scope="col">Caminho completo</th>
            </tr>
          </thead>
          <tbody>
            {v.rows.map((r) => {
              const unreachable = r.distancia_minima === 'Inalcançável';
              return (
                <tr
                  key={r.destino}
                  className={`${r.destino === target ? styles.selected : ''} ${unreachable ? styles.unreachable : ''}`}
                  onClick={() => setTarget(r.destino)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setTarget(r.destino);
                    }
                  }}
                  aria-selected={r.destino === target}
                >
                  <td className={styles.strong}>{r.destino}</td>
                  <td className={styles.num}>{unreachable ? 'Inalcançável' : formatWeight(r.distancia_minima as number)}</td>
                  <td>{r.veio_de ?? (r.destino === v.start ? 'Início' : '')}</td>
                  <td>{r.path ? r.path.join(', ') : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
