import styles from './ui.module.css';

/** Quadradinho com a tecla de atalho. */
export function KeyHint({ k }: { k: string }) {
  return (
    <kbd className={styles.key} aria-hidden="true">
      {k}
    </kbd>
  );
}
