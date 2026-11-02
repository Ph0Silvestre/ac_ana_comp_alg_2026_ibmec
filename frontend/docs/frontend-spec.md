# SmartNet Analyzer: especificação do front-end

Documento de referência para construir o front. O `CLAUDE.md` na raiz resume as regras; aqui está o detalhe.

**Prazo:** o código precisa estar no GitHub antes do e-mail de entrega (03/11/2026, 23h59). Construa por fases (seção 10) e faça commit ao fim de cada uma.

---

## 1. Contexto

- Disciplina: Análise e Complexidade de Algoritmos (IBM3121), 2026.2. Prof. Cassius Figueiredo. Engenharia de Computação/Software, Ibmec.
- Backend: FastAPI em `backend/`, lista de adjacência, **não será alterado**. O front se adapta ao que existe.
- O professor vai avaliar com um grafo inédito na hora. A entrada de grafo precisa ser rápida e à prova de erro.

### Critérios de avaliação que o front afeta

| Critério | Peso | O que o front precisa garantir |
|---|---|---|
| Correção algorítmica | 40% | Mostrar exatamente o que a API devolveu, sem recalcular nada no navegador |
| Usabilidade e requisitos | 30% | Inserção de grafo, visualização da estrutura, botões dos 4 algoritmos, resultados em texto/tabela, botão "Finalizar aplicação" |
| Domínio da complexidade | 20% | Painel da estrutura com comparação lista × matriz ajuda na defesa |
| Apresentação | 10% | Fluidez: atalhos de teclado, grafo da proposta pré-carregado |

### Checklist de requisitos obrigatórios (da proposta)

- [ ] Inserir grafo: direcionado e não direcionado, com e sem peso
- [ ] Área que mostra como o grafo está armazenado (lista de adjacência)
- [ ] Botões: DFS, BFS, Dijkstra, Kruskal
- [ ] Resultado em texto/tabela: árvore do DFS, fila do BFS, distâncias do Dijkstra, arestas + custo total do Kruskal
- [ ] Loop interativo: apagar grafo, inserir outro, rodar quantos algoritmos quiser
- [ ] Botão "Finalizar aplicação"
- [ ] Diferencial: desenho gráfico do grafo e dos resultados

---

## 2. Stack

- Vite + React + TypeScript
- `d3-geo` (projeção do mapa de HK), `d3-force` (layout automático de grafos do professor)
- `motion` (antigo Framer Motion) para transições e desenho de rotas
- `zustand` para estado global
- Fontes via `@fontsource/overpass` e `@fontsource/noto-sans-tc` (embutidas, nada de CDN)
- `vitest` para testes do parser e da reconstrução das árvores
- **Tudo offline.** Nenhuma requisição a CDN, Google Fonts ou tiles de mapa.

Sem Tailwind e sem biblioteca de componentes: CSS Modules + variáveis CSS (tokens na seção 7). Isso é o que evita a "cara de IA".

### Conexão com o backend

Use o **proxy do Vite** em vez de depender do CORS:

```ts
// vite.config.ts
server: {
  port: 5173,
  strictPort: true,
  proxy: {
    '/api': 'http://127.0.0.1:8000',
    '/status': 'http://127.0.0.1:8000',
  },
}
```

Motivo: o CORS do backend só aceita `http://localhost:5173`. Se alguém abrir `http://127.0.0.1:5173`, tudo quebra. Com proxy, o problema desaparece.

---

## 3. Contrato da API (como está hoje)

| Método | Rota | Corpo / resposta |
|---|---|---|
| GET | `/status` | `{ status }` |
| POST | `/api/iniciar-grafo` | corpo `{ direcionado, vertices: string[], arestas: {origem, destino, peso}[] }` → `{ mensagem, total_vertices, total_arestas, direcionado }` |
| GET | `/api/dfs/{v}` | `{ algoritmo, ponto_partida, caminho_percorrido: string[] }` |
| GET | `/api/bfs/{v}` | `{ algoritmo, ponto_partida, fila_execucao: string[] }` |
| GET | `/api/dijkstra/{v}` | `{ algoritmo, ponto_partida, resultados: {destino, distancia_minima: number \| "Inalcançável", veio_de: string \| null}[] }` |
| GET | `/api/kruskal` | `{ algoritmo, custo_total_fibra: number, arestas_selecionadas: {origem, destino, peso}[] }` |

