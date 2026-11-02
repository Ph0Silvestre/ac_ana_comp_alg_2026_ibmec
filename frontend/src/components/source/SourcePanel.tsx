import { useState } from 'react';
import { PROPOSAL_TEXT } from '../../data/examples';
import { plural } from '../../domain/format';
import { useGraphStore } from '../../store/useGraphStore';
import { ConfirmInline } from '../ui/ConfirmInline';
import { Zh } from '../ui/Zh';
import { GraphEditor } from './GraphEditor';
import styles from './source.module.css';

export function SourcePanel() {
  const mode = useGraphStore((s) => s.mode);
  const parsed = useGraphStore((s) => s.parsed[s.mode]);
  const editorOpen = useGraphStore((s) => s.editorOpen);
  const setEditorOpen = useGraphStore((s) => s.setEditorOpen);
  const clearGraph = useGraphStore((s) => s.clearGraph);
  const copyMapToCustom = useGraphStore((s) => s.copyMapToCustom);
  const loadSource = useGraphStore((s) => s.loadSource);
  const [confirmClear, setConfirmClear] = useState(false);

  const g = parsed.graph;
  const summary = `${plural(g.vertices.length, 'vértice', 'vértices')}, ${plural(g.arestas.length, 'aresta', 'arestas')}, ${
    g.direcionado ? 'direcionado' : 'não direcionado'
  }, ${g.ponderado ? 'com peso' : 'sem peso'}.`;

  return (
    <section className={styles.panel} aria-labelledby="source-title">
      <header className={styles.header}>
        <h2 id="source-title">
          {mode === 'map' ? 'Grafo no mapa' : 'Grafo personalizado'}
          <Zh className="zh-tag">{mode === 'map' ? '香港地圖' : '自訂網絡'}</Zh>
        </h2>
        <p className={styles.summary}>{summary}</p>
      </header>

      {mode === 'map' && (
        <div className={styles.mapIntro}>
          <p>
            Grafo da proposta sobre 8 distritos de Hong Kong. Cada letra é o vértice que vai para a API; o distrito é só a
            placa da estação.
          </p>
          <div className={styles.row}>
            <button type="button" className={styles.smallButton} onClick={() => setEditorOpen(!editorOpen)} aria-expanded={editorOpen}>
              {editorOpen ? 'Fechar editor' : 'Editar arestas e pesos'}
            </button>
            <button type="button" className={styles.smallButton} onClick={copyMapToCustom}>
              Copiar para grafo personalizado
            </button>
          </div>
        </div>
      )}

      {(mode === 'custom' || editorOpen) && <GraphEditor />}

      <footer className={styles.footer}>
        <div className={styles.confirmAnchor}>
          <button type="button" className={styles.clearButton} onClick={() => setConfirmClear(true)} disabled={g.arestas.length === 0 && g.vertices.length === 0}>
            Apagar grafo
          </button>
          <ConfirmInline
            open={confirmClear}
            message={mode === 'map' ? 'Apagar todas as arestas do mapa?' : 'Apagar o grafo atual?'}
            confirmLabel="Apagar"
            onConfirm={() => {
              clearGraph();
              setConfirmClear(false);
              if (mode === 'map') setEditorOpen(true);
            }}
            onCancel={() => setConfirmClear(false)}
          />
        </div>
        {mode === 'map' && (
          <button
            type="button"
            className={styles.smallButton}
            onClick={() => loadSource('map', { text: PROPOSAL_TEXT, direcionado: false, ponderado: true })}
          >
            Restaurar grafo da proposta
          </button>
        )}
      </footer>
    </section>
  );
}
