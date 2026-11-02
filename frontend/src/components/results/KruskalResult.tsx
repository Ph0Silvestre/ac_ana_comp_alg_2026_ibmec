import type { KruskalResponse } from '../../api/client';
import { deriveKruskal } from '../../domain/derive';
import { formatWeight } from '../../domain/format';
import { useGraphStore } from '../../store/useGraphStore';
import styles from './results.module.css';

export function KruskalResult({ data, vertexCount }: { data: KruskalResponse; vertexCount: number }) {
  const v = deriveKruskal(data, vertexCount);
  const speed = useGraphStore((s) => s.speed);
  const replayToken = useGraphStore((s) => s.replayToken);
  const stepMs = speed === 0 ? 0 : 340 / speed;

  return (
    <div className={styles.body}>
      <section>
        <h3>Custo total da fibra</h3>
        <p className={styles.total}>{formatWeight(v.total)}</p>
        {v.isForest && <p className={styles.diag}>O grafo é desconexo. Resultado é uma floresta geradora mínima.</p>}
      </section>

      <section>
        <h3>Arestas na ordem em que foram aceitas</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Aresta</th>
              <th scope="col">Peso</th>
              <th scope="col">Acumulado</th>
            </tr>
          </thead>
          <tbody key={replayToken}>
            {v.rows.map((r, i) => (
              <tr
                key={`${r.origem}-${r.destino}`}
                // Acompanha o desenho no canvas: cada linha acende quando a aresta termina de ser traçada.
                style={stepMs ? { animation: `light-up ${stepMs * 0.6}ms ease-out ${(i + 0.7) * stepMs}ms both` } : undefined}
              >
                <td className={styles.num}>{i + 1}</td>
                <td className={styles.strong}>
                  {r.origem}–{r.destino}
                </td>
                <td className={styles.num}>{formatWeight(r.peso)}</td>
                <td className={styles.num}>{formatWeight(r.acumulado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.help}>
          {v.rows.length} de {Math.max(0, vertexCount - 1)} arestas de uma árvore geradora com {vertexCount} vértices.
        </p>
      </section>
    </div>
  );
}