Erros: `400` (nenhum grafo carregado) e `404` (vértice não existe) com `{ detail }`. Mostrar o `detail` na interface.

### Regras de integração

1. **Sincronizar antes de rodar.** Antes de cada algoritmo, faça `POST /api/iniciar-grafo` com o grafo atual. O backend guarda o grafo numa variável global; reenviar sempre garante que o servidor nunca roda um grafo antigo (inclusive depois de "apagar grafo", que não tem endpoint).
2. **Encode do vértice na URL:** `encodeURIComponent(v)`. Bloquear `/` em nomes de vértice no parser (quebra a rota mesmo codificado).
3. **Pesos:** o backend devolve float (`4.0`). Formatar sem `.0` desnecessário (`4`, `2.5`).
4. **Grafo sem peso:** enviar `peso: 1` e esconder os rótulos de peso no desenho.
5. **Backend fora do ar:** ao abrir, chamar `/status`. Se falhar, mostrar aviso fixo e discreto: "Servidor offline. Rode `uvicorn main:app --reload` na pasta backend." Revalidar a cada 5 s.

### Dados que a API não devolve e como o front resolve

Nada disso recalcula os algoritmos. O front só reconstrói a apresentação a partir da saída da API + estrutura do grafo.

**Estrutura em memória.** Não existe endpoint. O front monta a lista de adjacência com a mesma regra do `Grafo.adicionar_aresta` do backend: para cada vértice cria lista vazia na ordem de `vertices`; para cada aresta, na ordem enviada, adiciona `{destino, peso}` em `origem`; se não direcionado, adiciona também `{origem, peso}` em `destino`. Resultado é idêntico ao que está na memória do servidor. Rótulo na interface: "Lista de adjacência no servidor".

**Árvore do DFS.** A API devolve só a ordem de visita. Reconstrução determinística:

```
pilha = [inicio]; pai = {}
para cada v em ordem[1:]:
    enquanto não existe aresta topo(pilha) -> v: desempilha
    pai[v] = topo(pilha); empilha v
```

Correto porque o DFS do backend é recursivo: quem descobre `v` é o topo da pilha de recursão, e qualquer nó acima dele já foi totalmente explorado (se tivesse aresta para `v`, teria visitado `v` antes). Em grafo direcionado, "existe aresta" respeita a direção.

**Árvore e níveis do BFS.** `pai[v]` = primeiro nó na ordem (antes de `v`) que tem aresta para `v`. Correto porque a fila é FIFO e `v` é descoberto pelo primeiro nó desenfileirado que o enxerga. `nivel[v] = nivel[pai[v]] + 1`.

**Caminho do Dijkstra.** Seguir `veio_de` de trás para frente até o início (como o README do backend descreve).

Os três precisam de teste no `vitest` com os valores esperados da seção 9.

---

## 4. Telas e fluxo

```
[Tela inicial] --Enter--> [Área de trabalho] --Finalizar aplicação--> [Sessão encerrada]
                                  ^                                           |
                                  +-------------- Nova sessão ----------------+
```

### 4.1 Tela inicial

- Fundo: o mapa de Hong Kong (distritos em tom de terra baixo contraste).
- Momento de entrada único: as 14 arestas do grafo da proposta se desenham sobre o mapa como linhas de metrô, uma de cada vez, alternando as quatro cores de algoritmo (~2,5 s no total). Depois disso nada se mexe, exceto o convite para começar.
- Bloco de texto alinhado à esquerda, no canto inferior esquerdo:
  - "SmartNet Analyzer" (display, peso 800)
  - "Análise e Complexidade de Algoritmos (IBM3121)"
  - "Prof. Cassius Figueiredo, Engenharia de Computação/Software, Ibmec 2026.2"
  - Integrantes com matrícula (lista, vinda de `src/data/team.ts` para editar fácil)
