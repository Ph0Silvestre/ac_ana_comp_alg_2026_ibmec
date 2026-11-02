import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/overpass/400.css';
import '@fontsource/overpass/600.css';
import '@fontsource/overpass/800.css';
import '@fontsource/noto-sans-tc/500.css';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './app/App';
import { applyTheme, useGraphStore } from './store/useGraphStore';

applyTheme(useGraphStore.getState().theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
