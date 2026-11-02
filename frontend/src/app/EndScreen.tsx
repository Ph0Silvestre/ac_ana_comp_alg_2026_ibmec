import { useEffect, useRef } from 'react';
import { MapBackdrop } from '../components/canvas/MapBackdrop';
import { Zh } from '../components/ui/Zh';
import { useGraphStore } from '../store/useGraphStore';
import styles from './screens.module.css';

export function EndScreen() {
  const setScreen = useGraphStore((s) => s.setScreen);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => buttonRef.current?.focus(), []);

  return (
    <div className={styles.screen}>
      <MapBackdrop dim />
      <div className={styles.endBlock}>
        <h1 className={styles.endTitle}>Sessão encerrada.</h1>
        <Zh className={styles.endZh}>多謝乘搭</Zh>
        <p className={styles.meta}>O grafo foi descartado e a aplicação foi finalizada.</p>
        <button ref={buttonRef} type="button" className={styles.newSession} onClick={() => setScreen('title')}>
          Nova sessão
        </button>
      </div>
    </div>
  );
}
