import { create } from 'zustand';
import { ApiError, runAlgorithm, type BfsResponse, type DfsResponse, type DijkstraResponse, type KruskalResponse } from '../api/client';
import { PROPOSAL_TEXT } from '../data/examples';
import { HK_NODES } from '../data/hongKongGraph';
import { toPayload } from '../domain/adjacency';
import { parseGraphText, type ParseResult } from '../domain/parser';
import type { Algo, Mode } from '../domain/types';

export interface Source {
  text: string;
  direcionado: boolean;
  ponderado: boolean;
}

export interface Results {
  dfs?: DfsResponse;
  bfs?: BfsResponse;
  dijkstra?: DijkstraResponse;
  kruskal?: KruskalResponse;
}

export type Screen = 'title' | 'workspace' | 'end';
export type Theme = 'light' | 'dark';
export type Speed = 1 | 2 | 0;
export type Point = { x: number; y: number };

const MAP_IDS = HK_NODES.map((n) => n.id);

function parse(mode: Mode, s: Source): ParseResult {
  return parseGraphText(s.text, {
    direcionado: s.direcionado,
    ponderado: s.ponderado,
    fixedVertices: mode === 'map' ? MAP_IDS : undefined,
  });
}

const graphKey = (p: ParseResult) => JSON.stringify(toPayload(p.graph));

const initialSources = (): Record<Mode, Source> => ({
  map: { text: PROPOSAL_TEXT, direcionado: false, ponderado: true },
  custom: { text: PROPOSAL_TEXT, direcionado: false, ponderado: true },
});

const initialParsed = (sources: Record<Mode, Source>): Record<Mode, ParseResult> => ({
  map: parse('map', sources.map),
  custom: parse('custom', sources.custom),
});

