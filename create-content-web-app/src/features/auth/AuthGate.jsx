import { useEffect, useState } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@api';
import MuiButton from '@components/MuiButton/MuiButton';
import LoadingBlock from '@components/LoadingBlock/LoadingBlock';
import ErrorAlert from '@components/ErrorAlert/ErrorAlert';
import { QK } from '@shared/constant/queryKeys';

// Sunucuda PANEL_PASSWORD tanimliysa oturum yoksa giris ekrani, yoksa panel. Oturum cerezi sunucuda (HttpOnly).
export default function AuthGate({ children }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const session = useQuery({ queryKey: QK.authSession, queryFn: api.getAuthSession, retry: false, staleTime: Infinity });
  const login = useMutation({
    mutationFn: () => api.login(password),
    onSuccess: () => { setPassword(''); qc.invalidateQueries(); },
  });

  useEffect(() => {
    const onExpired = () => qc.setQueryData(QK.authSession, (s) => s && { ...s, authenticated: false });
    window.addEventListener('cc-unauthenticated', onExpired);
    return () => window.removeEventListener('cc-unauthenticated', onExpired);
  }, [qc]);

  if (session.isLoading) return <LoadingBlock />;
  if (session.error) return <ErrorAlert error={session.error} sx={{ m: 3 }} />;
  if (session.data?.authenticated) return children;

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card variant="outlined" component="form" sx={{ p: 4, width: 360, display: 'grid', gap: 2 }} onSubmit={(e) => { e.preventDefault(); login.mutate(); }}>
        <Typography variant="h5" fontWeight={800} color="primary">{t('app.title')}</Typography>
        <ErrorAlert error={login.error} />
        <TextField type="password" label={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
        <MuiButton type="submit" loading={login.isPending} disabled={!password}>{t('auth.login')}</MuiButton>
      </Card>
    </Box>
  );
}
