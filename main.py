from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException
from schemas import GrafoInput
from grafo import Grafo

app = FastAPI(
    title="SmartNet Analyzer",
    description="API para análise de grafos e rotas da cidade inteligente"
)

#rotas padrão do React se tiver um erro de porta basta alterar aqui
origens_permitidas = [
    "http://localhost:3000",
    "http://localhost:5173", 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origens_permitidas,
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

grafo_atual = None

# Rota de teste
@app.get("/status")
def verificar_status():
    return {"status": "SmartNet Analyzer backend operante!"}

#criacao do grafo
@app.post("/api/iniciar-grafo")
def iniciar_grafo(dados: GrafoInput):
    global grafo_atual
    grafo_atual = Grafo(direcionado=dados.direcionado)
    
    for v in dados.vertices:
        grafo_atual.adicionar_vertice(v)
    
    for a in dados.arestas:
        grafo_atual.adicionar_aresta(a.origem,a.destino,a.peso) 
           
    return {
        "mensagem": "Grafo carregado na memória com sucesso",
        "total_vertices": len(dados.vertices),
        "total_arestas": len(dados.arestas),
        "direcionado": dados.direcionado
    }

@app.get("/api/dfs/{vertice_inicial}")
def executar_dfs(vertice_inicial: str):
    global grafo_atual
    
    if not grafo_atual:
        raise HTTPException(status_code=400, detail="Nenhum grafo carregado na memória.")
    
    if vertice_inicial not in grafo_atual.lista_adj:
        raise HTTPException(status_code=404, detail="Vértice inicial não encontrado no grafo.")
        
    resultado_dfs = grafo_atual.dfs(vertice_inicial)
    
    return {
        "algoritmo": "DFS",
        "ponto_partida": vertice_inicial,
        "caminho_percorrido": resultado_dfs
    }
    
@app.get("/api/bfs/{vertice_inicial}")
def executar_bfs(vertice_inicial: str):
    global grafo_atual

    if not grafo_atual:
        raise HTTPException(status_code=400, detail="Nenhum grafo carregado na memória.")

    if vertice_inicial not in grafo_atual.lista_adj:
        raise HTTPException(status_code=404, detail="Vértice inicial não encontrado no grafo.")
        
    resultado_bfs = grafo_atual.bfs(vertice_inicial)

    return {
        "algoritmo": "BFS",
        "ponto_partida": vertice_inicial,
        "fila_execucao": resultado_bfs
    }

@app.get("/api/dijkstra/{vertice_inicial}")
def executar_dijkstra(vertice_inicial: str):
    global grafo_atual
    
    if not grafo_atual:
        raise HTTPException(status_code=400, detail="Nenhum grafo carregado na memória.")
    
    if vertice_inicial not in grafo_atual.lista_adj:
        raise HTTPException(status_code=404, detail="Vértice inicial não encontrado no grafo.")
        
    distancias, caminhos = grafo_atual.dijkstra(vertice_inicial)
    
    # Formata a lista final representando as distâncias
    lista_resultados = []
    for destino, dist in distancias.items():
        lista_resultados.append({
            "destino": destino,
            "distancia_minima": dist if dist != float('inf') else "Inalcançável",
            "veio_de": caminhos[destino] # para front-end queira traçar a linha da rota
        })
    
    return {
        "algoritmo": "Dijkstra",
        "ponto_partida": vertice_inicial,
        "resultados": lista_resultados
    }
    
@app.get("/api/kruskal")
def executar_kruskal():
    global grafo_atual
    
    if not grafo_atual:
        raise HTTPException(status_code=400, detail="Nenhum grafo carregado na memória.")
    
    mst, custo_total = grafo_atual.kruskal()
    
    return {
        "algoritmo": "Kruskal",
        "custo_total_fibra": custo_total,
        "arestas_selecionadas": mst
    }