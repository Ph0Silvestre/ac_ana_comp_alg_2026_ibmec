import type { DfsResponse } from '../../api/client';
import type { Adjacency } from '../../domain/adjacency';
import { deriveDfs } from '../../domain/derive';
import { joinList } from '../../domain/format';
import { StationSeq } from './StationSeq';
import styles from './results.module.css';

const GLYPH: Record<string, string> = { '│  ': '│', '├─ ': '├─', '└─ ': '└─', '   ': '' };

export function DfsResult({ data, adj, direcionado }: { data: DfsResponse; adj: Adjacency; direcionado: boolean }) {
  const v = deriveDfs(data, adj, direcionado);
  const total = adj.size;

  return (
    <div className={styles.body}>
      <section>
        <h3>Ordem de visita</h3>
        <StationSeq items={v.order} color="var(--line-dfs)" label="Ordem de visita do DFS" />
      </section>

      <section>
        <h3>Árvore de busca</h3>
        <div className={styles.tree} role="tree" aria-label="Árvore do DFS">
          {v.lines.map((l) => (
            <div key={l.vertex} className={styles.treeLine} role="treeitem">
              {(l.prefix.match(/.{3}/g) ?? []).map((chunk, i) => (
                <span key={i} className={styles.treeGlyph} aria-hidden="true">
                  {GLYPH[chunk] ?? ''}
                </span>
              ))}
              <span className={styles.treeVertex}>{l.vertex}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Diagnóstico</h3>
        <p className={styles.diag}>
          {v.unreached.length === 0
            ? `${v.order.length} de ${total} bairros alcançados a partir de ${v.start}.`
            : `${v.unreached.length === 1 ? '1 bairro não alcançado' : `${v.unreached.length} bairros não alcançados`}: ${joinList(v.unreached)}.`}
        </p>
        <p className={styles.diag}>
          {v.deadEnds.length
            ? `Becos sem saída (sem vizinhos de saída): ${joinList(v.deadEnds)}.`
            : 'Nenhum beco sem saída: todo bairro tem pelo menos uma via de saída.'}
        </p>
        {!direcionado && v.lineEnds.length > 0 && <p className={styles.diag}>Pontas de linha (só uma via): {joinList(v.lineEnds)}.</p>}
      </section>
    </div>
  );
}
