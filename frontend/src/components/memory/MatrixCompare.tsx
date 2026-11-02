import { toMatrix, type Adjacency } from '../../domain/adjacency';
import { formatWeight } from '../../domain/format';
import styles from './memory.module.css';

/** Matriz V × V equivalente, para a defesa da escolha pela lista. */
export function MatrixCompare({ adj, entries }: { adj: Adjacency; entries: number }) {
  const { vertices, cells } = toMatrix(adj);
  const total = vertices.length * vertices.length;
  const empty = cells.flat().filter((c) => c === null).length;

  return (
    <div className={styles.matrixBox}>
      <p className={styles.memSummary}>
        Lista: {vertices.length} vértices + {entries} entradas. Matriz: {total} células, {empty} vazias.
      </p>
      <p className={styles.sub}>
        Memória O(V + E) contra O(V²). Percorrer os vizinhos de um vértice custa O(grau) na lista e O(V) na matriz, por isso DFS e
        BFS ficam em O(V + E) com lista e O(V²) com matriz.
      </p>
      <div className={styles.matrixScroll}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th scope="col" aria-label="Origem" />
              {vertices.map((v) => (
                <th key={v} scope="col">
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vertices.map((v, i) => (
              <tr key={v}>
                <th scope="row">{v}</th>
                {cells[i].map((c, j) => (
                  <td key={j} className={c === null ? styles.cellEmpty : styles.cellFull}>
                    {c === null ? '' : formatWeight(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
