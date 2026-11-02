import type { MissionStatus } from '../../game/campaign';
import { MISSIONS } from '../../game/missions';
import { ALGO_COLOR_VAR, ALGO_LABEL } from '../../domain/types';
import styles from './mission.module.css';

export const STATUS_LABEL: Record<MissionStatus, string> = {
  pendente: 'Pendente',
  ativa: 'Ativa',
  concluida: 'Concluída',
  erro: 'Erro',
};

/** As quatro missões como estações de uma linha: cada trecho tem a cor do algoritmo da missão. */
export function MissionProgress({ statuses, index }: { statuses: MissionStatus[]; index: number }) {
  return (
    <ol className={styles.progress} aria-label="Progresso da campanha">
      {MISSIONS.map((m, i) => (
        <li
          key={m.id}
          className={styles.progressStop}
          data-status={statuses[i]}
          aria-current={i === index ? 'step' : undefined}
          style={{ ['--line' as string]: ALGO_COLOR_VAR[m.algo] }}
        >
          <span className={styles.progressDot} aria-hidden="true">
            {statuses[i] === 'concluida' ? <Check /> : m.number}
          </span>
          <span className={styles.progressName}>{ALGO_LABEL[m.algo]}</span>
          <span className="visually-hidden">
            Missão {m.number}, {STATUS_LABEL[statuses[i]]}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <path d="M2.5 7.5 5.5 10.5 11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
