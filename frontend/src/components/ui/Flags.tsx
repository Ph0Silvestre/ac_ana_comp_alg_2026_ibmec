import { useState } from 'react';
import styles from './ui.module.css';

const FLAGS = [
  { src: '/assets/bandeiras/china-lowpoly.png', label: 'Bandeira da República Popular da China', fallback: 'var(--line-dijkstra)' },
  {
    src: '/assets/bandeiras/hong-kong-lowpoly.png',
    label: 'Bandeira da Região Administrativa Especial de Hong Kong',
    fallback: 'var(--line-dijkstra)',
  },
];

/** Bandeiras low-poly no cabeçalho, com Hong Kong identificada como RAE da China. */
export function Flags() {
  return (
    <figure className={styles.flags}>
      <div className={styles.flagRow}>
        {FLAGS.map((f) => (
          <Flag key={f.src} {...f} />
        ))}
      </div>
      <figcaption className={styles.flagCaption}>
        Hong Kong, <abbr title="Região Administrativa Especial">RAE</abbr> da China
      </figcaption>
    </figure>
  );
}

function Flag({ src, label, fallback }: { src: string; label: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={styles.flag} role="img" aria-label={label} style={{ background: fallback }} />;
  return <img className={styles.flag} src={src} alt={label} title={label} onError={() => setFailed(true)} />;
}
