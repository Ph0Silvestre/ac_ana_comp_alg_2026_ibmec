import type { Algo } from '../domain/types';

/*
 * Configuração declarativa da campanha. Personagem e falas são fictícios,
 * inventados só para o jogo; não representam declarações reais.
 */

export type Pose = 'neutro' | 'falando' | 'apontando' | 'bravo';

export const NPC = {
  name: 'Presidente Xi',
  role: 'Seu superior',
  disclaimer: 'Personagem fictício de jogo. As falas foram inventadas para a campanha.',
};

export const POSE_SRC: Record<Pose, string> = {
  neutro: '/assets/npc/xi/xi-neutro.png',
  falando: '/assets/npc/xi/xi-falando.png',
  apontando: '/assets/npc/xi/xi-apontando.png',
  bravo: '/assets/npc/xi/xi-bravo.png',
};

export const POSE_LABEL: Record<Pose, string> = {
  neutro: 'expressão neutra',
  falando: 'falando',
  apontando: 'apontando',
  bravo: 'bravo',
};

export interface Mission {
  id: string;
  number: number;
  title: string;
  algo: Algo;
  /** Vértice de início exigido. null quando o algoritmo não usa início (Kruskal). */
  start: string | null;
  /** Destino exigido. null quando não há destino (Kruskal). */
  target: string | null;
  pose: Pose;
  intro: string;
  objective: string;
  success: string;
  error: string;
  /** Conceito revisado na tela de conclusão. */
  concept: string;
}

export const MISSIONS: Mission[] = [
  {
    id: 'rota-emergencia',
    number: 1,
    title: 'Operação Rota de Emergência',
    algo: 'dijkstra',
    start: 'A',
    target: 'F',
    pose: 'falando',
    intro:
      'Engenheiro! Temos uma emergência em nossa rede de transporte. Preciso que encontre a rota de menor custo entre os distritos A e F. Utilize o algoritmo de Dijkstra!',
    objective: 'Encontrar o caminho com a menor soma dos pesos das arestas entre A e F.',
    success: 'Excelente trabalho, engenheiro! A rota de menor custo foi identificada. Mas ainda temos muito trabalho pela frente!',
    error:
      'Engenheiro! Esse não é o procedimento solicitado! Precisamos minimizar o custo total da rota. Escolha o algoritmo adequado!',
    concept:
      'Minimiza a soma dos pesos. Usa uma fila de prioridade (heap) para sempre expandir o vértice de menor distância acumulada, em O((V + E) log V).',
  },
  {
    id: 'conexao-rapida',
    number: 2,
    title: 'Operação Conexão Rápida',
    algo: 'bfs',
    start: 'A',
    target: 'F',
    pose: 'apontando',
    intro:
      'Engenheiro! Agora temos outra prioridade. Quero uma rota entre A e F utilizando o menor número possível de conexões. Não estou preocupado com os pesos das estradas. Execute BFS!',
    objective: 'Encontrar o caminho com o menor número de arestas entre A e F, ignorando os pesos.',
    // Usada quando a rota da BFS difere da rota de Dijkstra. Ver successLine em evaluate.ts.
    success:
      'Muito bem! Você encontrou uma rota com o menor número de conexões. Observe como ela pode ser diferente da rota encontrada por Dijkstra!',
    error:
      'Você não compreendeu minha ordem, engenheiro! Desta vez quero minimizar o número de conexões, não a soma dos pesos!',
    concept:
      'Visita o grafo em níveis com uma fila FIFO. O caminho na árvore da BFS tem o menor número de arestas, sem olhar os pesos, em O(V + E).',
  },
  {
    id: 'exploracao-territorial',
    number: 3,
    title: 'Operação Exploração Territorial',
    algo: 'dfs',
    start: 'A',
    target: 'F',
    pose: 'falando',
    intro:
      'Engenheiro, precisamos investigar as conexões da nossa infraestrutura. Explore a rede em profundidade a partir de A e verifique se conseguimos alcançar o destino F. Utilize DFS!',
    objective: 'Fazer uma busca em profundidade a partir de A e verificar se F é alcançável.',
    success:
      'Excelente! A exploração foi concluída. Lembre-se: encontrar um caminho não significa necessariamente encontrar o mais curto!',
    error: 'Engenheiro! Eu solicitei uma exploração em profundidade. Reveja o algoritmo antes de continuar!',
    concept:
      'Aprofunda por um ramo antes de voltar. Responde se o destino é alcançável, mas o caminho na árvore da DFS não é necessariamente o mais curto. O(V + E).',
  },
  {
    id: 'grande-rede',
    number: 4,
    title: 'Operação Grande Rede de Hong Kong',
    algo: 'kruskal',
    start: null,
    target: null,
    pose: 'apontando',
    intro:
      'Engenheiro! Nossa missão final é conectar todos os distritos da rede com o menor custo total possível. Precisamos de uma infraestrutura eficiente. Execute Kruskal!',
    objective: 'Construir a árvore geradora mínima do grafo, ligando todos os distritos.',
    success:
      'Extraordinário, engenheiro! Você concluiu todas as operações. Nossa rede está conectada com custo mínimo. Missão cumprida!',
    error:
      'Engenheiro! Não pedi uma rota entre dois distritos. Quero conectar toda a rede com o menor custo total! Utilize o método correto!',
    concept:
      'Ordena as arestas por peso e aceita as que não fecham ciclo (union-find). Gera a árvore geradora mínima, que liga todos os vértices, e não uma rota entre dois. O(E log E).',
  },
];

/** Fala de sucesso da missão 2 quando a rota da BFS é a mesma de Dijkstra (caso de A a F no grafo da proposta). */
export const BFS_SAME_ROUTE_SUCCESS =
  'Muito bem! Você encontrou a rota com o menor número de conexões. Repare que, neste grafo, ela coincide com a rota de Dijkstra: a ligação direta entre A e F já é a de menor custo. Em outros pares de distritos, as duas rotas podem ser diferentes!';
