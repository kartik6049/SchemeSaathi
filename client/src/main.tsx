/** App bootstrap: global CSS, i18n, providers, router. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ProfileProvider } from './context/ProfileContext';
import { ThemeProvider } from './context/ThemeContext';
import './i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ProfileProvider>
          <App />
        </ProfileProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
