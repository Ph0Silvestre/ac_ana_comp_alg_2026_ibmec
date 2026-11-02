import { formatWeight } from './format';
import type { Edge, Graph } from './types';

/**
 * Formato de texto do editor:
 *   # comentário
 *   A B 4        uma aresta por linha: origem destino [peso]
 *   V: X Y       vértices isolados
 *   "Zona Norte" Centro 3   nomes com espaço vão entre aspas
 * Separadores: espaço, tab, vírgula, ponto e vírgula.
 */

export type IssueLevel = 'error' | 'warning';

export interface Issue {
  line: number | null;
  level: IssueLevel;
  message: string;
}

export interface ParseOptions {
  direcionado: boolean;
  ponderado: boolean;
  /** Modo mapa: os vértices são fixos (cada um tem posição no mapa). */
  fixedVertices?: string[];
}

export interface ParseResult {
  graph: Graph;
  issues: Issue[];
  hasErrors: boolean;
  hasNegative: boolean;
}

const TOKEN = /"([^"]*)"|[^\s,;"]+/g;
const VERTEX_LINE = /^v\s*:/i;

function tokenize(line: string): string[] {
  const out: string[] = [];
  for (const m of line.matchAll(TOKEN)) out.push(m[1] !== undefined ? m[1].trim() : m[0]);
  return out;
}

function stripComment(line: string): string {
  // '#' fora de aspas começa comentário
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQuote = !inQuote;
    else if (line[i] === '#' && !inQuote) return line.slice(0, i);
  }
  return line;
}

function edgeKey(a: string, b: string, direcionado: boolean): string {
  if (direcionado) return `${a}\u0000${b}`;
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

export function parseGraphText(text: string, opts: ParseOptions): ParseResult {
  const issues: Issue[] = [];
  const vertices: string[] = [];
  const seenVertex = new Set<string>();
  const arestas: Edge[] = [];
  const seenEdge = new Map<string, number>();
  const fixed = opts.fixedVertices ? new Set(opts.fixedVertices) : null;
  let ignoredWeights = 0;
  let hasNegative = false;

  const lines = text.split(/\r?\n/);

  const checkName = (name: string, lineNo: number): boolean => {
    if (name === '') {
      issues.push({ line: lineNo, level: 'error', message: `Linha ${lineNo}: nome de vértice vazio.` });
      return false;
    }
    if (name.includes('/')) {
      issues.push({ line: lineNo, level: 'error', message: `Linha ${lineNo}: o nome "${name}" tem "/", que a API não aceita.` });
      return false;
    }
    if (fixed && !fixed.has(name)) {
      issues.push({
        line: lineNo,
        level: 'error',
        message: `Linha ${lineNo}: "${name}" não é um bairro do mapa. Para criar vértices, use Grafo personalizado.`,
      });
      return false;
    }
    return true;
  };

  const addVertex = (name: string) => {
    if (!seenVertex.has(name)) {
      seenVertex.add(name);
      vertices.push(name);
    }
  };

  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    const line = stripComment(raw).trim();
    if (!line) return;

    if (VERTEX_LINE.test(line)) {
      const names = tokenize(line.replace(VERTEX_LINE, ''));
      if (names.length === 0) {
        issues.push({ line: lineNo, level: 'warning', message: `Linha ${lineNo}: "V:" sem vértices.` });
      }
      for (const n of names) if (checkName(n, lineNo)) addVertex(n);
      return;
    }

    const fields = tokenize(line);
    if (fields.length > 3) {
      issues.push({
        line: lineNo,
        level: 'error',
        message: `Linha ${lineNo}: use origem destino [peso]. Encontrei ${fields.length} campos.`,
      });
      return;
    }
    if (fields.length === 1) {
      if (checkName(fields[0], lineNo)) addVertex(fields[0]);
      return;
    }

    const [origem, destino, pesoRaw] = fields;
    const okO = checkName(origem, lineNo);
    const okD = checkName(destino, lineNo);
    if (!okO || !okD) return;

    let peso = 1;
    if (pesoRaw !== undefined) {
      const n = Number(pesoRaw);
      if (pesoRaw.trim() === '' || !Number.isFinite(n)) {
        issues.push({ line: lineNo, level: 'error', message: `Linha ${lineNo}: peso precisa ser número (recebi "${pesoRaw}").` });
        return;
      }
      if (opts.ponderado) peso = n;
      else ignoredWeights++;
    }

    const key = edgeKey(origem, destino, opts.direcionado);
    const firstLine = seenEdge.get(key);
    if (firstLine !== undefined) {
      issues.push({
        line: lineNo,
        level: 'warning',
        message: `Linha ${lineNo}: aresta ${origem} ${destino} repetida (já está na linha ${firstLine}). Mantida só a primeira.`,
      });
      return;
    }
    seenEdge.set(key, lineNo);

    if (origem === destino) {
      issues.push({ line: lineNo, level: 'warning', message: `Linha ${lineNo}: laço em ${origem}. A aresta foi mantida.` });
    }
    if (peso < 0) {
      hasNegative = true;
      issues.push({ line: lineNo, level: 'warning', message: `Linha ${lineNo}: peso negativo. O Dijkstra fica bloqueado.` });
    }

    addVertex(origem);
    addVertex(destino);
    arestas.push({ origem, destino, peso });
  });

  if (ignoredWeights > 0) {
    issues.push({
      line: null,
      level: 'warning',
      message: `${ignoredWeights === 1 ? '1 peso ignorado' : `${ignoredWeights} pesos ignorados`}: o grafo está sem peso.`,
    });
  }

  return {
    graph: {
      direcionado: opts.direcionado,
      ponderado: opts.ponderado,
      vertices: opts.fixedVertices ? [...opts.fixedVertices] : vertices,
      arestas,
    },
    issues,
    hasErrors: issues.some((i) => i.level === 'error'),
    hasNegative,
  };
}