/** Motivo para o botão do algoritmo ficar desabilitado, ou null se pode rodar. */
export function blockReason(algo: Algo, parsed: ParseResult, start: string): string | null {
  if (parsed.graph.vertices.length === 0) return 'Insira um grafo para executar.';
  if (parsed.hasErrors) return 'Corrija os erros do editor antes de executar.';
  if (algo === 'kruskal' && parsed.graph.direcionado) return 'Kruskal trabalha com grafos não direcionados.';
  if (algo === 'dijkstra' && parsed.hasNegative) return 'Dijkstra não aceita pesos negativos.';
  if (algo !== 'kruskal' && !parsed.graph.vertices.includes(start)) return 'Escolha o vértice de início.';
  return null;
}

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem('smartnet-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* localStorage bloqueado: segue o sistema */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

interface State {
  screen: Screen;
  mode: Mode;
  sources: Record<Mode, Source>;
  parsed: Record<Mode, ParseResult>;
  start: string;
  target: string;
  results: Results;
  activeAlgo: Algo | null;
  overlayAll: boolean;
  running: Algo | null;
  error: string | null;
  serverOnline: boolean | null;
  drawerOpen: boolean;
  showMatrix: boolean;
  editorOpen: boolean;
  theme: Theme;
  speed: Speed;
  replayToken: number;
  positions: Record<string, Point>;

  setScreen: (s: Screen) => void;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
  setText: (text: string) => void;
  setSourceFlags: (flags: Partial<Pick<Source, 'direcionado' | 'ponderado'>>) => void;
  loadSource: (mode: Mode, source: Source) => void;
  reparse: () => void;
  clearGraph: () => void;
  copyMapToCustom: () => void;
  setStart: (v: string) => Promise<void>;
  setTarget: (v: string) => void;
  setActiveAlgo: (a: Algo) => void;
  run: (a: Algo) => Promise<void>;
  setOverlayAll: (v: boolean) => void;
  setServerOnline: (v: boolean) => void;
  dismissError: () => void;
  setDrawerOpen: (v: boolean) => void;
  setShowMatrix: (v: boolean) => void;
  setEditorOpen: (v: boolean) => void;
  toggleTheme: () => void;
  setSpeed: (s: Speed) => void;
  replay: () => void;
  setPositions: (p: Record<string, Point>) => void;
  movePosition: (id: string, p: Point) => void;
  finish: () => void;
}

/** Depois de mudar o grafo: mantém início/destino válidos e descarta resultados velhos. */
function afterGraphChange(state: State, parsed: Record<Mode, ParseResult>, mode: Mode, forceClear = false): Partial<State> {
  const vs = parsed[mode].graph.vertices;
  const changed = forceClear || graphKey(parsed[mode]) !== graphKey(state.parsed[state.mode]) || mode !== state.mode;
  return {
    parsed,
    start: vs.includes(state.start) ? state.start : (vs[0] ?? ''),
    target: vs.includes(state.target) ? state.target : (vs[vs.length - 1] ?? ''),
    ...(changed ? { results: {}, error: null } : {}),
  };
}

const initial = () => {
  const sources = initialSources();
  const parsed = initialParsed(sources);
  const vs = parsed.map.graph.vertices;
  return {
    screen: 'title' as Screen,
    mode: 'map' as Mode,
    sources,
    parsed,
    start: vs[0] ?? '',
    target: vs[vs.length - 1] ?? '',
    results: {},
    activeAlgo: null,
    overlayAll: false,
    running: null,
    error: null,
    drawerOpen: false,
    showMatrix: false,
    editorOpen: false,
    speed: 1 as Speed,
    replayToken: 0,
    positions: {},
  };
};

export const useGraphStore = create<State>()((set, get) => ({
  ...initial(),
  serverOnline: null,
  theme: readTheme(),

  setScreen: (screen) => set({ screen }),

  setMode: (mode) => {
    const s = get();
    if (mode === s.mode) return;
    set({ ...afterGraphChange(s, s.parsed, mode, true), mode, editorOpen: false });
  },
  toggleMode: () => get().setMode(get().mode === 'map' ? 'custom' : 'map'),

  setText: (text) => set((s) => ({ sources: { ...s.sources, [s.mode]: { ...s.sources[s.mode], text } } })),

  setSourceFlags: (flags) => {
    set((s) => ({ sources: { ...s.sources, [s.mode]: { ...s.sources[s.mode], ...flags } } }));
    get().reparse();
  },

  loadSource: (mode, source) => {
    set((s) => ({ sources: { ...s.sources, [mode]: source } }));
    get().reparse();
  },

  reparse: () => {
    const s = get();
    const next = parse(s.mode, s.sources[s.mode]);
    if (JSON.stringify(next) === JSON.stringify(s.parsed[s.mode])) return;
    set(afterGraphChange(s, { ...s.parsed, [s.mode]: next }, s.mode));
  },

  clearGraph: () => {
    set((s) => ({ sources: { ...s.sources, [s.mode]: { ...s.sources[s.mode], text: '' } } }));
    get().reparse();
  },

  copyMapToCustom: () => {
    const s = get();
    const sources = { ...s.sources, custom: { ...s.sources.map } };
    const parsed = { ...s.parsed, custom: parse('custom', sources.custom) };
    set({ sources, ...afterGraphChange(s, parsed, 'custom', true), mode: 'custom', editorOpen: true });
  },

  setStart: async (start) => {
    const s = get();
    if (start === s.start) return;
    // DFS, BFS e Dijkstra dependem do início: descarta os resultados velhos e roda de novo
    // na API, o ativo por último para ele continuar selecionado. Kruskal não muda.
    const stale = (['dfs', 'bfs', 'dijkstra'] as const).filter((a) => s.results[a]);
    const results = { ...s.results };
    for (const a of stale) delete results[a];
    // Início igual ao destino daria a rota vazia "T a T": inverte os dois.
    set({ start, results, ...(start === s.target ? { target: s.start } : {}) });
    const order = [...stale.filter((a) => a !== s.activeAlgo), ...stale.filter((a) => a === s.activeAlgo)];
    for (const a of order) {
      if (get().start !== start) return; // trocou de novo no meio: a chamada mais nova assume
      await get().run(a);
    }
    // run() troca a aba ativa; devolve a que o usuário estava vendo (ex.: Kruskal).
    if (get().start === start) set({ activeAlgo: s.activeAlgo });
  },
  setTarget: (target) => set({ target }),
  setActiveAlgo: (activeAlgo) => set({ activeAlgo }),

  run: async (algo) => {
    get().reparse();
    const s = get();
    const parsed = s.parsed[s.mode];
    const reason = blockReason(algo, parsed, s.start);
    if (reason) {
      set({ error: reason, activeAlgo: algo });
      return;
    }
    const key = graphKey(parsed);
    set({ running: algo, error: null, activeAlgo: algo });
    try {
      const res = await runAlgorithm(algo, toPayload(parsed.graph), s.start);
      const now = get();
      // Grafo, início ou sessão mudaram durante a requisição: resposta descartada.
      const startChanged = algo !== 'kruskal' && now.start !== s.start;
      if (now.screen !== 'workspace' || graphKey(now.parsed[now.mode]) !== key || startChanged) {
        set({ running: null });
        return;
      }
      set((st) => ({
        results: { ...st.results, [algo]: res.data },
        running: null,
        serverOnline: true,
        replayToken: st.replayToken + 1,
      }));
    } catch (e) {
      const offline = e instanceof ApiError && (e.status === null || e.status >= 500);
      set({ error: e instanceof Error ? e.message : String(e), running: null, ...(offline ? { serverOnline: false } : {}) });
    }
  },

  setOverlayAll: (overlayAll) => set({ overlayAll }),
  setServerOnline: (serverOnline) => set({ serverOnline }),
  dismissError: () => set({ error: null }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setShowMatrix: (showMatrix) => set({ showMatrix }),
  setEditorOpen: (editorOpen) => set({ editorOpen }),

  toggleTheme: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try {
      localStorage.setItem('smartnet-theme', theme);
    } catch {
      /* sem persistência, segue a sessão */
    }
    set({ theme });
  },

  setSpeed: (speed) => set((s) => ({ speed, replayToken: s.replayToken + 1 })),
  replay: () => set((s) => ({ replayToken: s.replayToken + 1 })),

  setPositions: (positions) => set({ positions }),
  movePosition: (id, p) => set((s) => ({ positions: { ...s.positions, [id]: p } })),

  finish: () => set({ ...initial(), screen: 'end', serverOnline: null }),
}));
