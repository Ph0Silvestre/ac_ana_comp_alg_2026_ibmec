import { buildAdjacency } from '../domain/adjacency';
import { formatWeight, plural } from '../domain/format';
import { bfsTree, dfsParents, dijkstraPath, type Parents } from '../domain/trees';
import { ALGO_LABEL } from '../domain/types';
import type { Attempt } from '../store/useGraphStore';
import { BFS_SAME_ROUTE_SUCCESS, MISSIONS, type Mission, type Pose } from './missions';

/*
 * Regras da campanha como funções puras. Nada aqui roda algoritmo: a avaliação
 * só lê a resposta da API guardada na tentativa (e reconstrói caminhos como trees.ts).
 */

export type MissionStatus = 'pendente' | 'ativa' | 'concluida' | 'erro';

/** O que a execução real devolveu, mostrado no painel e no resumo final. */
export interface Evidence {
  summary: string;
  /** Rota de início a destino, quando a missão tem destino. */
  route?: string[];
}

export type FeedbackKind = 'intro' | 'aguardando' | 'sucesso' | 'erro' | 'falha';

export interface Feedback {
  kind: FeedbackKind;
  pose: Pose;
  text: string;
}

export type Verdict =
  | { kind: 'sucesso'; text: string; evidence: Evidence }
  | { kind: 'algoritmo-errado'; text: string }
  | { kind: 'parametros'; text: string }
  | { kind: 'falha'; text: string };

export interface CampaignState {
  index: number;
  statuses: MissionStatus[];
  evidence: (Evidence | null)[];
  feedback: Feedback;
  finished: boolean;
}

const introFeedback = (m: Mission): Feedback => ({ kind: 'intro', pose: m.pose, text: m.intro });

export function initialCampaign(missions: Mission[] = MISSIONS): CampaignState {
  return {
    index: 0,
    statuses: missions.map((_, i) => (i === 0 ? 'ativa' : 'pendente')),
    evidence: missions.map(() => null),
    feedback: introFeedback(missions[0]),
    finished: false,
  };
}

function pathFromParents(parent: Parents, start: string, target: string): string[] | null {
  if (!parent.has(target)) return null;
  const path = [target];
  let cur = target;
  while (cur !== start) {
    const p = parent.get(cur) ?? null;
    if (p === null || path.length > parent.size) return null;
    path.push(p);
    cur = p;
  }
  return path.reverse();
}

const conexoes = (route: string[]) => plural(route.length - 1, 'conexão', 'conexões');

