import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { MISSIONS, NPC } from '../../game/missions';
import { useCampaignStore } from '../../game/useCampaignStore';
import { ALGO_COLOR_VAR, ALGO_LABEL } from '../../domain/types';
import { useGraphStore } from '../../store/useGraphStore';
import { StationSeq } from '../results/StationSeq';
import { SpeakerIcon } from '../ui/SpeakerIcon';
import { ConfirmInline } from '../ui/ConfirmInline';
import { MissionDialog } from './MissionDialog';
import { MissionProgress, STATUS_LABEL } from './MissionProgress';
import { NPCPortrait } from './NPCPortrait';
import styles from './mission.module.css';
import ui from '../ui/ui.module.css';

/** NPC e missão ativa, no topo do painel direito. No modo livre vira só um convite compacto. */
export function NPCMissionPanel() {
  const playMode = useCampaignStore((s) => s.playMode);
  const minimized = useCampaignStore((s) => s.minimized);

  if (playMode === 'livre') return <FreeModeInvite />;
  if (minimized) return <MinimizedBar />;
  return <FullPanel />;
}

function FreeModeInvite() {
  const setPlayMode = useCampaignStore((s) => s.setPlayMode);
  const campaign = useCampaignStore((s) => s.campaign);
  const started = campaign.index > 0 || campaign.statuses[0] !== 'ativa';
  return (
    <section className={`${styles.panel} ${styles.invite}`} aria-label="Modo campanha">
      <NPCPortrait pose="neutro" size="small" />
      <div className={styles.inviteText}>
        <p className={styles.inviteTitle}>Modo livre</p>
        <p className={styles.muted}>
          {started ? 'Sua campanha está guardada.' : 'Quatro missões de infraestrutura com ordens do seu superior.'}
        </p>
        <p className={styles.disclaimer}>{NPC.disclaimer}</p>
      </div>
      <button type="button" className={ui.primary} onClick={() => setPlayMode('campanha')}>
        {started ? 'Voltar à campanha' : 'Jogar campanha'}
      </button>
    </section>
  );
}

function MinimizedBar() {
  const { campaign, setMinimized } = useCampaignStore();
  const mission = MISSIONS[campaign.index];
  const status = campaign.finished ? 'campanha concluída' : STATUS_LABEL[campaign.statuses[campaign.index]].toLowerCase();
  return (
    <section className={`${styles.panel} ${styles.mini}`} aria-label="Missão atual" data-status={campaign.statuses[campaign.index]}>
      <NPCPortrait pose={campaign.feedback.pose} size="small" />
      <div className={styles.inviteText}>
        <p className={`${styles.inviteTitle} ${styles.oneLine}`}>
          Missão {mission.number} de {MISSIONS.length}
        </p>
        <p className={`${styles.muted} ${styles.oneLine}`} title={`${ALGO_LABEL[mission.algo]}, ${status}`}>
          {ALGO_LABEL[mission.algo]}, {status}
        </p>
      </div>
      <button type="button" className={ui.ghost} onClick={() => setMinimized(false)}>
        Mostrar
      </button>
    </section>
  );
}

