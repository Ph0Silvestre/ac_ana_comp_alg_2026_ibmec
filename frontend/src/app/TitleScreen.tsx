import { useEffect, useState } from 'react';
import { MapBackdrop } from '../components/canvas/MapBackdrop';
import { SpeakerIcon } from '../components/ui/SpeakerIcon';
import { TileStrip } from '../components/ui/TileStrip';
import { Zh } from '../components/ui/Zh';
import backdrop from '../components/canvas/backdrop.module.css';
import { COURSE, TEAM } from '../data/team';
import { HK_EDGES, HK_NODES } from '../data/hongKongGraph';
import { ALGO_COLOR_VAR, ALGOS } from '../domain/types';
import { playCue } from '../game/sound';
import { useCampaignStore } from '../game/useCampaignStore';
import { useGraphStore } from '../store/useGraphStore';
import styles from './screens.module.css';

const EDGE_STAGGER = 165; // 14 arestas em ~2,5 s
const EDGE_DRAW = 340;

/** Entra na área de trabalho com o gongo, se o som estiver ligado. Enter e clique são gestos do usuário. */
function begin() {
  if (useCampaignStore.getState().soundOn) playCue('gongo');
  useGraphStore.getState().setScreen('workspace');
}

export function TitleScreen() {
  const soundOn = useCampaignStore((s) => s.soundOn);
  const toggleSound = useCampaignStore((s) => s.toggleSound);
  const [app, city] = COURSE.title.split(': ');
  const [inset, setInset] = useState(() => Math.min(440, window.innerWidth * 0.3));

  useEffect(() => {
    const onResize = () => setInset(Math.min(440, window.innerWidth * 0.3));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        begin();
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className={styles.screen}>
      <MapBackdrop leftInset={inset}>
        {(projection) => {
          const pos = new Map(HK_NODES.map((n) => [n.id, projection([n.lon, n.lat]) ?? [0, 0]]));
          return (
            <>
              {HK_EDGES.map((e, i) => {
                const [x1, y1] = pos.get(e.origem)!;
                const [x2, y2] = pos.get(e.destino)!;
                return (
                  <path
                    key={i}
                    d={`M${x1},${y1}L${x2},${y2}`}
                    pathLength={1}
                    className={backdrop.route}
                    style={{
                      stroke: ALGO_COLOR_VAR[ALGOS[i % 4]],
                      strokeDasharray: 1,
                      animation: `draw-route ${EDGE_DRAW}ms var(--ease-route) ${300 + i * EDGE_STAGGER}ms both`,
                    }}
                  />
                );
              })}
              {HK_NODES.map((n) => {
                const [x, y] = pos.get(n.id)!;
                return (
                  <g key={n.id} transform={`translate(${x},${y})`}>
                    <circle r={16} className={backdrop.station} />
                    <text y={6} className={backdrop.stationId}>
                      {n.id}
                    </text>
                  </g>
                );
              })}
            </>
          );
        }}
      </MapBackdrop>

      {/* Placa vertical, como os letreiros das ruas de Kowloon */}
      <p className={styles.verticalSign} aria-hidden="true">
        <Zh>{COURSE.titleZh}</Zh>
      </p>

      <div className={styles.titleBlock}>
        <h1 className={styles.title}>
          {app}:
          <span className={styles.titleCity}>
            {city}
            <Zh className={styles.seal}>香港</Zh>
          </span>
        </h1>
        <p className={styles.discipline}>{COURSE.discipline}</p>
        <p className={styles.meta}>
          {COURSE.professor}, {COURSE.program}, {COURSE.institution} {COURSE.term}
        </p>
        <ul className={styles.team} aria-label="Integrantes">
          {TEAM.map((m) => (
            <li key={m.registration + m.name}>
              <span>{m.name}</span>
              <span className={styles.registration}>{m.registration}</span>
            </li>
          ))}
        </ul>
        <div className={styles.startRow}>
          <button type="button" className={styles.start} onClick={begin}>
            Pressione Enter para começar
            <Zh className="zh-tag">按 Enter 開始</Zh>
          </button>
          <button type="button" className={styles.soundToggle} onClick={toggleSound} aria-pressed={soundOn}>
            <SpeakerIcon on={soundOn} />
            {soundOn ? 'Som ligado' : 'Som desligado'}
          </button>
        </div>
      </div>

      <TileStrip size={10} className={styles.tiles} />
    </div>
  );
}
