#permite gerir a fila de execução extraindo o primeiro elemento com complexidade O(1) BFS
from collections import deque
# fila de prioridade (Min-Heap) Para garantir o desempenho ideal e a complexidade correcta O((V + E) \log V))
import heapq

#classe assistente para garantir que adicao de uma nova ligacao nao cria ciclos
class UnionFind:
    def __init__(self, vertices):
        self.pai = {v: v for v in vertices}
        self.rank = {v: 0 for v in vertices}

    def find(self, item):
        if self.pai[item] != item:
            self.pai[item] = self.find(self.pai[item])
        return self.pai[item]

    def union(self, x, y):
        raiz_x = self.find(x)
        raiz_y = self.find(y)

        if raiz_x != raiz_y:
            if self.rank[raiz_x] > self.rank[raiz_y]:
                self.pai[raiz_y] = raiz_x
            elif self.rank[raiz_x] < self.rank[raiz_y]:
                self.pai[raiz_x] = raiz_y
            else:
                self.pai[raiz_y] = raiz_x
                self.rank[raiz_x] += 1
            return True
        return False

class Grafo:
    def __init__(self, direcionado=False):
        self.direcionado = direcionado
        self.lista_adj = {}

    def adicionar_vertice(self, vertice: str):
        if vertice not in self.lista_adj:
            self.lista_adj[vertice] = []
    
    def adicionar_aresta(self, origem: str, destino: str, peso: float = 1.0):
        self.adicionar_vertice(origem)
        self.adicionar_vertice(destino)
        
        self.lista_adj[origem].append({"destino": destino, "peso": peso})
        
        #adiciona a ligacao de "volta" para os nao direcionados
        if not self.direcionado:
            self.lista_adj[destino].append({"destino": origem, "peso": peso})
    
    def dfs(self, vertice_inicial: str):
        """implementa DFS num grafo direcionado ou nao e retorna uma lista na ordem visitada

        Args:
            vertice_inicial (str): vertice de inicio do dfs

        Returns:
            _List_: ['A', 'B', 'D', 'C']
        """
        #evitar loops
        visitados = set()
        
        ordem_visita = []
        
        if vertice_inicial not in self.lista_adj:
            return ordem_visita

        def explorar(vertice):
            visitados.add(vertice)
            ordem_visita.append(vertice)
            
            for vizinho in sorted(self.lista_adj[vertice], key=lambda x: x["destino"]):
                destino = vizinho["destino"]
                if destino not in visitados:
                    explorar(destino)

        explorar(vertice_inicial)
        return ordem_visita
    
    def bfs(self, vertice_inicial: str):
        """executa bfs apartir de um no inicial e retorna uma lista na ordem da execucao

        Args:
            vertice_inicial (str):

        Returns:
            list: ['A', 'B', 'C', 'D']
        """
        
        ordem_visita = []
        
        if vertice_inicial not in self.lista_adj:
            return ordem_visita

        visitados = set([vertice_inicial])
        fila = deque([vertice_inicial]) # marco os que ainda faltam ser visitados

        while fila:
            vertice_atual = fila.popleft()# atual sempre prox da fila
            ordem_visita.append(vertice_atual)
            
            #ordenacao garante desempate alfabetico igual implementacao manual
            for vizinho in sorted(self.lista_adj[vertice_atual], key=lambda x: x["destino"]):
                destino = vizinho["destino"]
                if destino not in visitados:
                    visitados.add(destino)
                    fila.append(destino)

        return ordem_visita
    
    def dijkstra(self, vertice_inicial: str):
        if vertice_inicial not in self.lista_adj:
            return {}, {}

        # Inicializa todas as distâncias com infinito
        distancias = {v: float('inf') for v in self.lista_adj}
        distancias[vertice_inicial] = 0
        
        # Regista o nó anterior para permitir a reconstrução do caminho
        caminhos = {v: None for v in self.lista_adj}
        
        # Fila de prioridade armazena tuplas (distancia_acumulada, vertice)
        fila_prioridade = [(0, vertice_inicial)]

        while fila_prioridade:
            dist_atual, vertice_atual = heapq.heappop(fila_prioridade)

            # ignora se já encontrámos um caminho mais curto para este vértice
            if dist_atual > distancias[vertice_atual]:
                continue

            for vizinho in self.lista_adj[vertice_atual]:
                destino = vizinho["destino"]
                peso = vizinho["peso"]
                nova_distancia = dist_atual + peso

                # Se o novo caminho for mais curto, atualiza os registos e adiciona à fila
                if nova_distancia < distancias[destino]:
                    distancias[destino] = nova_distancia
                    caminhos[destino] = vertice_atual
                    heapq.heappush(fila_prioridade, (nova_distancia, destino))

        return distancias, caminhos
    
    def kruskal(self):
        arestas = []
        arestas_vistas = set()
        
        # Extrai todas as arestas do grafo
        for origem, vizinhos in self.lista_adj.items():
            for vizinho in vizinhos:
                destino = vizinho["destino"]
                peso = vizinho["peso"]
                
                # Identificador único para evitar processar a mesma aresta bidirecional duas vezes
                aresta_id = tuple(sorted([origem, destino]))
                if aresta_id not in arestas_vistas:
                    arestas.append((peso, origem, destino))
                    arestas_vistas.add(aresta_id)

        # Ordena as arestas sobre 3 criterios:do menor para o maior peso (O(E log E)), depois alfabeticamente (origem se empatar destino)
        arestas.sort(key=lambda x: (x[0], x[1], x[2]))

        uf = UnionFind(self.lista_adj.keys())
        mst = []
        custo_total = 0

        # Constrói a rede sem ciclos
        for peso, origem, destino in arestas:
            if uf.union(origem, destino):
                mst.append({"origem": origem, "destino": destino, "peso": peso})
                custo_total += peso

        return mst, custo_total
    