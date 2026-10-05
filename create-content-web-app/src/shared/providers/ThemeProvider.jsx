import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#4f46e5' }, background: { default: '#f6f7fb' } },
  shape: { borderRadius: 10 },
  typography: { fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', button: { textTransform: 'none', fontWeight: 600 } },
});

export default function ThemeProvider({ children }) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
