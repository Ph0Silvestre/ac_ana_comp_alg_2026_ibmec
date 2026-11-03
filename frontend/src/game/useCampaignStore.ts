import { useEffect } from 'react';
import { create } from 'zustand';
import { useGraphStore, type Attempt } from '../store/useGraphStore';
import { advance, applyAttempt, initialCampaign, retry, soundCue, type CampaignState } from './campaign';
import { playCue, readSoundPref, saveSoundPref, unlockAudio } from './sound';

/*
 * Estado do modo campanha. Fica separado do useGraphStore: o modo livre não
 * importa nada daqui, e a campanha só observa as execuções reais pelo store do grafo.
 */

export type PlayMode = 'livre' | 'campanha';

interface CampaignStore {
  playMode: PlayMode;
  minimized: boolean;
  summaryOpen: boolean;
  campaign: CampaignState;
  /** Sobe a cada nova fala do NPC; reinicia as animações mesmo quando a fala se repete. */
  beat: number;
  /** Efeitos sonoros da campanha. Começa desligado; a escolha fica no localStorage. */
  soundOn: boolean;

  toggleSound: () => void;
  setPlayMode: (m: PlayMode) => void;
  setMinimized: (v: boolean) => void;
  setSummaryOpen: (v: boolean) => void;
  handleAttempt: (a: Attempt) => void;
  tryAgain: () => void;
  next: () => void;
  restart: () => void;
  reset: () => void;
}

export const useCampaignStore = create<CampaignStore>()((set, get) => ({
  playMode: 'livre',
  minimized: false,
  summaryOpen: false,
  campaign: initialCampaign(),
  beat: 0,
  soundOn: readSoundPref(),

  toggleSound: () => {
    const soundOn = !get().soundOn;
    // O clique no botão é o gesto que o navegador exige para liberar o áudio.
    if (soundOn) unlockAudio();
    saveSoundPref(soundOn);
    set({ soundOn });
  },
  // O progresso fica guardado ao voltar para o modo livre; "Reiniciar campanha" zera.
  setPlayMode: (playMode) => {
    if (playMode === 'campanha' && get().soundOn) unlockAudio();
    set({ playMode, minimized: false });
  },
  setMinimized: (minimized) => set({ minimized }),
  setSummaryOpen: (summaryOpen) => set({ summaryOpen }),

  handleAttempt: (a) => {
    if (get().playMode !== 'campanha') return;
    const campaign = applyAttempt(get().campaign, a);
    if (campaign !== get().campaign) set((s) => ({ campaign, minimized: false, beat: s.beat + 1 }));
  },
  tryAgain: () => {
    const campaign = retry(get().campaign);
    if (campaign !== get().campaign) set((s) => ({ campaign, beat: s.beat + 1 }));
  },
  next: () => {
    const campaign = advance(get().campaign);
    set((s) => ({ campaign, summaryOpen: campaign.finished, beat: s.beat + 1 }));
  },
  restart: () =>
    set((s) => ({ campaign: initialCampaign(), summaryOpen: false, minimized: false, playMode: 'campanha', beat: s.beat + 1 })),
  reset: () => set((s) => ({ campaign: initialCampaign(), summaryOpen: false, minimized: false, playMode: 'livre', beat: s.beat + 1 })),
}));

/**
 * Liga a campanha às execuções reais: cada clique do usuário num algoritmo vira uma
 * tentativa avaliada; uma nova execução depois de um erro devolve o NPC ao normal.
 */
export function useMissionController() {
  useEffect(
    () =>
      useGraphStore.subscribe((s, prev) => {
        const c = useCampaignStore.getState();
        if (s.screen === 'end' && prev.screen !== 'end') {
          c.reset();
          return;
        }
        if (c.playMode !== 'campanha') return;
        if (s.running && !prev.running) c.tryAgain();
        if (s.lastAttempt && s.lastAttempt !== prev.lastAttempt) c.handleAttempt(s.lastAttempt);
      }),
    [],
  );
}

/**
 * Toca o efeito de cada mudança da campanha: no máximo um por mudança, só no modo campanha
 * e só com o som ligado. Ao entrar na campanha, o sino acompanha a apresentação da missão.
 */
export function useCampaignSounds() {
  useEffect(
    () =>
      useCampaignStore.subscribe((s, prev) => {
        if (!s.soundOn || s.playMode !== 'campanha') return;
        const entering = prev.playMode !== 'campanha';
        const cue = entering ? (s.campaign.feedback.kind === 'intro' && !s.campaign.finished ? 'missao' : null) : soundCue(prev.campaign, s.campaign);
        if (cue) playCue(cue);
      }),
    [],
  );
}
