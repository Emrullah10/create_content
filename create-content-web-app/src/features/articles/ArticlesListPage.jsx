import { useNavigate } from 'react-router-dom';
import { Box, Typography, Stack, Paper, Chip } from '@mui/material';
import { useArticles } from './hooks/useArticles';

const STATUS_COLOR = {
  drafting: 'default',
  needs_assets: 'warning',
  review: 'info',
  approved: 'success',
  publishing: 'warning',
  published: 'success',
  failed: 'error',
};

const ArticlesListPage = () => {
  const { data: articles = [], isLoading } = useArticles();
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Makaleler</Typography>

      {isLoading ? <Typography>Yukleniyor...</Typography> : (
        <Stack spacing={1}>
          {articles.map((article) => (
            <Paper
              key={article.id}
              sx={{ p: 2, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => navigate(`/articles/${article.id}`)}
            >
              <Box>
                <Typography variant="subtitle1">{article.title}</Typography>
                <Typography variant="body2" color="text.secondary">Kalite: {article.qualityScore ?? '-'}</Typography>
              </Box>
              <Chip label={article.status} color={STATUS_COLOR[article.status] ?? 'default'} size="small" />
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default ArticlesListPage;
