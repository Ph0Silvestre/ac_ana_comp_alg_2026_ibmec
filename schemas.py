from pydantic import BaseModel
from typing import List

class Aresta(BaseModel):
    origem: str
    destino: str
    peso: float = 1.0  # Padrão 1.0 para grafos sem peso

class GrafoInput(BaseModel):
    direcionado: bool = False
    vertices: List[str]
    arestas: List[Aresta]
    