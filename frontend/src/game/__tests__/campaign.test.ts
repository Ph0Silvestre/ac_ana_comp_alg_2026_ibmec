import { describe, expect, it } from 'vitest';
import type { AlgoResponse } from '../../api/client';
import { HK_GRAPH_PAYLOAD } from '../../data/hongKongGraph';
import type { Algo, GraphPayload } from '../../domain/types';
import type { Attempt } from '../../store/useGraphStore';
import { advance, applyAttempt, evaluateAttempt, initialCampaign, retry, type CampaignState } from '../campaign';
import { BFS_SAME_ROUTE_SUCCESS, MISSIONS } from '../missions';
import graphStoreSource from '../../store/useGraphStore.ts?raw';

// Saídas reais do backend/grafo.py para o grafo da proposta com início em A.
const RESPONSES: Record<Algo, AlgoResponse> = {
  dfs: { algo: 'dfs', data: { algoritmo: 'DFS', ponto_partida: 'A', caminho_percorrido: ['A', 'B', 'C', 'E', 'D', 'T', 'F', 'O'] } },
  bfs: { algo: 'bfs', data: { algoritmo: 'BFS', ponto_partida: 'A', fila_execucao: ['A', 'B', 'D', 'F', 'O', 'C', 'E', 'T'] } },
  dijkstra: {
    algo: 'dijkstra',
    data: {
      algoritmo: 'Dijkstra',
      ponto_partida: 'A',
      resultados: [
        { destino: 'O', distancia_minima: 2, veio_de: 'A' },
        { destino: 'A', distancia_minima: 0, veio_de: null },
        { destino: 'B', distancia_minima: 2, veio_de: 'A' },
        { destino: 'C', distancia_minima: 3, veio_de: 'B' },
        { destino: 'D', distancia_minima: 6, veio_de: 'B' },
        { destino: 'E', distancia_minima: 5, veio_de: 'B' },
        { destino: 'F', distancia_minima: 12, veio_de: 'A' },
        { destino: 'T', distancia_minima: 11, veio_de: 'D' },
      ],
    },
  },
  kruskal: {
    algo: 'kruskal',
    data: {
      algoritmo: 'Kruskal',
      custo_total_fibra: 20,
      arestas_selecionadas: [
        { origem: 'B', destino: 'C', peso: 1 },
        { origem: 'A', destino: 'B', peso: 2 },
        { origem: 'O', destino: 'A', peso: 2 },
        { origem: 'B', destino: 'E', peso: 3 },
        { origem: 'F', destino: 'T', peso: 3 },
        { origem: 'B', destino: 'D', peso: 4 },
        { origem: 'D', destino: 'T', peso: 5 },
      ],
    },
  },
};

let seq = 0;
function ok(algo: Algo, start = 'A', target = 'F', graph: GraphPayload = HK_GRAPH_PAYLOAD, response = RESPONSES[algo]): Attempt {
  return { seq: ++seq, algo, start, target, ok: true, response, graph };
}
function failed(algo: Algo, message: string): Attempt {
  return { seq: ++seq, algo, start: 'A', target: 'F', ok: false, message };
}

/** Joga até a missão `index` (0 a 3) concluindo as anteriores com execuções válidas. */
function playUntil(index: number): CampaignState {
  let s = initialCampaign();
  for (let i = 0; i < index; i++) s = advance(applyAttempt(s, ok(MISSIONS[i].algo)));
  return s;
}

describe('missões da campanha', () => {
  it('começa na missão 1 ativa e as outras pendentes', () => {
    const s = initialCampaign();
    expect(s.index).toBe(0);
    expect(s.statuses).toEqual(['ativa', 'pendente', 'pendente', 'pendente']);
    expect(s.feedback.pose).toBe('falando');
    expect(s.feedback.text).toBe(MISSIONS[0].intro);
  });

  it('algoritmo errado não conclui a missão e deixa o NPC bravo', () => {
    for (const wrong of ['bfs', 'dfs', 'kruskal'] as const) {
      const s = applyAttempt(initialCampaign(), ok(wrong));
      expect(s.statuses[0]).toBe('erro');
      expect(s.feedback.pose).toBe('bravo');
      expect(s.feedback.text).toBe(MISSIONS[0].error);
      expect(s.evidence[0]).toBeNull();
    }
  });

  it('algoritmo certo com início ou destino errado não gera sucesso', () => {
    const wrongStart = applyAttempt(initialCampaign(), ok('dijkstra', 'O', 'F'));
    expect(wrongStart.statuses[0]).toBe('erro');
    expect(wrongStart.feedback.pose).toBe('bravo');
    const wrongTarget = applyAttempt(initialCampaign(), ok('dijkstra', 'A', 'T'));
    expect(wrongTarget.statuses[0]).toBe('erro');
    expect(wrongTarget.feedback.text).toContain('de A até F');
  });

  it('o jogador corrige uma tentativa errada e conclui', () => {
    let s = applyAttempt(initialCampaign(), ok('bfs'));
    expect(s.statuses[0]).toBe('erro');
    s = retry(s);
    expect(s.statuses[0]).toBe('ativa');
    expect(s.feedback.pose).toBe('neutro');
    s = applyAttempt(s, ok('dijkstra'));
    expect(s.statuses[0]).toBe('concluida');
    expect(s.feedback.text).toBe(MISSIONS[0].success);
  });

  it('não avança antes de uma execução válida', () => {
    const s = applyAttempt(initialCampaign(), ok('kruskal'));
    expect(advance(s)).toBe(s);
    expect(advance(initialCampaign()).index).toBe(0);
  });

  it('progresso avança pelas quatro missões e encerra a campanha', () => {
    let s = initialCampaign();
    for (let i = 0; i < MISSIONS.length; i++) {
      expect(s.index).toBe(i);
      s = applyAttempt(s, ok(MISSIONS[i].algo));
      expect(s.statuses[i]).toBe('concluida');
      s = advance(s);
    }
    expect(s.finished).toBe(true);
    expect(s.statuses).toEqual(['concluida', 'concluida', 'concluida', 'concluida']);
    // Depois de encerrada, novas execuções não mudam nada.
    expect(applyAttempt(s, ok('bfs'))).toBe(s);
  });

  it('missão concluída ignora execuções seguintes até avançar', () => {
    const s = applyAttempt(initialCampaign(), ok('dijkstra'));
    expect(applyAttempt(s, ok('dfs'))).toBe(s);
  });

  it('falha de execução não declara sucesso e não deixa o NPC bravo', () => {
    const s = applyAttempt(initialCampaign(), failed('dijkstra', 'Servidor indisponível.'));
    expect(s.statuses[0]).toBe('erro');
    expect(s.feedback.kind).toBe('falha');
    expect(s.feedback.pose).not.toBe('bravo');
    expect(s.feedback.text).toContain('Servidor indisponível.');
  });
});

