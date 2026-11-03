import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { NPC, POSE_LABEL, POSE_SRC, type Pose } from '../../game/missions';
import styles from './mission.module.css';

// Baixa as quatro poses de uma vez para a troca de expressão não piscar.
let preloaded = false;
function preloadPoses() {
  if (preloaded || typeof Image === 'undefined') return;
  preloaded = true;
  for (const src of Object.values(POSE_SRC)) new Image().src = src;
}

/** Retrato low-poly do NPC. Sem a imagem, mostra um retrato poligonal desenhado no lugar. */
export function NPCPortrait({ pose, size = 'large' }: { pose: Pose; size?: 'large' | 'small' }) {
  const [failed, setFailed] = useState<Set<Pose>>(() => new Set());
  useEffect(preloadPoses, []);

  const alt = `${NPC.name}, ${POSE_LABEL[pose]}`;
  const cls = `${styles.portrait} ${size === 'small' ? styles.portraitSmall : ''} ${pose === 'bravo' ? styles.portraitAngry : ''}`;

  return (
    <div className={cls} role="img" aria-label={alt}>
      <AnimatePresence initial={false}>
        <motion.div
          key={pose}
          className={styles.portraitLayer}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {failed.has(pose) ? (
            <PortraitFallback pose={pose} />
          ) : (
            <img
              src={POSE_SRC[pose]}
              alt=""
              draggable={false}
              onError={() => setFailed((f) => new Set(f).add(pose))}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Fallback: silhueta em triângulos com as cores do tema, para o painel não ficar vazio. */
function PortraitFallback({ pose }: { pose: Pose }) {
  return (
    <svg className={styles.fallback} viewBox="0 0 100 122" aria-hidden="true" data-testid="npc-fallback">
      <rect width="100" height="122" style={{ fill: 'var(--land-active)' }} />
      <polygon points="0,0 22,0 22,80 0,92" style={{ fill: 'var(--line-dijkstra)' }} />
      <polygon points="50,18 70,30 68,56 50,66 32,56 30,30" style={{ fill: 'var(--ink-muted)' }} />
      <polygon points="30,30 50,12 70,30 50,24" style={{ fill: 'var(--ink)' }} />
      <polygon points="14,122 26,76 50,70 74,76 86,122" style={{ fill: 'var(--ink)' }} />
      <polygon points="46,72 54,72 52,104 48,104" style={{ fill: pose === 'bravo' ? 'var(--line-dijkstra)' : 'var(--line-dfs)' }} />
    </svg>
  );
}
