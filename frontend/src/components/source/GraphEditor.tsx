import { useRef, useState, type FormEvent } from 'react';
import { EXAMPLES } from '../../data/examples';
import { graphFromApiJson, graphToText } from '../../domain/parser';
import { useGraphStore } from '../../store/useGraphStore';
import styles from './source.module.css';

/** Editor de texto do grafo. Usado no grafo personalizado e para editar arestas do mapa. */
export function GraphEditor() {
  const mode = useGraphStore((s) => s.mode);
  const source = useGraphStore((s) => s.sources[s.mode]);
  const parsed = useGraphStore((s) => s.parsed[s.mode]);
  const setText = useGraphStore((s) => s.setText);
  const setFlags = useGraphStore((s) => s.setSourceFlags);
  const loadSource = useGraphStore((s) => s.loadSource);
  const reparse = useGraphStore((s) => s.reparse);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ o: '', d: '', w: '' });

  const errors = parsed.issues.filter((i) => i.level === 'error');
  const warnings = parsed.issues.filter((i) => i.level === 'warning');

  const addEdge = (e: FormEvent) => {
    e.preventDefault();
    const o = form.o.trim();
    const d = form.d.trim();
    if (!o || !d) return;
    const q = (s: string) => (/[\s,;#"]/.test(s) ? `"${s.replace(/"/g, '')}"` : s);
    const w = form.w.trim().replace(',', '.');
    const line = `${q(o)} ${q(d)}${w ? ` ${w}` : ''}`;
    const text = source.text.length && !source.text.endsWith('\n') ? `${source.text}\n${line}\n` : `${source.text}${line}\n`;
    setText(text);
    reparse();
    setForm({ o: '', d: '', w: '' });
  };

  const importFile = async (file: File) => {
    setImportMsg(null);
    try {
      const content = await file.text();
      if (file.name.toLowerCase().endsWith('.json')) {
        const g = graphFromApiJson(JSON.parse(content));
        loadSource(mode, { text: graphToText(g, `Importado de ${file.name}`), direcionado: g.direcionado, ponderado: g.ponderado });
      } else {
        loadSource(mode, { ...source, text: content });
      }
      setImportMsg(`${file.name} importado.`);
    } catch (err) {
      setImportMsg(`Não foi possível importar ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className={styles.editor}>
      <div className={styles.toggles}>
        <label className={styles.switch}>
          <input type="checkbox" checked={source.direcionado} onChange={(e) => setFlags({ direcionado: e.target.checked })} />
          <span>Direcionado</span>
        </label>
        <label className={styles.switch}>
          <input type="checkbox" checked={source.ponderado} onChange={(e) => setFlags({ ponderado: e.target.checked })} />
          <span>Com peso</span>
        </label>
      </div>

      <label className={styles.fieldLabel} htmlFor="graph-text">
        Uma aresta por linha: origem destino {source.ponderado ? 'peso' : '(sem peso)'}
      </label>
      <textarea
        id="graph-text"
        className={styles.textarea}
        value={source.text}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setText(e.target.value)}
        onBlur={reparse}
        aria-invalid={errors.length > 0}
        aria-describedby="graph-issues"
        placeholder={'A B 4\nA C 2\nB D 5\nV: X Y'}
      />
      <p className={styles.help}>
        Separe por espaço, vírgula ou ponto e vírgula. <code>V: X Y</code> cria vértices isolados. <code>#</code> comenta.
      </p>

      <div id="graph-issues" aria-live="polite">
        {errors.length > 0 && (
          <ul className={styles.errors}>
            {errors.map((i, k) => (
              <li key={k}>{i.message}</li>
            ))}
          </ul>
        )}
        {warnings.length > 0 && (
          <ul className={styles.warnings}>
            {warnings.map((i, k) => (
              <li key={k}>{i.message}</li>
            ))}
          </ul>
        )}
      </div>

      <form className={styles.addForm} onSubmit={addEdge} aria-label="Adicionar aresta">
        <input aria-label="Origem" placeholder="Origem" value={form.o} onChange={(e) => setForm({ ...form, o: e.target.value })} />
        <input aria-label="Destino" placeholder="Destino" value={form.d} onChange={(e) => setForm({ ...form, d: e.target.value })} />
        <input
          aria-label="Peso"
          placeholder="Peso"
          inputMode="decimal"
          disabled={!source.ponderado}
          value={form.w}
          onChange={(e) => setForm({ ...form, w: e.target.value })}
        />
        <button type="submit" className={styles.smallButton} disabled={!form.o.trim() || !form.d.trim()}>
          Adicionar aresta
        </button>
      </form>

      {mode === 'custom' && (
        <>
          <div className={styles.row}>
            <button type="button" className={styles.smallButton} onClick={() => fileRef.current?.click()}>
              Importar arquivo
            </button>
            <span className={styles.help}>.txt neste formato ou .json da API</span>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.json,text/plain,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
                e.target.value = '';
              }}
            />
          </div>
          {importMsg && <p className={styles.help}>{importMsg}</p>}

          <div className={styles.examples}>
            <span className={styles.fieldLabel}>Exemplos</span>
            <div className={styles.row}>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className={styles.smallButton}
                  onClick={() => loadSource('custom', { text: ex.text, direcionado: ex.direcionado, ponderado: ex.ponderado })}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
