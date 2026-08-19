import { Box, Typography, Paper, Stack } from '@mui/material';
import MuiButton from '@components/MuiButton/MuiButton';
import { useMutation } from '@tanstack/react-query';
import { runDailyContentJob } from '@api/jobs';
import { useArticles } from '../articles/hooks/useArticles';

const DashboardPage = () => {
  const { data: articles = [] } = useArticles();
  const runJobMutation = useMutation({ mutationFn: runDailyContentJob });

  const byStatus = articles.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Panel</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Durum dagilimi</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {Object.entries(byStatus).map(([status, count]) => (
            <Typography key={status}>{status}: <strong>{count}</strong></Typography>
          ))}
          {!articles.length && <Typography color="text.secondary">Henuz makale yok.</Typography>}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Manuel tetikleme</Typography>
        <MuiButton onClick={() => runJobMutation.mutate()}>Gunluk Icerik Job'unu Simdi Calistir</MuiButton>
        {runJobMutation.isSuccess && <Typography sx={{ mt: 1 }} color="success.main">Tetiklendi.</Typography>}
      </Paper>
    </Box>
  );
};

export default DashboardPage;
