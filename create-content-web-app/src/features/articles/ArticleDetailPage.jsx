import { useState } from 'react';
import { Alert, Box, Card, Grid, Link, Stack, Tab, Tabs, Typography } from '@mui/material';
import { ArrowLeft, CheckCircle, Prohibit, Trash } from '@phosphor-icons/react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MuiButton from '@components/MuiButton/MuiButton';
import MuiTextInput from '@components/MuiTextInput/MuiTextInput';
import PageHeader from '@components/PageHeader/PageHeader';
import StatusChip from '@components/StatusChip/StatusChip';
import ScoreChip from '@components/ScoreChip/ScoreChip';
import ConfirmDialog from '@components/ConfirmDialog/ConfirmDialog';
import LoadingBlock from '@components/LoadingBlock/LoadingBlock';
import ErrorAlert from '@components/ErrorAlert/ErrorAlert';
import MarkdownView from '@components/MarkdownView/MarkdownView';
import { ROUTE_PATHS } from '@shared/constant/route-paths';
import { useDashboard } from '@features/dashboard/hooks/useDashboard';
import QualityReport from './QualityReport';
import PipelineTab from './PipelineTab';
import SourcesTab from './SourcesTab';
import PublishingPanel from './PublishingPanel';
import { useAbandonArticle, useApproveArticle, useArticleDetail, useResumeArticle, useRetryAssets, useUpdateArticle } from './hooks/useArticles';

const EDITABLE = ['review', 'needs_assets', 'approved', 'failed'];

function ContentTab({ article, code }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(null); // null = sunucudaki deger
  const save = useUpdateArticle(code, { onDone: () => setDraft(null) });
  const editable = EDITABLE.includes(article.articleStatus);
  const body = draft?.body ?? article.articleBodyMarkdown ?? '';
  const title = draft?.title ?? article.articleTitle;
  const dirty = draft !== null;

  return (
    <Stack spacing={2}>
      {article.coverUrl && <Box component="img" src={article.coverUrl} alt="cover" sx={{ maxWidth: 480, borderRadius: 2 }} />}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Stack spacing={1.5}>
            <MuiTextInput label={t('articles.titleCol')} value={title} disabled={!editable} onChange={(e) => setDraft({ title: e.target.value, body })} />
            <MuiTextInput label={t('articles.body')} value={body} disabled={!editable} multiline minRows={24} maxRows={40} onChange={(e) => setDraft({ title, body: e.target.value })} slotProps={{ htmlInput: { style: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 } } }} />
            {editable && <Stack direction="row" spacing={1}><MuiButton loading={save.isPending} disabled={!dirty} onClick={() => save.mutate({ title, bodyMarkdown: body })}>{t('common.save')}</MuiButton><MuiButton variant="text" disabled={!dirty} onClick={() => setDraft(null)}>{t('common.discard')}</MuiButton></Stack>}
            {article.articleStatus === 'approved' && <Typography variant="caption" color="text.secondary">{t('articles.editResets')}</Typography>}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}><Card variant="outlined" sx={{ p: 2, maxHeight: 900, overflow: 'auto' }}><MarkdownView>{body}</MarkdownView></Card></Grid>
      </Grid>
    </Stack>
  );
}

