import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { FeedbackKind } from '../../game/campaign';
import { NPC } from '../../game/missions';
import styles from './mission.module.css';

const CHAR_MS = 16;

/**
 * Balão de fala com efeito de digitação. Clicar no balão ou em "Pular" mostra tudo.
 * Leitores de tela recebem a fala inteira de uma vez (região aria-live).
 */
export function MissionDialog({ text, kind, beat }: { text: string; kind: FeedbackKind; beat: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? text.length : 0);

  useEffect(() => {
    if (reduce) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          window.clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, CHAR_MS);
    return () => window.clearInterval(id);
  }, [text, beat, reduce]);

  const typing = shown < text.length;
  const skip = () => setShown(text.length);

  // Reação: tremida curta no erro, leve pulso no sucesso. Só em resposta a uma tentativa.
  const reaction =
    reduce || kind === 'intro' || kind === 'aguardando'
      ? {}
      : kind === 'erro'
        ? { x: [0, -7, 7, -5, 5, -2, 0] }
        : kind === 'sucesso'
          ? { scale: [1, 1.025, 1] }
          : {};

  return (
    <motion.div
      key={beat}
      className={`${styles.dialog} ${styles[`dialog_${kind}`] ?? ''}`}
      animate={reaction}
      transition={{ duration: 0.42, ease: 'easeOut' }}
      onClick={typing ? skip : undefined}
    >
      <p className={styles.dialogSpeaker}>{NPC.name}</p>
      <p className={styles.dialogText} aria-hidden="true">
        {text.slice(0, shown)}
        {typing && <span className={styles.caret} />}
        {/* Reserva a altura final para o painel não pular enquanto digita. */}
        <span className={styles.dialogGhost}>{text.slice(shown)}</span>
      </p>
      <p className="visually-hidden" aria-live="polite">
        {text}
      </p>
      {typing && (
        <button
          type="button"
          className={styles.skip}
          onClick={(e) => {
            e.stopPropagation();
            skip();
          }}
        >
          Pular
        </button>
      )}
    </motion.div>
  );
}