/** Julga uma tentativa contra a missão. `previous` são as evidências das missões já concluídas. */
export function evaluateAttempt(mission: Mission, attempt: Attempt, previous: (Evidence | null)[] = []): Verdict {
  if (attempt.algo !== mission.algo) return { kind: 'algoritmo-errado', text: mission.error };

  const wrongStart = mission.start !== null && attempt.start !== mission.start;
  const wrongTarget = mission.target !== null && attempt.target !== mission.target;
  if (wrongStart || wrongTarget) {
    return {
      kind: 'parametros',
      text: `O algoritmo está certo, engenheiro, mas a ordem era de ${mission.start} até ${mission.target}. Você usou início ${attempt.start || 'vazio'} e destino ${attempt.target || 'vazio'}. Ajuste a barra de algoritmos e execute de novo!`,
    };
  }

  if (!attempt.ok) return { kind: 'falha', text: `A execução não foi concluída: ${attempt.message} Corrija e tente de novo.` };

  const { response, graph } = attempt;
  const start = mission.start ?? '';
  const target = mission.target ?? '';
  const unreachable = (): Verdict => ({
    kind: 'falha',
    text: `O servidor respondeu, mas ${target} não é alcançável a partir de ${start} neste grafo. Sem rota, a missão não pode ser cumprida. Confira as arestas do grafo.`,
  });

  switch (response.algo) {
    case 'dijkstra': {
      const route = dijkstraPath(response.data.resultados, start, target);
      const row = response.data.resultados.find((r) => r.destino === target);
      if (!route || !row || row.distancia_minima === 'Inalcançável') return unreachable();
      return {
        kind: 'sucesso',
        text: mission.success,
        evidence: { route, summary: `Rota de menor custo com custo total ${formatWeight(row.distancia_minima)} e ${conexoes(route)}.` },
      };
    }
    case 'bfs': {
      const order = response.data.fila_execucao;
      if (!order.includes(target)) return unreachable();
      const route = pathFromParents(bfsTree(order, buildAdjacency(graph)).parent, start, target);
      if (!route) return unreachable();
      const dijkstraRoute = previous.find((e, i) => MISSIONS[i]?.algo === 'dijkstra' && e?.route)?.route;
      const same = dijkstraRoute !== undefined && dijkstraRoute.join() === route.join();
      return {
        kind: 'sucesso',
        text: same ? BFS_SAME_ROUTE_SUCCESS : mission.success,
        evidence: { route, summary: `Rota com o menor número de arestas: ${conexoes(route)}.` },
      };
    }
    case 'dfs': {
      const order = response.data.caminho_percorrido;
      const pos = order.indexOf(target);
      if (pos < 0) return unreachable();
      const route = pathFromParents(dfsParents(order, buildAdjacency(graph)), start, target);
      if (!route) return unreachable();
      return {
        kind: 'sucesso',
        text: mission.success,
        evidence: {
          route,
          summary: `${target} é alcançável: foi o ${pos + 1}º distrito visitado. Caminho na árvore da DFS com ${conexoes(route)}.`,
        },
      };
    }
    case 'kruskal': {
      const v = graph.vertices.length;
      const chosen = response.data.arestas_selecionadas.length;
      if (v === 0 || chosen < v - 1) {
        return {
          kind: 'falha',
          text: `O Kruskal rodou, mas o grafo é desconexo: ligar ${v} distritos exige ${v - 1} arestas e só ${chosen} foram possíveis. O resultado é uma floresta geradora mínima, não uma rede única. Conecte todos os distritos e tente de novo.`,
        };
      }
      return {
        kind: 'sucesso',
        text: mission.success,
        evidence: {
          summary: `${plural(chosen, 'aresta liga', 'arestas ligam')} os ${v} distritos com custo total ${formatWeight(response.data.custo_total_fibra)}.`,
        },
      };
    }
  }
}

/** Aplica uma tentativa ao estado. Missão já concluída ou campanha encerrada: nada muda. */
export function applyAttempt(state: CampaignState, attempt: Attempt, missions: Mission[] = MISSIONS): CampaignState {
  const mission = missions[state.index];
  if (state.finished || !mission || state.statuses[state.index] === 'concluida') return state;

  const verdict = evaluateAttempt(mission, attempt, state.evidence);
  const statuses = [...state.statuses];
  if (verdict.kind === 'sucesso') {
    statuses[state.index] = 'concluida';
    const evidence = [...state.evidence];
    evidence[state.index] = verdict.evidence;
    return { ...state, statuses, evidence, feedback: { kind: 'sucesso', pose: 'falando', text: verdict.text } };
  }
  statuses[state.index] = 'erro';
  // Algoritmo ou parâmetros errados são decisão do jogador: NPC bravo. Falha de execução não é culpa dele.
  const angry = verdict.kind === 'algoritmo-errado' || verdict.kind === 'parametros';
  return { ...state, statuses, feedback: { kind: angry ? 'erro' : 'falha', pose: angry ? 'bravo' : 'neutro', text: verdict.text } };
}

/** Jogador tentou de novo: sai do estado de erro e o NPC volta ao normal. */
export function retry(state: CampaignState, missions: Mission[] = MISSIONS): CampaignState {
  if (state.finished || state.statuses[state.index] !== 'erro') return state;
  const statuses = [...state.statuses];
  statuses[state.index] = 'ativa';
  return { ...state, statuses, feedback: { kind: 'aguardando', pose: 'neutro', text: retryLine(missions[state.index]) } };
}

function retryLine(m: Mission): string {
  const params = m.start ? ` de ${m.start} até ${m.target}` : '';
  return `Estou acompanhando, engenheiro. Execute ${ALGO_LABEL[m.algo]}${params} e me mostre o resultado.`;
}

/** Avança só depois de uma execução válida. Depois da última, encerra a campanha. */
export function advance(state: CampaignState, missions: Mission[] = MISSIONS): CampaignState {
  if (state.statuses[state.index] !== 'concluida') return state;
  const next = state.index + 1;
  if (next >= missions.length) return { ...state, finished: true };
  const statuses = [...state.statuses];
  statuses[next] = 'ativa';
  return { ...state, index: next, statuses, feedback: introFeedback(missions[next]) };
}
