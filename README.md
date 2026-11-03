# SmartNet Analyzer - Backend (FastAPI)

**Instituição:** Ibmec

**Curso:** Engenharia de Computação/Software

**Disciplina:** Análise e Complexidade de Algoritmos (IBM3121) - 2026.2

**Professor:** Cassius Figueiredo

**Integrantes do Grupo (Preencher antes da entrega):**

* Pedro Silvestre - Matrícula: \202402841904

* Felipe Dutrain de Sales - Matrícula: 202402011359

* Guilherme Resende da Rocha - Matrícula: 202402075365

* \[Nome do Aluno 4\] - Matrícula: \[0000000\]

* \[Nome do Aluno 5\] - Matrícula: \[0000000\]

## 📌 Sobre o Projeto

O **SmartNet Analyzer** é uma ferramenta de software desenvolvida para mapear e analisar a infraestrutura de uma cidade inteligente. O sistema modela a cidade como um grafo (onde bairros são vértices e vias/fibras óticas são arestas) e executa algoritmos clássicos para análise de rotas (Dijkstra), auditoria e conectividade (DFS/BFS) e otimização de redes de fibra ótica (Kruskal).

Este repositório contém a **API (Backend)** construída em Python utilizando o framework FastAPI. O armazenamento em memória foi implementado estritamente do zero utilizando a estrutura de **Lista de Adjacência**.

## 🚀 Como Executar a Aplicação (Backend)

Siga os passos abaixo para rodar o servidor localmente:

1. **Clone o repositório:**

   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd [NOME_DA_PASTA]
   ```

2. **Crie e ative o ambiente virtual:**

   * Windows: `python -m venv venv` e depois `venv\Scripts\activate`
   * Linux/Mac: `python3 -m venv venv` e depois `source venv/bin/activate`

3. **Instale as dependências:**

   ```bash
   pip install fastapi uvicorn pydantic
   ```

4. **Inicie o servidor:**

   ```bash
   uvicorn main:app --reload
   ```

   A API estará rodando em `http://127.0.0.1:8000`. O Swagger UI para testar as rotas interativamente fica disponível em `http://127.0.0.1:8000/docs`.

## 🧠 Justificativas Técnicas e Complexidade (Para Defesa do Trabalho)

Para atingir a eficiência máxima exigida na avaliação, adotamos as seguintes estruturas matemáticas e de dados:

* **Lista de Adjacência vs. Matriz:** Escolhemos a Lista de Adjacência porque a malha viária de uma cidade é um **grafo esparso** (um bairro não se conecta diretamente a todos os outros bairros da cidade). Isso reduz o consumo de memória de $O(V^2)$ para $O(V + E)$ e torna a iteração sobre os vizinhos muito mais rápida em algoritmos como DFS e BFS.

* **Uso do `deque` (Busca em Largura - BFS):** Utilizamos `collections.deque` para gerenciar a fila do BFS em vez de uma lista padrão do Python. A remoção do primeiro elemento usando `popleft()` no `deque` possui complexidade de tempo constante $O(1)$, enquanto em uma lista normal (`pop(0)`) a complexidade seria $O(N)$ por precisar realocar todos os itens na memória.

* **Uso do `heapq` (Dijkstra):** Utilizamos a biblioteca `heapq` para implementar uma **Fila de Prioridade (Min-Heap)**. Isso permite que o algoritmo sempre extraia o caminho mais curto atual em tempo logarítmico $O(\log V)$. Sem o Heap, teríamos que buscar o menor valor linearmente $O(V)$ a cada passo, arruinando a performance. Com o `heapq`, garantimos a complexidade ideal de $O((V + E) \log V)$.

## 🔌 Guia de Integração para a Equipe de Front-end

A API está configurada com CORS liberado. Abaixo estão as instruções detalhadas de como enviar e consumir os dados.

### 1. Inicializando o Grafo no Servidor

Sempre que o usuário desenhar ou atualizar o grafo na interface, o front-end deve enviar o payload atualizado via **POST** para `/api/iniciar-grafo`.

**Formato esperado (Grafo Não Direcionado):**

```json
{
  "direcionado": false,
  "vertices": ["Centro", "Zona Norte", "Zona Sul", "Nó Isolado"],
  "arestas": [
    { "origem": "Centro", "destino": "Zona Norte", "peso": 4.5 },
    { "origem": "Centro", "destino": "Zona Sul", "peso": 3.2 }
  ]
}
```