- "Pressione Enter para começar" com pulsação de opacidade lenta. Também é um botão clicável. Com `prefers-reduced-motion`, sem pulsação e sem desenho animado (mostrar tudo pronto).

### 4.2 Área de trabalho

```
+--------------------------------------------------------------------------------+
| SmartNet Analyzer    [Mapa de HK | Grafo personalizado]   ◐ tema   Finalizar  |
+------------------+---------------------------------------------+---------------+
| FONTE DO GRAFO   |                                             | RESULTADO     |
|                  |                                             |               |
| (mapa: resumo do |            CANVAS DO GRAFO                  | abas: DFS     |
|  grafo + botão   |   mapa de HK  ou  layout automático         | BFS Dijkstra  |
|  "Editar")       |                                             | Kruskal       |
|                  |                                             |               |
| (personalizado:  |                                             | tabela/árvore |
|  editor de texto |                                             | do resultado  |
|  + toggles)      |                                             |               |
|                  +---------------------------------------------+               |
|                  | Início [O ▾]  ● DFS  ● BFS  ● Dijkstra  ● Kruskal  Destino [T▾]|
+------------------+---------------------------------------------+---------------+
|  Estrutura em memória (gaveta que sobe de baixo, recolhível)                    |
+--------------------------------------------------------------------------------+
```

- O canvas ocupa o centro e é o protagonista. Os painéis laterais são estreitos (~300 px) e podem recolher.
- Barra de algoritmos embaixo do canvas, em formato de legenda de linhas do metrô: cada botão é uma pílula com a faixa de cor da linha à esquerda e o nome. O ativo fica preenchido.
- Seletor "Início" (vértice inicial) obrigatório para DFS, BFS e Dijkstra. Kruskal ignora.
- "Destino" só aparece com Dijkstra ativo: destaca a rota até ele (padrão: último vértice, `T` no grafo da proposta).
- Botão "Apagar grafo" no painel da fonte (com confirmação inline, não `window.confirm`).

### 4.3 Modos de grafo

**Mapa de HK** (padrão ao entrar): grafo da proposta em `src/data/hongKongGraph.ts`. Cada vértice mostra a letra no círculo e, abaixo, o distrito em inglês e chinês (`Sha Tin` / `沙田`). Os 8 distritos usados ficam um tom mais escuro; os outros 10 ficam ao fundo. Hover num distrito sem vértice mostra o nome (opcional).

O usuário pode editar pesos e arestas do grafo do mapa (abre o mesmo editor de texto), mas não pode criar vértices novos nesse modo (não há posição no mapa). Se quiser, muda para "Grafo personalizado" com o conteúdo copiado.

**Grafo personalizado** (para os grafos do professor): canvas neutro com layout automático (`d3-force`, rodado até estabilizar antes de mostrar, sem "dança" na tela). Vértices arrastáveis.

### 4.4 Editor de grafo (modo personalizado)

Entrada principal é texto, porque é o mais rápido para digitar um grafo que veio no papel:

```
# uma aresta por linha: origem destino [peso]
A B 4
A C 2
B D 5
# vértices isolados:
V: X Y
```

- Separadores aceitos: espaço, vírgula, ponto e vírgula, tab.
- Sem peso na linha → peso 1.
- Toggles acima do editor: "Direcionado" e "Com peso". Com peso desligado, pesos digitados são ignorados (aviso discreto).
- Preview ao vivo: o canvas atualiza enquanto digita (debounce de 300 ms).
- Validação com mensagens por linha ("Linha 4: peso precisa ser número"). Erros bloqueiam a execução; avisos não bloqueiam.
  - Erro: peso não numérico, nome com `/`, linha com mais de 3 campos.
  - Aviso: aresta duplicada (mantém a primeira), laço (A A), peso negativo (bloqueia só o Dijkstra).
- Formulário auxiliar "Adicionar aresta" (três campos + botão) que acrescenta uma linha ao texto. Atende quem prefere formulário.
- Importar arquivo `.txt` (mesmo formato) ou `.json` (formato da API).
- Botões de exemplo: "Grafo da proposta", "Exemplo direcionado", "Grafo desconexo".

