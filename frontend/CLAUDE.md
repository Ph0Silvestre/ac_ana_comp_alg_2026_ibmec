# SmartNet Analyzer

Trabalho de Análise e Complexidade de Algoritmos (Ibmec, 2026.2). Analisador de grafos de uma cidade inteligente: DFS, BFS, Dijkstra e Kruskal sobre lista de adjacência.

- `backend/`: FastAPI. **Não alterar nenhum arquivo dessa pasta.** Se algo do backend atrapalhar, contornar no front e anotar em `docs/avisos-backend.md`.
- `frontend/`: React + Vite + TypeScript. É aqui que trabalhamos.
- Especificação completa: `docs/frontend-spec.md`. Leia antes de começar qualquer fase e siga a ordem de fases da seção 10.
- Referência visual: `docs/referencias/ref-claro.png` e `ref-escuro.png`.

## Comandos

```bash
# backend (outro terminal)
cd backend && pip install -r requirements.txt && uvicorn main:app --reload   # porta 8000

# frontend
cd frontend && npm install && npm run dev    # http://localhost:5173
npm run test                                 # vitest
npm run build                                # checar tipos e build antes de cada commit
```

## Regras inegociáveis

1. **Nunca calcular algoritmo no front.** DFS, BFS, Dijkstra e Kruskal vêm da API. O front só reconstrói árvore/caminho a partir da resposta (spec, seção 3). A correção vale 40% da nota e precisa vir do backend.
2. **Sincronizar antes de rodar:** todo clique em algoritmo faz `POST /api/iniciar-grafo` com o grafo atual e depois o `GET` do algoritmo.
3. **Chamadas via proxy do Vite** (`/api`, `/status`), nunca URL absoluta para 127.0.0.1:8000.
4. **Tudo offline:** fontes por `@fontsource`, mapa em `src/data/hk-districts.geojson`. Nenhuma CDN.
5. **Vértice é identificado pelo nome que vai para a API** (no mapa, a letra). Distrito é só apresentação.
6. Todo texto da interface em português do Brasil, sentence case, verbos diretos ("Executar DFS", "Apagar grafo").
7. `prefers-reduced-motion` desliga todas as animações.
8. Testes de `parser`, `adjacency` e `trees` com os valores da seção 9 da spec precisam passar antes de cada commit.

## Visual

Linguagem de mapa do metrô de Hong Kong: cada algoritmo é uma linha colorida, vértices são estações, rótulos bilíngues (inglês + chinês). Tokens de cor, tipografia e forma estão na seção 7 da spec; use só esses tokens (variáveis CSS em `src/styles/tokens.css`).

Estilo: CSS Modules + variáveis CSS. Sem Tailwind, sem biblioteca de componentes.

Não usar: gradientes decorativos, glassmorphism, roxo/índigo, Inter/Roboto/Space Grotesk, fonte mono em rótulos, CAIXA ALTA espaçada como rótulo acima de título, cards idênticos com a mesma sombra, "→" em botões, emojis, separadores " · " ou " — " em textos, animação de entrada em cada seção.

Movimento só em resposta a ação ou para mostrar resultado. A única sequência automática é a da tela inicial.

## Ferramentas instaladas (usar)

- **frontend-design** (skill): carregar antes de criar ou reestilizar qualquer tela. A spec já fixa a direção visual; a skill serve para executar bem, não para escolher outra direção.
- **Playwright MCP**: abrir `http://localhost:5173`, clicar nos 4 algoritmos com o grafo da proposta, conferir os resultados com a seção 9 da spec e tirar screenshots nos dois temas. Usar ao fim de cada fase.
- **Context7 MCP**: consultar a documentação atual antes de usar `motion` (o import é `motion/react`, não `framer-motion`), `d3-geo`, `d3-force`, `zustand` e `vite`. Não confiar em API de memória.
- **TypeScript LSP**: corrigir os erros de tipo que ele apontar antes de seguir.
- **/commit** (commit-commands): commit ao fim de cada fase.

## Fluxo de trabalho

- Uma fase por vez. Ao terminar cada fase: `npm run build`, `npm run test`, abrir no navegador e conferir os dois temas, depois commit.
- Commits pequenos e descritivos em português.
- Depois de mudanças visuais, tirar screenshot (Playwright) nos dois temas, em 1280×800 (projetor) e 1920×1080, e revisar contra `docs/referencias/`.
