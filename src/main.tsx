import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-sans-condensed/500.css';
import '@fontsource/ibm-plex-sans-condensed/600.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The shared look loads before the components, whose own stylesheets build on it.
import './ui/styles.css';
import { App } from './ui/App';

const root = document.getElementById('root');
if (!root) throw new Error('The page has no root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