function quote(name: string): string {
  return /[\s,;#"]/.test(name) ? `"${name.replace(/"/g, '')}"` : name;
}

/** Caminho inverso: grafo para o texto do editor. */
export function graphToText(graph: Graph, header?: string): string {
  const lines: string[] = [];
  if (header) lines.push(`# ${header}`);
  const used = new Set<string>();
  for (const a of graph.arestas) {
    used.add(a.origem);
    used.add(a.destino);
    const w = graph.ponderado ? ` ${formatWeight(a.peso)}` : '';
    lines.push(`${quote(a.origem)} ${quote(a.destino)}${w}`);
  }
  const isolated = graph.vertices.filter((v) => !used.has(v));
  if (isolated.length) lines.push(`V: ${isolated.map(quote).join(' ')}`);
  return lines.join('\n') + '\n';
}

/** Importa o formato da API ({ direcionado, vertices, arestas }). */
export function graphFromApiJson(raw: unknown): Graph {
  if (!raw || typeof raw !== 'object') throw new Error('JSON não é um objeto.');
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.arestas)) throw new Error('JSON sem a lista "arestas".');
  const arestas: Edge[] = obj.arestas.map((a, i) => {
    const e = a as Record<string, unknown>;
    if (typeof e?.origem !== 'string' || typeof e?.destino !== 'string') {
      throw new Error(`Aresta ${i + 1} precisa de "origem" e "destino" em texto.`);
    }
    const peso = e.peso === undefined ? 1 : Number(e.peso);
    if (!Number.isFinite(peso)) throw new Error(`Aresta ${i + 1}: peso precisa ser número.`);
    return { origem: e.origem, destino: e.destino, peso };
  });
  const vertices = Array.isArray(obj.vertices) ? obj.vertices.map(String) : [];
  for (const a of arestas) {
    if (!vertices.includes(a.origem)) vertices.push(a.origem);
    if (!vertices.includes(a.destino)) vertices.push(a.destino);
  }
  return {
    direcionado: Boolean(obj.direcionado),
    ponderado: arestas.some((a) => a.peso !== 1),
    vertices,
    arestas,
  };
}