**Formato esperado (Grafo Direcionado):**

```json
{
  "direcionado": true,
  "vertices": ["Z1", "Z2", "Z3"],
  "arestas": [
    { "origem": "Z1", "destino": "Z2", "peso": 10.0 },
    { "origem": "Z2", "destino": "Z3", "peso": 5.5 },
    { "origem": "Z3", "destino": "Z1", "peso": 15.0 }
  ]
}
```

*Atenção Front-end:*

* Envie *todos* os nós desenhados no array `vertices`, mesmo que não tenham ligações.
* Se o grafo for direcionado, mude `direcionado` para `true`. O backend tratará a via como mão única.

### 2. Desenhando a Rota do Dijkstra (ATENÇÃO!)

Quando executarem o endpoint **GET** `/api/dijkstra/{vertice_inicial}`, a resposta retornará um array de resultados.

**Exemplo de Resposta:**

```json
{
  "algoritmo": "Dijkstra",
  "ponto_partida": "A",
  "resultados": [
    { "destino": "B", "distancia_minima": 5, "veio_de": "A" },
    { "destino": "C", "distancia_minima": 8, "veio_de": "B" },
    { "destino": "D", "distancia_minima": "Inalcançável", "veio_de": null }
  ]
}
```

**Como reconstruir e desenhar o caminho na tela:**
O campo **`veio_de`** é a chave para desenhar a rota de emergência. Ele aponta para o nó imediatamente anterior no caminho mais curto.
Para desenhar a rota do ponto inicial (A) até o destino (C), o front-end deve fazer o caminho reverso:

1. Olhe para `C`. De onde ele veio? `veio_de: "B"`. Desenhe a linha de C para B.
2. Olhe para `B`. De onde ele veio? `veio_de: "A"`. Desenhe a linha de B para A.
3. `A` é o ponto de partida original. Fim do caminho.

### 3. Outros Endpoints

* **DFS (Profundidade):** `GET /api/dfs/{vertice_inicial}` -> Retorna um array `caminho_percorrido` com a ordem exata de visitação.
* **BFS (Largura):** `GET /api/bfs/{vertice_inicial}` -> Retorna um array `fila_execucao` representando as "ondas" de propagação do sinal.
* **Kruskal (Árvore Geradora Mínima):** `GET /api/kruskal` -> Não precisa de vértice inicial. Retorna o `custo_total_fibra` e um array `arestas_selecionadas` com as ligações exatas que o front-end deve destacar de verde na tela para mostrar a rede de fibra ótica.

## Front-end (React + Vite)

A interface fica em `frontend/`. Ela não calcula nenhum algoritmo: antes de cada execução reenvia o grafo atual para `POST /api/iniciar-grafo` e mostra exatamente o que a API devolveu.

### Como rodar (dois terminais)

Pré-requisitos: Python 3.10+ e Node.js 20+.

**Terminal 1, backend:**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Terminal 2, front-end:**

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. O Vite repassa `/api` e `/status` para `http://127.0.0.1:8000`, então não há problema de CORS. Se o backend estiver desligado, a interface mostra o aviso "Servidor offline" e volta sozinha quando ele subir.

Outros comandos, dentro de `frontend/`:

```bash
npm run test    # testes do parser, da lista de adjacência e da reconstrução das árvores
npm run build   # checagem de tipos e build de produção
```

### Como usar

- **Enter** na tela inicial abre a área de trabalho com o grafo da proposta já carregado sobre o mapa de Hong Kong.
- **Grafo personalizado** (tecla `M`): digite uma aresta por linha (`origem destino peso`), escolha "Direcionado" e "Com peso". `V: X Y` cria vértices isolados. Também dá para importar `.txt` ou `.json` no formato da API.
- **Algoritmos**: botões DFS, BFS, Dijkstra e Kruskal (teclas `1` a `4`). O resultado aparece em texto/tabela no painel da direita e desenhado no canvas.
- **Estrutura em memória** (tecla `E`): a lista de adjacência exatamente como o backend guarda, com a comparação com a matriz.
- **Apagar grafo** no painel da esquerda e **Finalizar aplicação** no canto superior direito.

Outros atalhos: `T` alterna o tema, `R` repete a animação do resultado, `Esc` fecha a gaveta ou a confirmação.
