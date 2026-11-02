import { ALGO_COLOR_VAR, ALGO_LABEL, ALGOS } from '../../domain/types';
import { blockReason, useGraphStore, type Speed } from '../../store/useGraphStore';
import { KeyHint } from '../ui/KeyHint';
import { Zh } from '../ui/Zh';
import styles from './workspace.module.css';

const SPEEDS: { value: Speed; label: string }[] = [
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 0, label: 'Instantâneo' },
];

/** Legenda de linhas do metrô: cada algoritmo é uma pílula com a faixa da cor da linha. */
export function AlgoBar({ showTarget = false }: { showTarget?: boolean }) {
  const parsed = useGraphStore((s) => s.parsed[s.mode]);
  const start = useGraphStore((s) => s.start);
  const target = useGraphStore((s) => s.target);
  const activeAlgo = useGraphStore((s) => s.activeAlgo);
  const running = useGraphStore((s) => s.running);
  const results = useGraphStore((s) => s.results);
  const speed = useGraphStore((s) => s.speed);
  const overlayAll = useGraphStore((s) => s.overlayAll);
  const error = useGraphStore((s) => s.error);
  const { setStart, setTarget, run, setSpeed, replay, setOverlayAll, dismissError } = useGraphStore.getState();

  const vertices = parsed.graph.vertices;
  const hasResults = Object.keys(results).length > 0;
  const computedCount = Object.keys(results).length;

  // Motivos visíveis dos botões desabilitados (title não aparece em botão desabilitado em todo navegador).
  const notes: string[] = [];
  if (parsed.hasErrors) notes.push('Corrija os erros do editor antes de executar.');
  if (parsed.graph.direcionado) notes.push('Kruskal trabalha com grafos não direcionados.');
  if (parsed.hasNegative) notes.push('Dijkstra não aceita pesos negativos.');

  return (
    <div className={styles.algoBar}>
      <div className={styles.algoRow}>
        <label className={styles.selectField}>
          <span>
            Início<Zh className="zh-tag">起點</Zh>
          </span>
          <select value={start} onChange={(e) => setStart(e.target.value)} disabled={!vertices.length}>
            {vertices.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.algoButtons} role="group" aria-label="Algoritmos">
          {ALGOS.map((a, i) => {
            const reason = blockReason(a, parsed, start);
            const active = activeAlgo === a;
            return (
              <button
                key={a}
                type="button"
                className={`${styles.algoPill} ${active ? styles.algoPillActive : ''}`}
                style={{ ['--line' as string]: ALGO_COLOR_VAR[a] }}
                onClick={() => run(a)}
                disabled={Boolean(reason) || running !== null}
                title={reason ?? `Executar ${ALGO_LABEL[a]}`}
                aria-pressed={active}
                aria-busy={running === a}
              >
                <span className={styles.algoStripe} aria-hidden="true" />
                <span>{running === a ? `${ALGO_LABEL[a]}...` : ALGO_LABEL[a]}</span>
                <KeyHint k={String(i + 1)} />
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.algoRow}>
        {(activeAlgo === 'dijkstra' || showTarget) && (
          <label className={`${styles.selectField} ${styles.compact}`}>
            <span>
              Destino<Zh className="zh-tag">終點</Zh>
            </span>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {vertices.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className={styles.playback} role="group" aria-label="Reprodução do resultado">
          <button type="button" className={styles.smallGhost} onClick={replay} disabled={!hasResults}>
            Repetir <KeyHint k="R" />
          </button>
          <div className={styles.segmented} role="radiogroup" aria-label="Velocidade">
            {SPEEDS.map((s) => (
              <button key={s.value} type="button" role="radio" aria-checked={speed === s.value} onClick={() => setSpeed(s.value)}>
                {s.label}
              </button>
            ))}
          </div>
          <label className={styles.checkField}>
            <input type="checkbox" checked={overlayAll} onChange={(e) => setOverlayAll(e.target.checked)} disabled={computedCount < 2} />
            Sobrepor resultados
          </label>
        </div>
        {error ? (
          <p className={styles.algoError} role="alert">
            {error}
            <button type="button" className={styles.linkButton} onClick={dismissError}>
              Fechar
            </button>
          </p>
        ) : (
          notes.length > 0 && <p className={styles.algoNote}>{notes.join(' ')}</p>
        )}
      </div>
    </div>
  );
}
