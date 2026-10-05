import { BrowserRouter } from 'react-router-dom';
import ThemeProvider from '@shared/providers/ThemeProvider';
import NotificationProvider from '@shared/providers/NotificationProvider';
import QueryProvider from '@shared/providers/QueryProvider';
import App from '@router/App';

// Provider sirasi (sablon §16.3): Theme -> Notification -> Query -> Router -> App
export default function Container() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <QueryProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <App />
          </BrowserRouter>
        </QueryProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
