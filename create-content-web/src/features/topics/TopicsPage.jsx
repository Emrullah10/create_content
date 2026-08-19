import { Box, Typography, Stack, Paper, Chip } from '@mui/material';
import MuiButton from '@components/MuiButton/MuiButton';
import { useThemes } from '../themes/hooks/useThemes';
import { useTopics, useGenerateTopics, useApproveTopic, useRejectTopic } from './hooks/useTopics';

const TopicsPage = () => {
  const { data: themes = [] } = useThemes();
  const { data: topics = [], isLoading } = useTopics('suggested');
  const generateMutation = useGenerateTopics();
  const approveMutation = useApproveTopic();
  const rejectMutation = useRejectTopic();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Konu Kuyrugu</Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
        {themes.map((theme) => (
          <MuiButton
            key={theme.id}
            variant="outlined"
            size="sm"
            onClick={() => generateMutation.mutate({ themeId: theme.id, count: 15 })}
          >
            "{theme.name}" icin AI ile baslik uret
          </MuiButton>
        ))}
      </Stack>

      {isLoading ? <Typography>Yukleniyor...</Typography> : (
        <Stack spacing={1}>
          {topics.map((topic) => (
            <Paper key={topic.id} sx={{ p: 2 }}>
              <Typography variant="subtitle1">{topic.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{topic.angle}</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                {(topic.keywords ?? []).map((kw) => <Chip key={kw} label={kw} size="small" />)}
              </Stack>
              <Stack direction="row" spacing={1}>
                <MuiButton size="sm" onClick={() => approveMutation.mutate(topic.id)}>Onayla</MuiButton>
                <MuiButton size="sm" variant="outlined" color="error" onClick={() => rejectMutation.mutate(topic.id)}>Reddet</MuiButton>
              </Stack>
            </Paper>
          ))}
          {!topics.length && <Typography color="text.secondary">Kuyrukta konu yok — bir temadan baslik uretin.</Typography>}
        </Stack>
      )}
    </Box>
  );
};

export default TopicsPage;