export default function ArticleDetailPage() {
  const { t } = useTranslation();
  const { articleCode } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useArticleDetail(articleCode);
  const { data: dash } = useDashboard();
  const [tab, setTab] = useState('content');
  const [dialog, setDialog] = useState(null); // 'override' | 'abandon'
  const close = () => setDialog(null);
  const approve = useApproveArticle(articleCode, { onDone: close });
  const retry = useRetryAssets(articleCode);
  const resume = useResumeArticle(articleCode);
  const abandon = useAbandonArticle(articleCode, { onDone: () => navigate(ROUTE_PATHS.articles) });

  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorAlert error={error} />;
  const { article, assets, sources, publications, llmUsage, stages } = data;
  const status = article.articleStatus;
  const threshold = dash?.quality?.threshold ?? 75;
  const below = article.articleQualityScore !== null && article.articleQualityScore < threshold;

  const actions = (
    <>
      {status === 'failed' && <MuiButton loading={resume.isPending} onClick={() => resume.mutate()}>{t('articles.resume')}</MuiButton>}
      {status === 'needs_assets' && <MuiButton loading={retry.isPending} onClick={() => retry.mutate()}>{t('articles.retryAssets')}</MuiButton>}
      {status === 'review' && <MuiButton color="success" startIcon={<CheckCircle weight="fill" />} loading={approve.isPending} onClick={() => (below ? setDialog('override') : approve.mutate(false))}>{t('articles.approve')}</MuiButton>}
      {!['publishing', 'published'].includes(status) && <MuiButton variant="outlined" color="error" startIcon={<Trash />} onClick={() => setDialog('abandon')}>{t('articles.abandon')}</MuiButton>}
    </>
  );

  return (
    <>
      <Link component={RouterLink} to={ROUTE_PATHS.articles} underline="none" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 1 }}><ArrowLeft /> {t('articles.back')}</Link>
      <PageHeader title={article.articleTitle} subtitle={article.articleSubtitle} actions={actions} />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <StatusChip status={status} /><ScoreChip score={article.articleQualityScore} /><Typography variant="caption" color="text.secondary">{t('articles.stage')}: {article.articlePipelineStage ?? '-'}</Typography>
      </Stack>
      {article.articleError && <Alert severity="error" sx={{ mb: 2 }}>{article.articleError}</Alert>}
      {status === 'drafting' && <Alert severity="info" sx={{ mb: 2 }}>{t('articles.draftingNote')}</Alert>}
      {status === 'needs_assets' && <Alert severity="warning" sx={{ mb: 2 }}>{t('articles.needsAssets', { count: assets.filter((a) => a.status !== 'uploaded').length })}</Alert>}
      {status === 'review' && below && <Alert severity="warning" sx={{ mb: 2 }}>{t('articles.belowThreshold', { score: article.articleQualityScore, threshold })}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
        <Tab value="content" label={t('articles.tabs.content')} />
        <Tab value="report" label={t('articles.tabs.report')} />
        <Tab value="sources" label={`${t('articles.tabs.sources')} (${sources.length})`} />
        <Tab value="pipeline" label={t('articles.tabs.pipeline')} />
        <Tab value="publishing" label={t('articles.tabs.publishing')} />
      </Tabs>
      {tab === 'content' && <ContentTab key={`${article.articleCode}-${article.articleUpdatedAt}`} article={article} code={articleCode} />}
      {tab === 'report' && <QualityReport report={article.articleQualityReport} />}
      {tab === 'sources' && <SourcesTab sources={sources} brief={article.articleResearchBrief} />}
      {tab === 'pipeline' && <PipelineTab stages={stages} llmUsage={llmUsage} />}
      {tab === 'publishing' && <PublishingPanel article={article} publications={publications} />}

      <ConfirmDialog open={dialog === 'override'} title={t('articles.overrideTitle')} message={t('articles.overrideMsg', { score: article.articleQualityScore, threshold })} confirmLabel={t('articles.approveAnyway')} color="warning" loading={approve.isPending} onConfirm={() => approve.mutate(true)} onClose={close} />
      <ConfirmDialog open={dialog === 'abandon'} title={t('articles.abandonTitle')} message={t('articles.abandonMsg')} onClose={close} confirmLabel={t('articles.abandonRewrite')} loading={abandon.isPending} onConfirm={() => abandon.mutate(true)}>
        <MuiButton variant="text" color="error" startIcon={<Prohibit />} sx={{ mt: 1 }} loading={abandon.isPending} onClick={() => abandon.mutate(false)}>{t('articles.abandonDiscard')}</MuiButton>
      </ConfirmDialog>
    </>
  );
}
