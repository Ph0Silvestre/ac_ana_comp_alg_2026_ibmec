import { useEffect, useState } from 'react';
import { CanvasStage } from '../components/canvas/CanvasStage';
import { AdjacencyDrawer } from '../components/memory/AdjacencyDrawer';
import { ResultsPanel } from '../components/results/ResultsPanel';
import { SourcePanel } from '../components/source/SourcePanel';
import { CampaignSummary } from '../components/mission/CampaignSummary';
import { NPCMissionPanel } from '../components/mission/NPCMissionPanel';
import { ConfirmInline } from '../components/ui/ConfirmInline';
import { Flags } from '../components/ui/Flags';
import { KeyHint } from '../components/ui/KeyHint';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { TileStrip } from '../components/ui/TileStrip';
import { Zh } from '../components/ui/Zh';
import { AlgoBar } from '../components/workspace/AlgoBar';
import { ALGOS } from '../domain/types';
import { MISSIONS } from '../game/missions';
import { useCampaignSounds, useCampaignStore, useMissionController } from '../game/useCampaignStore';
import { useGraphStore } from '../store/useGraphStore';
import { COURSE } from '../data/team';
import styles from '../components/workspace/workspace.module.css';
import ui from '../components/ui/ui.module.css';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function Workspace() {
  const mode = useGraphStore((s) => s.mode);
  const text = useGraphStore((s) => s.sources[s.mode].text);
  const serverOnline = useGraphStore((s) => s.serverOnline);
  const setMode = useGraphStore((s) => s.setMode);
  const finish = useGraphStore((s) => s.finish);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [relayoutToken, setRelayoutToken] = useState(0);
  // Campanha: avalia as execuções reais. No modo livre não interfere em nada.
  useMissionController();
  useCampaignSounds();
  const missionTarget = useCampaignStore((s) =>
    s.playMode === 'campanha' && !s.campaign.finished ? MISSIONS[s.campaign.index].target : null,
  );

  // Preview ao vivo com debounce de 300 ms.
  useEffect(() => {
    const id = window.setTimeout(() => useGraphStore.getState().reparse(), 300);
    return () => window.clearTimeout(id);
  }, [text]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const s = useGraphStore.getState();
      if (e.key === 'Escape') {
        if (s.drawerOpen) s.setDrawerOpen(false);
        return;
      }
      // Atalhos desligados enquanto o foco está no editor ou num campo.
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (['1', '2', '3', '4'].includes(k)) {
        e.preventDefault();
        if (!s.running) s.run(ALGOS[Number(k) - 1]);
      } else if (k === 'm') s.toggleMode();
      else if (k === 'e') s.setDrawerOpen(!s.drawerOpen);
      else if (k === 't') s.toggleTheme();
      else if (k === 'r') s.replay();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <h1 className={styles.brand}>
          <span>{COURSE.title}</span>
          <Zh className={styles.brandZh}>{COURSE.titleZh}</Zh>
        </h1>
        <Flags />

        <div className={styles.modeSwitch} role="radiogroup" aria-label="Fonte do grafo">
          <button type="button" role="radio" aria-checked={mode === 'map'} onClick={() => setMode('map')}>
            Mapa de HK
          </button>
          <button type="button" role="radio" aria-checked={mode === 'custom'} onClick={() => setMode('custom')}>
            Grafo personalizado
          </button>
          <KeyHint k="M" />
        </div>

        <div className={styles.topActions}>
          <ThemeToggle />
          <div className={styles.confirmAnchor}>
            <button type="button" className={ui.ghost} onClick={() => setConfirmFinish(true)}>
              Finalizar aplicação
            </button>
            <ConfirmInline
              open={confirmFinish}
              align="right"
              message="Finalizar a aplicação? O grafo atual será descartado."
              confirmLabel="Finalizar"
              onConfirm={finish}
              onCancel={() => setConfirmFinish(false)}
            />
          </div>
        </div>
      </header>
      <TileStrip size={6} />

      {serverOnline === false && (
        <p className={styles.offline} role="status">
          Servidor offline. Rode <code>uvicorn main:app --reload</code> na pasta backend.
        </p>
      )}

      <main
        className={styles.main}
        style={{ gridTemplateColumns: `${leftOpen ? 'clamp(250px, 21vw, 320px)' : '44px'} minmax(0, 1fr) ${rightOpen ? 'clamp(300px, 25vw, 380px)' : '44px'}` }}
      >
        <aside className={`${styles.side} ${styles.left}`}>
          {leftOpen ? (
            <>
              <button type="button" className={styles.collapse} onClick={() => setLeftOpen(false)} aria-label="Recolher painel do grafo">
                <Chevron dir="left" />
              </button>
              <SourcePanel />
            </>
          ) : (
            <button type="button" className={styles.rail} onClick={() => setLeftOpen(true)} aria-label="Abrir painel do grafo">
              <Chevron dir="right" />
              <span>Grafo</span>
            </button>
          )}
        </aside>

        <div className={styles.center}>
          <CanvasStage relayoutToken={relayoutToken} />
          {mode === 'custom' && (
            <button type="button" className={`${ui.ghost} ${styles.relayout}`} onClick={() => setRelayoutToken((t) => t + 1)}>
              Reorganizar desenho
            </button>
          )}
          <AlgoBar showTarget={missionTarget !== null} />
        </div>

        <aside className={`${styles.side} ${styles.right}`}>
          {rightOpen ? (
            <>
              <button type="button" className={styles.collapse} onClick={() => setRightOpen(false)} aria-label="Recolher painel de resultado">
                <Chevron dir="right" />
              </button>
              <div className={styles.rightStack}>
                <NPCMissionPanel />
                <div className={styles.rightResults}>
                  <ResultsPanel />
                </div>
              </div>
            </>
          ) : (
            <button type="button" className={styles.rail} onClick={() => setRightOpen(true)} aria-label="Abrir painel de resultado">
              <Chevron dir="left" />
              <span>Resultado</span>
            </button>
          )}
        </aside>

        <AdjacencyDrawer />
      </main>
      <CampaignSummary />
    </div>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d={dir === 'left' ? 'M9 2 4 7l5 5' : 'M5 2l5 5-5 5'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
