import { SnackbarProvider } from 'notistack';

export default function NotificationProvider({ children }) {
  return (
    <SnackbarProvider maxSnack={3} autoHideDuration={5000} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      {children}
    </SnackbarProvider>
  );
}
