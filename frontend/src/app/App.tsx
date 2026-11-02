import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { useServerStatus } from '../api/useServerStatus';
import { useGraphStore } from '../store/useGraphStore';
import { EndScreen } from './EndScreen';
import { TitleScreen } from './TitleScreen';
import { Workspace } from './Workspace';

export function App() {
  const screen = useGraphStore((s) => s.screen);
  const reduce = useReducedMotion();
  // Polling do /status; para quando a sessão é encerrada.
  useServerStatus(screen !== 'end');

  return (
    <MotionConfig reducedMotion="user" transition={reduce ? { duration: 0 } : undefined}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={screen}
          style={{ height: '100%' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.3, ease: 'easeOut' }}
        >
          {screen === 'title' && <TitleScreen />}
          {screen === 'workspace' && <Workspace />}
          {screen === 'end' && <EndScreen />}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
