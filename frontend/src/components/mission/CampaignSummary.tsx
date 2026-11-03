import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { MISSIONS, NPC } from '../../game/missions';
import { useCampaignStore } from '../../game/useCampaignStore';
import { ALGO_COLOR_VAR, ALGO_LABEL } from '../../domain/types';
import { StationSeq } from '../results/StationSeq';
import { NPCPortrait } from './NPCPortrait';
import styles from './mission.module.css';
import ui from '../ui/ui.module.css';

/** Tela de conclusão: os quatro algoritmos, o conceito de cada um e o que a API devolveu nas missões. */
export function CampaignSummary() {
  const open = useCampaignStore((s) => s.summaryOpen);
  const evidence = useCampaignStore((s) => s.campaign.evidence);
  const { setSummaryOpen, restart, setPlayMode } = useCampaignStore.getState();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setSummaryOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, setSummaryOpen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-title"
            className={styles.summary}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <header className={styles.summaryHead}>
              <NPCPortrait pose="falando" size="small" />
              <div>
                <h2 id="summary-title" className={styles.summaryTitle}>
                  Engenheiro-Chefe de Hong Kong
                </h2>
                <p className={styles.summarySub}>Campanha concluída</p>
              </div>
            </header>

            <ol className={styles.summaryList}>
              {MISSIONS.map((m, i) => (
                <li key={m.id} style={{ ['--line' as string]: ALGO_COLOR_VAR[m.algo] }}>
                  <p className={styles.summaryMission}>
                    <span className={styles.algoTag}>
                      <span className={styles.algoStripe} aria-hidden="true" />
                      {ALGO_LABEL[m.algo]}
                    </span>
                    <span>{m.title}</span>
                  </p>
                  <p className={styles.summaryConcept}>{m.concept}</p>
                  {evidence[i] && (
                    <div className={styles.summaryEvidence}>
                      {evidence[i]!.route && <StationSeq items={evidence[i]!.route!} color={ALGO_COLOR_VAR[m.algo]} label={`Rota da missão ${m.number}`} />}
                      <p className={styles.evidenceText}>{evidence[i]!.summary}</p>
                    </div>
                  )}
                </li>
              ))}
            </ol>

            <p className={styles.disclaimer}>{NPC.disclaimer}</p>

            <div className={styles.actions}>
              <button type="button" className={ui.primary} onClick={restart}>
                Reiniciar campanha
              </button>
              <button
                type="button"
                className={ui.ghost}
                onClick={() => {
                  setSummaryOpen(false);
                  setPlayMode('livre');
                }}
              >
                Voltar ao modo livre
              </button>
              <button type="button" ref={closeRef} className={ui.ghost} onClick={() => setSummaryOpen(false)}>
                Fechar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
