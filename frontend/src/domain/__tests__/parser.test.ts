import { describe, expect, it } from 'vitest';
import { HK_EDGES, HK_NODES } from '../../data/hongKongGraph';
import { graphFromApiJson, graphToText, parseGraphText } from '../parser';

const weighted = { direcionado: false, ponderado: true };

describe('parser', () => {
  it('lê o grafo da proposta escrito em texto', () => {
    const text = HK_EDGES.map((e) => `${e.origem} ${e.destino} ${e.peso}`).join('\n');
    const r = parseGraphText(text, weighted);
    expect(r.hasErrors).toBe(false);
    expect(r.issues).toEqual([]);
    expect(r.graph.arestas).toEqual(HK_EDGES);
    expect(r.graph.vertices.sort()).toEqual(HK_NODES.map((n) => n.id).sort());
  });

  it('aceita vírgula, ponto e vírgula, tab, comentários e vértices isolados', () => {
    const r = parseGraphText('# título\nA,B,4\nA;C;2.5\nB\tD\nV: X Y  # isolados\n', weighted);
    expect(r.graph.arestas).toEqual([
      { origem: 'A', destino: 'B', peso: 4 },
      { origem: 'A', destino: 'C', peso: 2.5 },
      { origem: 'B', destino: 'D', peso: 1 },
    ]);
    expect(r.graph.vertices).toEqual(['A', 'B', 'C', 'D', 'X', 'Y']);
  });

  it('aceita nomes entre aspas', () => {
    const r = parseGraphText('"Zona Norte" Centro 3', weighted);
    expect(r.graph.arestas[0]).toEqual({ origem: 'Zona Norte', destino: 'Centro', peso: 3 });
  });

  it('marca erros por linha', () => {
    const r = parseGraphText('A B x\nA/B C 1\nA B C D', weighted);
    expect(r.hasErrors).toBe(true);
    expect(r.issues.map((i) => [i.line, i.level])).toEqual([
      [1, 'error'],
      [2, 'error'],
      [3, 'error'],
    ]);
    expect(r.issues[0].message).toContain('Linha 1: peso precisa ser número');
  });

  it('avisa sem bloquear: duplicada, laço e peso negativo', () => {
    const r = parseGraphText('A B 1\nB A 9\nC C 2\nA C -3', weighted);
    expect(r.hasErrors).toBe(false);
    expect(r.hasNegative).toBe(true);
    expect(r.issues.every((i) => i.level === 'warning')).toBe(true);
    expect(r.graph.arestas).toHaveLength(3);
    expect(r.graph.arestas[0].peso).toBe(1);
  });

  it('em grafo direcionado A B e B A são arestas diferentes', () => {
    const r = parseGraphText('A B 1\nB A 9', { direcionado: true, ponderado: true });
    expect(r.graph.arestas).toHaveLength(2);
    expect(r.issues).toEqual([]);
  });

  it('sem peso ignora os pesos digitados com um aviso', () => {
    const r = parseGraphText('A B 4\nB C 7', { direcionado: false, ponderado: false });
    expect(r.graph.arestas.map((a) => a.peso)).toEqual([1, 1]);
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0].level).toBe('warning');
  });

  it('no modo mapa recusa vértices fora do mapa e mantém os 8 bairros', () => {
    const ids = HK_NODES.map((n) => n.id);
    const r = parseGraphText('O A 2\nO Z 1', { ...weighted, fixedVertices: ids });
    expect(r.hasErrors).toBe(true);
    expect(r.graph.vertices).toEqual(ids);
  });

  it('volta para texto e relê igual', () => {
    const g = parseGraphText('A B 2.5\n"Zona Sul" C 1\nV: X', weighted).graph;
    const again = parseGraphText(graphToText(g), weighted).graph;
    expect(again).toEqual(g);
  });

  it('importa JSON no formato da API', () => {
    const g = graphFromApiJson({ direcionado: true, vertices: ['Z1', 'Z2', 'Z9'], arestas: [{ origem: 'Z1', destino: 'Z2', peso: 10.0 }] });
    expect(g).toEqual({ direcionado: true, ponderado: true, vertices: ['Z1', 'Z2', 'Z9'], arestas: [{ origem: 'Z1', destino: 'Z2', peso: 10 }] });
  });
});
