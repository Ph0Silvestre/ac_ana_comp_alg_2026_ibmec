import type { SoundCue } from './campaign';

/*
 * Efeitos sonoros da campanha, sintetizados com a Web Audio API: nenhum arquivo,
 * nenhuma biblioteca. Um único AudioContext, criado no primeiro clique (política de
 * autoplay dos navegadores), um volume mestre moderado e um compressor para segurar picos.
 * Cada efeito novo encerra o anterior com um fade curto: nunca dois ao mesmo tempo.
 */

const MASTER_VOLUME = 0.45;
/** O mesmo efeito não se repete em menos que isso (cliques em sequência). */
const SAME_CUE_GAP_MS = 400;
const FADE_OUT = 0.06;

/** Os sons da campanha mais o gongo da tela inicial. */
export type Effect = SoundCue | 'gongo';

type Bus = { gain: GainNode; end: number };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let current: Bus | null = null;
let last: { cue: Effect; at: number } | null = null;

function audioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Cria/retoma o contexto de áudio. Chamar dentro de um clique (ligar o som, jogar a campanha);
 * depois disso o navegador permite tocar mesmo quando o som vem de uma resposta da API.
 */
export function unlockAudio(): void {
  const Ctor = audioContextClass();
  if (!Ctor) return;
  try {
    if (!ctx) {
      ctx = new Ctor();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -10;
      compressor.ratio.value = 3;
      master = ctx.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(compressor).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null; // sem áudio no navegador: a campanha segue em silêncio
  }
}

export function playCue(cue: Effect): void {
  const now = performance.now();
  if (last && last.cue === cue && now - last.at < SAME_CUE_GAP_MS) return;
  unlockAudio();
  if (!ctx || !master || ctx.state === 'closed') return;
  last = { cue, at: now };

  const t = ctx.currentTime + 0.02;
  // Corta o efeito que ainda estiver soando.
  if (current && current.end > t) {
    current.gain.gain.cancelScheduledValues(t);
    current.gain.gain.setValueAtTime(current.gain.gain.value, t);
    current.gain.gain.linearRampToValueAtTime(0, t + FADE_OUT);
  }
  const bus = ctx.createGain();
  bus.connect(master);
  const start = current && current.end > t ? t + FADE_OUT : t;
  const end = SYNTHS[cue](ctx, bus, start);
  current = { gain: bus, end };
  // Libera os nós depois que o efeito termina.
  window.setTimeout(() => bus.disconnect(), (end - ctx.currentTime + 0.5) * 1000);
}

type Synth = (ctx: AudioContext, out: AudioNode, t: number) => number;

/** Envelope percussivo: ataque curto e queda exponencial até silêncio. */
function envelope(param: AudioParam, t: number, attack: number, peak: number, decay: number) {
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(peak, t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(ctx: AudioContext, out: AudioNode, type: OscillatorType, freq: number, t: number, attack: number, peak: number, decay: number, detune = 0) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  envelope(g.gain, t, attack, peak, decay);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + attack + decay + 0.05);
}

/** Sino cerimonial grave: parciais inarmônicas de sino, as agudas somem antes. ~0,6 s */
const bell: Synth = (ctx, out, t) => {
  const f = 196; // Sol 3
  const partials: [number, number][] = [
    [1, 0.5],
    [2, 0.22],
    [2.4, 0.16],
    [3, 0.1],
    [4.07, 0.06],
    [5.4, 0.035],
  ];
  partials.forEach(([ratio, amp], i) => tone(ctx, out, 'sine', f * ratio, t, 0.006, amp, 0.6 - i * 0.07));
  return t + 0.62;
};

/** Três notas ascendentes (Dó, Mi, Sol) com timbre suave. ~0,8 s */
const success: Synth = (ctx, out, t) => {
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const at = t + i * 0.13;
    const decay = i === 2 ? 0.52 : 0.3;
    tone(ctx, out, 'triangle', f, at, 0.01, 0.32, decay);
    tone(ctx, out, 'sine', f * 2, at, 0.01, 0.06, decay * 0.6);
  });
  return t + 0.8;
};