### 4.5 Painel de resultados

Cada algoritmo tem sua cor de linha. O resultado aparece em texto/tabela **e** desenhado no canvas.

**DFS (auditoria de rotas)**
- Árvore de busca em texto indentado com conectores:
  ```
  O
  └─ A
     └─ B
        └─ C
           └─ E
              └─ D
                 └─ T
                    └─ F
  ```
- Ordem de visita em sequência de "estações".
- Linha de diagnóstico: "8 de 8 bairros alcançados a partir de O" ou "2 bairros não alcançados: X, Y".
- Becos sem saída: vértices sem vizinhos de saída (grau 0 em direcionado; grau 1 em não direcionado também vale mostrar como "ponta de linha").
- Canvas: arestas da árvore desenhadas na ordem da visita.

**BFS (propagação de alerta)**
- Fila de execução final em sequência.
- Tabela por nível: `Nível 0: O` / `Nível 1: A, B, C` / `Nível 2: D, F, E` / `Nível 3: T`.
- Canvas: ondas por nível (todos os vértices de um nível acendem juntos).

**Dijkstra (rota de emergência)**
- Tabela: Destino | Distância | Anterior | Caminho completo. Ordenada por distância. "Inalcançável" em cinza no final.
- Clicar numa linha seleciona aquele destino.
- Canvas: rota do início ao destino selecionado em traço grosso; demais arestas da árvore de caminhos mínimos em traço fino da mesma cor.
- Peso negativo: botão desabilitado com explicação.

**Kruskal (rede de fibra)**
- Tabela das arestas escolhidas na ordem em que o algoritmo aceitou, com custo acumulado.
- Custo total em destaque.
- Se arestas escolhidas < V − 1: "O grafo é desconexo. Resultado é uma floresta geradora mínima."
- Grafo direcionado: botão desabilitado com a explicação "Kruskal trabalha com grafos não direcionados."
- Canvas: arestas aceitas acendendo em sequência, custo acumulado subindo.

### 4.6 Estrutura em memória (gaveta inferior)

- Lista de adjacência no formato de quadro de estação: cada vértice numa linha, vizinhos em pílulas com o nome do vizinho e o peso em um segmento separado da pílula (como `[ B | 2 ]`), na ordem exata da lista.
- Contadores: V, E, entradas na lista.
- Toggle "Comparar com matriz": mostra a matriz V × V equivalente e um resumo de memória ("Lista: 8 vértices + 28 entradas. Matriz: 64 células, 36 vazias.") e as complexidades O(V + E) vs O(V²). Isso é munição para a defesa (20% da nota).

### 4.7 Finalizar aplicação

- Botão no canto superior direito, estilo discreto (contorno), nunca preenchido.
- Clique abre confirmação inline: "Finalizar a aplicação? O grafo atual será descartado." [Finalizar] [Cancelar].
- Ao confirmar: limpa todo o estado, para o polling do `/status` e mostra a tela "Sessão encerrada" (mapa apagado ao fundo, uma frase, botão "Nova sessão" que volta para a tela inicial). Sem créditos.

---

## 5. Animações

Regra geral: movimento só quando responde a uma ação ou mostra um resultado. Uma única sequência automática (tela inicial).

