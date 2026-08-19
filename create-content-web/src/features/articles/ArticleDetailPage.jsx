import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Grid, Typography, TextField, Paper, Stack, Chip, Alert, Divider } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import MuiButton from '@components/MuiButton/MuiButton';
import { useArticle, useUpdateArticle, useApproveArticle, usePublishArticle } from './hooks/useArticles';

const ArticleDetailPage = () => {
  const { id } = useParams();
  const { data: article, isLoading } = useArticle(id);
  const updateMutation = useUpdateArticle(id);
  const approveMutation = useApproveArticle(id);
  const publishMutation = usePublishArticle(id);

  const [body, setBody] = useState('');

  useEffect(() => {
    if (article) setBody(article.bodyMarkdown ?? '');
  }, [article?.id]);

  if (isLoading || !article) return <Box sx={{ p: 3 }}><Typography>Yukleniyor...</Typography></Box>;

  const canApprove = article.status === 'review';
  const canPublish = article.status === 'approved';

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5">{article.title}</Typography>
          <Typography variant="body2" color="text.secondary">{article.subtitle}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label={`Kalite: ${article.qualityScore ?? '-'}`} color={article.qualityScore >= 75 ? 'success' : 'warning'} />
          <Chip label={article.status} />
        </Stack>
      </Stack>

      {article.status === 'needs_assets' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Bazi gorseller (diyagram/kapak) render veya upload edilemedi — makale gomulmemis placeholder icerebilir.
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Markdown (duzenlenebilir)</Typography>
          <TextField
            multiline
            fullWidth
            minRows={24}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            sx={{ fontFamily: 'monospace' }}
          />
          <MuiButton sx={{ mt: 1 }} size="sm" variant="outlined" onClick={() => updateMutation.mutate({ bodyMarkdown: body })}>
            Kaydet
          </MuiButton>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Onizleme</Typography>
          {article.coverImageUrl && (
            <Box
              component="img"
              src={article.coverImageUrl}
              alt="Kapak gorseli"
              sx={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 1, mb: 2 }}
            />
          )}
          <Paper sx={{ p: 2, maxHeight: 600, overflow: 'auto' }}>
            <ReactMarkdown>{body}</ReactMarkdown>
          </Paper>
        </Grid>
      </Grid>

      {article.qualityReport && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2">AI Kalite Raporu</Typography>
          <Divider sx={{ my: 1 }} />
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{JSON.stringify(article.qualityReport, null, 2)}</pre>
        </Paper>
      )}

      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <MuiButton disabled={!canApprove} onClick={() => approveMutation.mutate()}>Onayla</MuiButton>
        <MuiButton disabled={!canPublish} color="success" onClick={() => publishMutation.mutate()}>Onayla ve Yayinla</MuiButton>
      </Stack>
    </Box>
  );
};

export default ArticleDetailPage;