/** Duas notas graves, secas e descendentes (Sol 2, Ré 2), com o agudo filtrado. ~0,5 s */
const reprimand: Synth = (ctx, out, t) => {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1000;
  filter.Q.value = 0.7;
  filter.connect(out);
  [98, 73.42].forEach((f, i) => {
    const at = t + i * 0.22;
    tone(ctx, filter, 'square', f, at, 0.004, 0.42, 0.2);
    tone(ctx, filter, 'sine', f, at, 0.004, 0.35, 0.22);
  });
  return t + 0.5;
};

/** Voz de metal: duas serras levemente desafinadas com filtro que abre no ataque. */
function brass(ctx: AudioContext, out: AudioNode, freq: number, t: number, length: number, peak = 0.16) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(500, t);
  filter.frequency.exponentialRampToValueAtTime(2600, t + 0.05);
  filter.frequency.exponentialRampToValueAtTime(1300, t + Math.min(0.3, length));
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.035);
  g.gain.setValueAtTime(peak * 0.8, t + Math.max(0.06, length - 0.12));
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  filter.connect(g).connect(out);
  for (const detune of [-6, 6]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }
}

/** Tímpano: seno grave com queda rápida de afinação. */
function timpani(ctx: AudioContext, out: AudioNode, freq: number, t: number) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 1.5, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
  envelope(g.gain, t, 0.005, 0.5, 0.5);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.6);
}

/** Fanfarra curta em Dó maior: chamada em tercinas, resposta e acorde final com tímpano. ~2,7 s */
const fanfare: Synth = (ctx, out, t) => {
  const G4 = 392, C5 = 523.25, E5 = 659.25, G5 = 783.99, C4 = 261.63, E4 = 329.63;
  timpani(ctx, out, 65.41, t);
  brass(ctx, out, G4, t, 0.15);
  brass(ctx, out, G4, t + 0.17, 0.15);
  brass(ctx, out, G4, t + 0.34, 0.15);
  brass(ctx, out, C5, t + 0.52, 0.5);
  brass(ctx, out, E5, t + 1.06, 0.18);
  brass(ctx, out, G5, t + 1.26, 0.3);
  const chord = t + 1.62;
  timpani(ctx, out, 65.41, chord);
  for (const f of [C4, E4, G4, C5]) brass(ctx, out, f, chord, 1.05, 0.09);
  return chord + 1.1;
};

/**
 * Gongo chinês: batida de baqueta (ruído filtrado), parciais inarmônicas graves com
 * batimento e as agudas que crescem depois do golpe, como o "florescer" de um gongo real. ~3 s
 */
const gong: Synth = (ctx, out, t) => {
  const f = 82.4; // Mi 1
  const DUR = 3;

  // Golpe da baqueta
  const len = Math.floor(ctx.sampleRate * 0.08);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const thump = ctx.createBiquadFilter();
  thump.type = 'lowpass';
  thump.frequency.value = 900;
  const ng = ctx.createGain();
  envelope(ng.gain, t, 0.002, 0.5, 0.12);
  noise.connect(thump).connect(ng).connect(out);
  noise.start(t);

  const partials: [number, number, number][] = [
    // razão, amplitude, tempo até o pico (as agudas florescem depois)
    [1, 0.34, 0.01],
    [1.48, 0.22, 0.02],
    [2.09, 0.16, 0.06],
    [2.63, 0.12, 0.12],
    [3.35, 0.09, 0.2],
    [4.2, 0.07, 0.28],
    [5.1, 0.05, 0.34],
    [6.6, 0.035, 0.4],
  ];
  partials.forEach(([ratio, amp, rise], i) => {
    const freq = f * ratio;
    for (const detune of [0, 4]) {
      // Par levemente desafinado: o batimento dá o tremor do metal.
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.detune.value = detune;
      // A batida sobe a afinação por um instante e ela assenta.
      osc.frequency.setValueAtTime(freq * 1.02, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.35);
      const peak = detune ? amp * 0.5 : amp;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + rise + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + DUR - i * 0.15);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + DUR + 0.05);
    }
  });
  return t + DUR;
};

const SYNTHS: Record<Effect, Synth> = {
  gongo: gong,
  missao: bell,
  sucesso: success,
  repreensao: reprimand,
  fanfarra: fanfare,
};

const STORAGE_KEY = 'smartnet-sound';

/** Preferência do som. Começa desligado; localStorage bloqueado não quebra nada. */
export function readSoundPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function saveSoundPref(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* sem persistência, vale só para a sessão */
  }
}