- Rotas: `stroke-dasharray`/`stroke-dashoffset` animado (desenho de linha), 250–400 ms por aresta, easing `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Controles de reprodução do resultado: Repetir, e velocidade 1× / 2× / instantâneo. Sem play/pause passo a passo (não há trace do backend).
- Troca de telas: crossfade de 300 ms + leve escala do mapa.
- Painéis: abrir/fechar com altura animada.
- `prefers-reduced-motion`: tudo instantâneo.

---

## 6. Teclado (sensação de UI de jogo, sem dinâmica de jogo)

| Tecla | Ação |
|---|---|
| Enter | Começar (tela inicial) |
| 1, 2, 3, 4 | DFS, BFS, Dijkstra, Kruskal |
| M | Alternar Mapa de HK / Grafo personalizado |
| E | Abrir/fechar estrutura em memória |
| T | Alternar tema |
| R | Repetir animação do resultado |
| Esc | Fechar gaveta/confirmação |

Atalhos aparecem como pequenos indicadores de tecla nos botões (ex.: um quadradinho "1" ao lado de DFS). Atalhos ficam desligados enquanto o foco está no editor de texto.

---

## 7. Sistema visual

### Conceito

Mapa de metrô de Hong Kong (MTR). Cada algoritmo é uma linha com cor própria. Vértices são estações (círculo branco com contorno grosso). Placas bilíngues inglês/chinês, como nas estações. A memorabilidade está no canvas; todo o resto é quieto e disciplinado.

### Cores

Tema claro, "Plataforma":

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#E9EDEC` | fundo / água |
| `--surface` | `#FFFFFF` | painéis, círculo das estações |
| `--land` | `#D7DEDB` | distritos sem vértice |
| `--land-active` | `#C6D0CC` | distritos com vértice |
| `--line-district` | `#B4BFBA` | contorno dos distritos, divisórias |
| `--ink` | `#1B2430` | texto e contorno de estação |
| `--ink-muted` | `#5B6670` | texto secundário, nomes em chinês |
| `--edge-idle` | `#9AA6A1` | arestas sem destaque |

Tema escuro, "Victoria Harbour":

| Token | Hex |
|---|---|
| `--bg` | `#0C1A24` |
| `--surface` | `#13242F` |
| `--land` | `#1A2E3B` |
| `--land-active` | `#24404F` |
| `--line-district` | `#2D4757` |
| `--ink` | `#E6EDF0` |
| `--ink-muted` | `#8FA3AE` |
| `--edge-idle` | `#3D5666` |

Linhas dos algoritmos (inspiradas nas linhas do MTR):

| Algoritmo | Claro | Escuro | Referência |
|---|---|---|---|
| DFS | `#E8761A` | `#F59A45` | Tung Chung Line |
| BFS | `#0A72C5` | `#3B95DE` | Island Line |
| Dijkstra | `#D7262E` | `#F0474E` | Tsuen Wan Line |
| Kruskal | `#10A35A` | `#2CC074` | Kwun Tong Line |

Tema: padrão segue `prefers-color-scheme`; escolha salva em `localStorage` (envolver em try/catch). Atributo `data-theme` no `<html>`.

### Tipografia

- **Overpass** (derivada da Highway Gothic, a fonte de sinalização viária): toda a interface. Pesos 400, 600, 800.
- **Noto Sans TC** peso 500: só nos nomes de distrito em chinês.
- Números sempre com `font-variant-numeric: tabular-nums`.
- Escala (razão 1,25, base 16 px): 13 / 16 / 20 / 25 / 31 / 39 / 61 (título da tela inicial). Mínimo de 14 px em qualquer coisa que o professor precise ler no projetor.
- Títulos com `letter-spacing: -0.01em`. Texto em sentence case.

### Forma

- Raio por hierarquia: painéis 14 px, botões de algoritmo em pílula (999 px), inputs 8 px, estações em círculo.
- Sombras: só em elementos flutuantes (gaveta, confirmação). Painéis fixos usam borda de 1 px `--line-district`.
- Arestas: `stroke-linecap: round`. Idle 3 px; destacada 9 px. Quando duas linhas passam na mesma aresta (ex.: Kruskal + Dijkstra), deslocar a segunda 9 px na perpendicular, como linhas paralelas de metrô (ver `docs/referencias/`).
- Peso da aresta: pílula pequena com fundo `--surface` no meio da aresta.
- Grafo direcionado: seta pequena no fim da aresta, antes do círculo.

### Proibido (são as marcas de "CSS de IA")

- Gradientes decorativos, glassmorphism, blur de fundo
- Roxo/índigo como cor de destaque
- Inter, Roboto, Space Grotesk, fonte monoespaçada para rótulos
- Rótulos em CAIXA ALTA com letter-spacing largo acima de títulos
- Cards idênticos com a mesma sombra cinza em tudo
- "→" no fim de botões, emojis na interface
- Textos unidos com " · " ou " — "
- Animação de entrada em cada seção/card; hover que "levanta" cards

