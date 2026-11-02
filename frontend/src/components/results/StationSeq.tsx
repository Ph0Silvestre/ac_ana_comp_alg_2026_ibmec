import styles from './results.module.css';

/** Sequência de estações ligadas pela linha do algoritmo (ordem de visita, fila, rota). */
export function StationSeq({ items, color, label }: { items: string[]; color: string; label: string }) {
  return (
    <ol className={styles.seq} style={{ ['--line' as string]: color }} aria-label={label}>
      {items.map((v, i) => (
        <li key={`${v}-${i}`} className={styles.seqItem}>
          <span className={styles.seqDot}>{v}</span>
        </li>
      ))}
    </ol>
  );
}
