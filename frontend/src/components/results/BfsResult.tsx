import type { BfsResponse } from '../../api/client';
import type { Adjacency } from '../../domain/adjacency';
import { deriveBfs } from '../../domain/derive';
import { joinList } from '../../domain/format';
import { StationSeq } from './StationSeq';
import styles from './results.module.css';

export function BfsResult({ data, adj }: { data: BfsResponse; adj: Adjacency }) {
  const v = deriveBfs(data, adj);

  return (
    <div className={styles.body}>
      <section>
        <h3>Fila de execução</h3>
        <StationSeq items={v.order} color="var(--line-bfs)" label="Fila de execução do BFS" />
      </section>

      <section>
        <h3>Propagação por nível</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Nível</th>
              <th scope="col">Bairros</th>
              <th scope="col">Avisados por</th>
            </tr>
          </thead>
          <tbody>
            {v.levels.map((group, level) => (
              <tr key={level}>
                <td className={styles.num}>{level}</td>
                <td className={styles.strong}>{group.join(', ')}</td>
                <td className={styles.muted}>
                  {level === 0
                    ? 'Início'
                    : group.map((x) => `${x} por ${v.parent.get(x)}`).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Diagnóstico</h3>
        <p className={styles.diag}>
          {v.unreached.length === 0
            ? `O alerta chega a todos os ${v.order.length} bairros em ${v.levels.length - 1} ${v.levels.length - 1 === 1 ? 'passo' : 'passos'}.`
            : `O alerta não chega a ${joinList(v.unreached)}.`}
        </p>
      </section>
    </div>
  );
}