---

## 8. Estrutura de pastas sugerida

```
frontend/
  index.html
  vite.config.ts
  src/
    main.tsx
    app/            App.tsx, TitleScreen.tsx, Workspace.tsx, EndScreen.tsx
    api/            client.ts (fetch + tipos das respostas + tratamento de erro)
    domain/         types.ts, parser.ts, adjacency.ts, trees.ts, format.ts
    domain/__tests__/  parser.test.ts, trees.test.ts, adjacency.test.ts
    store/          useGraphStore.ts (zustand)
    data/           hk-districts.geojson, hongKongGraph.ts, team.ts, examples.ts
    components/
      canvas/       HKMapCanvas.tsx, ForceCanvas.tsx, Station.tsx, EdgeLine.tsx
      source/       GraphEditor.tsx, MapSourcePanel.tsx
      results/      DfsResult.tsx, BfsResult.tsx, DijkstraResult.tsx, KruskalResult.tsx
      memory/       AdjacencyDrawer.tsx, MatrixCompare.tsx
      ui/           Pill.tsx, KeyHint.tsx, ConfirmInline.tsx, ThemeToggle.tsx
    styles/         tokens.css, global.css
```

`hk-districts.geojson`: 18 distritos simplificados (37 KB), anéis já orientados para o d3 (não reorientar). Propriedade `name` igual ao `district` de `hongKongGraph.ts`. Licença MIT em `LICENSE-hk-districts.txt` (dados de github.com/Paulkit/HKMap). Projeção: `geoMercator().fitExtent(...)` com margem.

---

## 9. Valores esperados (grafo da proposta, início em O)

Obtidos rodando o `backend/grafo.py` atual. Use nos testes e para conferir antes da apresentação.

- **DFS:** `O A B C E D T F`. Árvore reconstruída: O→A→B→C→E→D→T→F (uma corrente).
- **BFS:** `O A B C D F E T`. Pais: A←O, B←O, C←O, D←A, F←A, E←B, T←D. Níveis: 0 {O}, 1 {A,B,C}, 2 {D,F,E}, 3 {T}.
- **Dijkstra:** O 0; A 2 (O); B 4 (A); C 4 (O); E 7 (B); D 8 (B); T 13 (D); F 14 (A). Rota O→T: O, A, B, D, T (custo 13).
- **Kruskal:** B–C 1, A–B 2, O–A 2, B–E 3, F–T 3, B–D 4, D–T 5. Custo total **20**.
- **Lista de adjacência** (ordem exata do servidor):
  ```
  O: A(2) B(5) C(4)
  A: O(2) B(2) D(7) F(12)
  B: O(5) A(2) C(1) D(4) E(3)
  C: O(4) B(1) E(4)
  D: A(7) B(4) E(4) T(5)
  E: B(3) C(4) D(4) T(7)
  F: A(12) T(3)
  T: D(5) E(7) F(3)
  ```

---

## 10. Fases

**Fase 0, base (commit):** Vite + TS + proxy, tokens e fontes, store, client da API com sincronização antes de cada algoritmo, aviso de servidor offline.

**Fase 1, requisitos obrigatórios (commit, é o mínimo para a entrega):** editor de texto com parser e validação, ForceCanvas simples, os 4 algoritmos com resultado em tabela/texto, gaveta da estrutura em memória, apagar grafo, finalizar aplicação, tela inicial estática, tema claro/escuro. Testes do parser e das árvores passando.

**Fase 2, mapa de HK (commit):** HKMapCanvas com o grafo da proposta, estações bilíngues, resultados desenhados no mapa, destino do Dijkstra.

**Fase 3, movimento e polimento (commit):** animação de desenho das rotas, sequência da tela inicial, atalhos de teclado, comparação lista × matriz, linhas paralelas, revisão de contraste nos dois temas e no projetor.

**Fase 4, entrega:** seção do front no README (como rodar), revisar `docs/avisos-backend.md` com o grupo.
