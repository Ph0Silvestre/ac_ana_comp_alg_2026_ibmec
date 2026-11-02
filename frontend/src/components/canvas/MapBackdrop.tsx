import { motion } from 'motion/react';
import { useMemo, type ReactNode } from 'react';
import type { GeoProjection } from 'd3-geo';
import { ACTIVE_DISTRICTS, projectMap } from './geo';
import { useElementSize } from './useElementSize';
import styles from './backdrop.module.css';

interface Props {
  /** Espaço reservado à esquerda para o bloco de texto. */
  leftInset?: number;
  dim?: boolean;
  children?: (projection: GeoProjection) => ReactNode;
}

/** Mapa de Hong Kong em tela cheia, usado na tela inicial e na de sessão encerrada. */
export function MapBackdrop({ leftInset = 0, dim, children }: Props) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const map = useMemo(
    () => (size.width && size.height ? projectMap(size.width - leftInset, size.height, 40) : null),
    [size.width, size.height, leftInset],
  );

  return (
    <div ref={ref} className={`${styles.backdrop} ${dim ? styles.dim : ''}`} aria-hidden="true">
      {map && (
        <motion.svg
          className={styles.svg}
          viewBox={`0 0 ${size.width} ${size.height}`}
          initial={{ scale: 1.03 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <g transform={`translate(${leftInset},0)`}>
            {map.paths.map((p) => (
              <path key={p.name} d={p.d} className={`${styles.district} ${ACTIVE_DISTRICTS.has(p.name) ? styles.active : ''}`} />
            ))}
            {children?.(map.projection)}
          </g>
        </motion.svg>
      )}
    </div>
  );
}
