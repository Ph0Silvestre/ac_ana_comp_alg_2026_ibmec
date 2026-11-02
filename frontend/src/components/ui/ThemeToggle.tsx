import { useGraphStore } from '../../store/useGraphStore';
import { KeyHint } from './KeyHint';
import styles from './ui.module.css';

export function ThemeToggle() {
  const theme = useGraphStore((s) => s.theme);
  const toggle = useGraphStore((s) => s.toggleTheme);
  const label = theme === 'dark' ? 'Tema claro' : 'Tema escuro';
  return (
    <button type="button" className={styles.ghost} onClick={toggle} aria-label={`Mudar para ${label.toLowerCase()}`}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
      </svg>
      {label}
      <KeyHint k="T" />
    </button>
  );
}
