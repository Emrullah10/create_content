import { BrowserRouter, useRoutes } from 'react-router-dom';
import ThemeProvider from '@shared/providers/ThemeProvider';
import QueryProvider from '@shared/providers/QueryProvider';
import { routes } from '../router/routes.jsx';

const AppRoutes = () => useRoutes(routes);

const Container = () => (
  <ThemeProvider>
    <QueryProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryProvider>
  </ThemeProvider>
);

export default Container;
