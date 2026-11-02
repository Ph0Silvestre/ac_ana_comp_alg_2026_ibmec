import { ALGO_COLOR_VAR } from '../../domain/types';
import { useGraphStore } from '../../store/useGraphStore';
import { ForceCanvas } from './ForceCanvas';
import { HKMapCanvas } from './HKMapCanvas';
import { useSceneMarks } from './marks';
import { useElementSize } from './useElementSize';
import styles from './canvas.module.css';

export function CanvasStage({ relayoutToken }: { relayoutToken: number }) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const mode = useGraphStore((s) => s.mode);
  const graph = useGraphStore((s) => s.parsed[s.mode].graph);
  const marks = useSceneMarks();
  const ready = size.width > 0 && size.height > 0;

  return (
    <div ref={ref} className={styles.stage}>
      {ready && mode === 'map' && <HKMapCanvas width={size.width} height={size.height} graph={graph} marks={marks} />}
      {ready && mode === 'custom' && (
        <ForceCanvas width={size.width} height={size.height} graph={graph} marks={marks} relayoutToken={relayoutToken} />
      )}

      {mode === 'custom' && graph.vertices.length === 0 && (
        <p className={styles.empty}>Nenhum vértice ainda. Digite as arestas no editor, uma por linha: origem destino peso.</p>
      )}
      {mode === 'custom' && graph.vertices.length > 0 && <p className={styles.hint}>Arraste as estações para reorganizar.</p>}

      {marks.legend.length > 0 && (
        <ul className={styles.legend} aria-label="Legenda das linhas">
          {marks.legend.map((l) => (
            <li key={l.algo} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: ALGO_COLOR_VAR[l.algo] }} />
              {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
