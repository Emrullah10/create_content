import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@shared/translation/i18n';
import '@styles/index.scss';
import Container from '@container/Container';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Container />
  </StrictMode>,
);