describe('avaliação lê o resultado real da API', () => {
  it('Dijkstra: rota A F com custo 12', () => {
    const v = evaluateAttempt(MISSIONS[0], ok('dijkstra'));
    expect(v.kind).toBe('sucesso');
    if (v.kind !== 'sucesso') return;
    expect(v.evidence.route).toEqual(['A', 'F']);
    expect(v.evidence.summary).toContain('custo total 12');
  });

  it('BFS: rota com 1 conexão e fala ajustada quando coincide com Dijkstra', () => {
    const s = playUntil(1);
    const after = applyAttempt(s, ok('bfs'));
    expect(after.evidence[1]?.route).toEqual(['A', 'F']);
    expect(after.feedback.text).toBe(BFS_SAME_ROUTE_SUCCESS);
  });

  it('BFS: fala original quando a rota difere da de Dijkstra', () => {
    const previous = [{ summary: '', route: ['A', 'B', 'D', 'T', 'F'] }];
    const v = evaluateAttempt(MISSIONS[1], ok('bfs'), previous);
    expect(v.kind === 'sucesso' && v.text).toBe(MISSIONS[1].success);
  });

  it('DFS: F alcançável, caminho da árvore não é o mais curto', () => {
    const v = evaluateAttempt(MISSIONS[2], ok('dfs'));
    expect(v.kind).toBe('sucesso');
    if (v.kind !== 'sucesso') return;
    expect(v.evidence.route).toEqual(['A', 'B', 'C', 'E', 'D', 'T', 'F']);
    expect(v.evidence.summary).toContain('7º distrito');
  });

  it('Kruskal não exige início nem destino', () => {
    const s = playUntil(3);
    const after = applyAttempt(s, ok('kruskal', 'O', 'T'));
    expect(after.statuses[3]).toBe('concluida');
    expect(after.evidence[3]?.summary).toContain('custo total 20');
  });

  it('Kruskal em grafo desconexo não conclui a missão', () => {
    const graph: GraphPayload = { direcionado: false, vertices: ['A', 'B', 'X'], arestas: [{ origem: 'A', destino: 'B', peso: 1 }] };
    const response: AlgoResponse = {
      algo: 'kruskal',
      data: { algoritmo: 'Kruskal', custo_total_fibra: 1, arestas_selecionadas: [{ origem: 'A', destino: 'B', peso: 1 }] },
    };
    const v = evaluateAttempt(MISSIONS[3], ok('kruskal', 'A', 'F', graph, response));
    expect(v.kind).toBe('falha');
  });

  it('destino inalcançável (grafo editado) não conclui a missão', () => {
    const graph: GraphPayload = { direcionado: false, vertices: ['A', 'B', 'F'], arestas: [{ origem: 'A', destino: 'B', peso: 1 }] };
    const dij: AlgoResponse = {
      algo: 'dijkstra',
      data: {
        algoritmo: 'Dijkstra',
        ponto_partida: 'A',
        resultados: [
          { destino: 'A', distancia_minima: 0, veio_de: null },
          { destino: 'B', distancia_minima: 1, veio_de: 'A' },
          { destino: 'F', distancia_minima: 'Inalcançável', veio_de: null },
        ],
      },
    };
    expect(evaluateAttempt(MISSIONS[0], ok('dijkstra', 'A', 'F', graph, dij)).kind).toBe('falha');
    const bfs: AlgoResponse = { algo: 'bfs', data: { algoritmo: 'BFS', ponto_partida: 'A', fila_execucao: ['A', 'B'] } };
    expect(evaluateAttempt(MISSIONS[1], ok('bfs', 'A', 'F', graph, bfs)).kind).toBe('falha');
  });

  it('grafo sem os vértices da missão: tentativa bloqueada vira falha, sem sucesso', () => {
    const s = applyAttempt(initialCampaign(), failed('dijkstra', 'Escolha o vértice de início.'));
    expect(s.statuses[0]).toBe('erro');
    expect(s.evidence[0]).toBeNull();
  });
});

describe('modo livre', () => {
  it('o store do grafo não depende do sistema de missões', () => {
    expect(graphStoreSource).not.toMatch(/from ['"].*game\//);
  });
});
