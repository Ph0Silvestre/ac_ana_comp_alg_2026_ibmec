# Avisos para o backend

O front foi construído sobre a API como ela está, sem mudanças. Abaixo, o que vale ajustar no backend, em ordem de impacto na nota.

## Antes da entrega (afetam nota diretamente)

### 1. README: instruções de execução incompletas
O professor desconta "substancialmente" se faltar informação para rodar.
- Falta o `cd backend` antes do `uvicorn main:app --reload` (o comando só funciona dentro da pasta).
- O passo de dependências manda `pip install fastapi uvicorn pydantic`, mas existe `requirements.txt`. Usar `pip install -r requirements.txt`.
- Falta a seção de como rodar o front (o front vai mandar o texto pronto).
- Nomes e matrículas dos integrantes ainda estão como placeholder.

### 2. `requirements.txt` está salvo em UTF-16
O arquivo foi gerado no PowerShell (`pip freeze > requirements.txt`) e ficou em UTF-16 com CRLF. O pip normalmente consegue ler, mas o GitHub mostra o arquivo quebrado, com espaços entre as letras, e algumas ferramentas falham. Regravar em UTF-8:
```powershell
pip freeze | Out-File -Encoding utf8 requirements.txt
```
Vale também enxugar para só `fastapi`, `uvicorn` e `pydantic` (o freeze trouxe `opentelemetry` e outros que não são usados).

## Melhorias de API (o front já contorna, mas ficaria mais sólido)

### 3. Endpoint para ler a estrutura em memória
A proposta exige uma área que mostre como o grafo está armazenado. Hoje o front monta a lista de adjacência replicando a regra de `adicionar_aresta`. O resultado é idêntico, mas o ideal é ler direto da memória do servidor:
```python
@app.get("/api/estrutura")
def estrutura():
    if not grafo_atual:
        raise HTTPException(status_code=400, detail="Nenhum grafo carregado na memória.")
    return {"direcionado": grafo_atual.direcionado, "lista_adj": grafo_atual.lista_adj}
```
Se esse endpoint for criado, o front troca a fonte de dados em uma linha.

### 4. `veio_de` no DFS e no BFS
A proposta pede "uma representação simples de árvore para o DFS". A API devolve só a ordem de visita, então o front reconstrói a árvore a partir da ordem + lista de adjacência (é determinístico e está testado). Devolver o pai de cada vértice, como o Dijkstra já faz, deixaria a árvore vindo direto do algoritmo:
```python
# dentro de explorar(), ao descer para destino:
pais[destino] = vertice
```
Sugestão de resposta: `{"caminho_percorrido": [...], "arvore": [{"vertice": "A", "veio_de": "O"}, ...]}`. Para o BFS, o mesmo, mais o nível de cada vértice.

### 5. Apagar grafo e finalizar
A proposta cita "apagar o grafo atual" e o botão "Finalizar aplicação". Hoje o front reenvia o grafo antes de cada algoritmo (o servidor nunca roda um grafo velho) e o "Finalizar" encerra a sessão só na interface. Se quiserem que o servidor participe:
```python
@app.delete("/api/grafo")
def apagar_grafo():
    global grafo_atual
    grafo_atual = None
    return {"mensagem": "Grafo removido da memória."}
```

## Possíveis bugs (testar com o grafo do professor)

### 6. Kruskal em grafo direcionado
O `aresta_id = tuple(sorted([origem, destino]))` junta A→B e B→A numa aresta só e descarta a de peso diferente sem critério. Kruskal só se aplica a grafos não direcionados. O front desabilita o botão quando o grafo é direcionado, mas o endpoint deveria responder `400` nesse caso, com uma mensagem clara.

### 7. Dijkstra com peso negativo
Dijkstra não funciona com pesos negativos e hoje devolve resultado errado sem avisar. O front bloqueia, mas o backend deveria validar e responder `400`.

### 8. Arestas duplicadas
Se o mesmo par for enviado duas vezes, `adicionar_aresta` adiciona as duas entradas na lista. O front avisa e envia só a primeira, mas vale decidir a regra no backend (ignorar, substituir o peso ou manter as duas).

### 9. Vértice com `/` no nome
A rota `/api/dfs/{vertice_inicial}` não aceita `/` no nome nem codificado. O front bloqueia esse caractere.

### 10. Recursão no DFS
O DFS é recursivo. Em grafos com mais de ~1000 vértices em corrente estoura o limite de recursão do Python. Não deve acontecer na apresentação, mas é uma boa pergunta de defesa ("e se o grafo fosse enorme?"): a resposta é a versão iterativa com pilha explícita.

## Para a defesa de complexidade

O README já justifica bem lista vs. matriz, `deque` e `heapq`. Vale incluir:
- DFS e BFS: O(V + E). Neste backend os vizinhos são ordenados a cada visita (`sorted`), o que soma O(grau · log grau) por vértice, ou seja, O(V + E log E) no total. Vale saber explicar que a ordenação é só para o desempate alfabético.
- Kruskal: O(E log E) pela ordenação + Union-Find com compressão de caminho e união por rank (quase O(1) amortizado por operação).