function FullPanel() {
  const { campaign, beat, soundOn, toggleSound, setMinimized, setPlayMode, tryAgain, next, restart, setSummaryOpen } = useCampaignStore();
  const vertices = useGraphStore((s) => s.parsed[s.mode].graph.vertices);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const mission = MISSIONS[campaign.index];
  const status = campaign.statuses[campaign.index];
  const evidence = campaign.evidence[campaign.index];
  const isLast = campaign.index === MISSIONS.length - 1;
  const missing = [mission.start, mission.target].filter((v): v is string => v !== null && !vertices.includes(v));

  return (
    <section
      className={`${styles.panel} ${styles.panelFull}`}
      aria-labelledby="mission-title"
      data-status={status}
      style={{ ['--line' as string]: ALGO_COLOR_VAR[mission.algo] }}
    >
      <div className={styles.scrollArea}>
        <header className={styles.bar} aria-label="Campanha">
          <div className={styles.barActions}>
            <div className={styles.restartAnchor}>
              <button type="button" className={styles.textButton} onClick={() => setConfirmRestart(true)}>
                Reiniciar
              </button>
              <ConfirmInline
                open={confirmRestart}
                align="right"
                message="Reiniciar a campanha? O progresso das missões será perdido. O grafo não muda."
                confirmLabel="Reiniciar"
                onConfirm={() => {
                  setConfirmRestart(false);
                  restart();
                }}
                onCancel={() => setConfirmRestart(false)}
              />
            </div>
            <button type="button" className={styles.textButton} onClick={() => setPlayMode('livre')}>
              Modo livre
            </button>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.pushRight}`}
              onClick={toggleSound}
              aria-pressed={soundOn}
              aria-label="Som da campanha"
              title={soundOn ? 'Desligar som' : 'Ligar som'}
            >
              <SpeakerIcon on={soundOn} />
            </button>
            <button type="button" className={styles.iconButton} onClick={() => setMinimized(true)} aria-label="Minimizar personagem">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <MissionProgress statuses={campaign.statuses} index={campaign.index} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mission.id}
            className={styles.missionBody}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className={styles.npcRow}>
              <NPCPortrait pose={campaign.feedback.pose} />
              <div className={styles.npcMeta}>
                <p className={styles.npcName}>{NPC.name}</p>
                <p className={styles.muted}>{NPC.role}</p>
                <p className={styles.missionNumber}>
                  Missão {mission.number} de {MISSIONS.length}
                </p>
                <h2 id="mission-title" className={styles.missionTitle}>
                  {mission.title}
                </h2>
              </div>
            </div>

            <MissionDialog text={campaign.feedback.text} kind={campaign.feedback.kind} beat={beat} />

            {missing.length > 0 && status !== 'concluida' && (
              <p className={styles.warning} role="status">
                O grafo atual não tem {missing.length === 1 ? 'o vértice' : 'os vértices'} {missing.join(' e ')}. Volte ao grafo da proposta para cumprir esta missão.
              </p>
            )}

            <AnimatePresence>
              {status === 'concluida' && evidence && (
                <motion.div
                  key="stamp"
                  className={styles.evidence}
                  initial={{ opacity: 0, scale: 1.12 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                >
                  <p className={styles.stamp}>Missão concluída</p>
                  {evidence.route && <StationSeq items={evidence.route} color={ALGO_COLOR_VAR[mission.algo]} label="Rota encontrada" />}
                  <p className={styles.evidenceText}>{evidence.summary}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <dl className={styles.facts}>
              <div>
                <dt>Objetivo</dt>
                <dd>{mission.objective}</dd>
              </div>
              <div>
                <dt>Algoritmo</dt>
                <dd>
                  <span className={styles.algoTag}>
                    <span className={styles.algoStripe} aria-hidden="true" />
                    {ALGO_LABEL[mission.algo]}
                  </span>
                  <span className={styles.params}>
                    {mission.start ? (
                      <>
                        Início <strong>{mission.start}</strong>, destino <strong>{mission.target}</strong>
                      </>
                    ) : (
                      'Sem início nem destino'
                    )}
                  </span>
                </dd>
              </div>
            </dl>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className={styles.footer}>
        <span className={styles.status} data-status={status}>
          {STATUS_LABEL[status]}
        </span>
        {status === 'concluida' &&
          (campaign.finished ? (
            <button type="button" className={ui.primary} onClick={() => setSummaryOpen(true)}>
              Ver conclusão
            </button>
          ) : (
            <button type="button" className={ui.primary} onClick={next}>
              {isLast ? 'Concluir campanha' : 'Próxima missão'}
            </button>
          ))}
        {status === 'erro' && (
          <button type="button" className={ui.ghost} onClick={tryAgain}>
            Tentar de novo
          </button>
        )}
      </footer>
    </section>
  );
}

