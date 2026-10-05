import { Alert, Box, Card, CardContent, Chip, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Play } from '@phosphor-icons/react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MuiButton from '@components/MuiButton/MuiButton';
import PageHeader from '@components/PageHeader/PageHeader';
import StatusChip from '@components/StatusChip/StatusChip';
import LoadingBlock from '@components/LoadingBlock/LoadingBlock';
import ErrorAlert from '@components/ErrorAlert/ErrorAlert';
import { ROUTE_PATHS } from '@shared/constant/route-paths';
import { formatDateTime } from '@utils/format';
import { useDashboard, useRunPipeline } from './hooks/useDashboard';

const ARTICLE_STATUSES = ['drafting', 'needs_assets', 'review', 'approved', 'published', 'failed'];
const TOPIC_STATUSES = ['suggested', 'approved', 'drafting', 'used'];

const CountCard = ({ label, value, to }) => (
  <Card variant="outlined" component={to ? RouterLink : 'div'} to={to} sx={{ textDecoration: 'none' }}>
    <CardContent>
      <Typography variant="h4" fontWeight={800}>{value ?? 0}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useDashboard();
  const run = useRunPipeline();

  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorAlert error={error} />;
  const running = data.jobs.some((j) => j.jobRunStatus === 'running');

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle', { cron: data.schedule.dailyCron, tz: data.schedule.timezone })}
        actions={<MuiButton startIcon={<Play weight="fill" />} loading={run.isPending || running} disabled={!data.llm.configured} onClick={() => run.mutate()}>{t('dashboard.writeNow')}</MuiButton>}
      />
      {!data.llm.configured && <Alert severity="warning" sx={{ mb: 2 }}>{t('dashboard.llmMissing')}</Alert>}
      {(data.topics.approved ?? 0) === 0 && <Alert severity="info" sx={{ mb: 2 }}>{t('dashboard.noApproved')}</Alert>}

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{t('dashboard.articles')}</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {ARTICLE_STATUSES.map((s) => (
          <Grid key={s} size={{ xs: 6, md: 2 }}><CountCard label={t(`status.${s}`)} value={data.articles[s]} to={`${ROUTE_PATHS.articles}?status=${s}`} /></Grid>
        ))}
      </Grid>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{t('dashboard.topics')}</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {TOPIC_STATUSES.map((s) => (
          <Grid key={s} size={{ xs: 6, md: 3 }}><CountCard label={t(`status.${s}`)} value={data.topics[s]} to={`${ROUTE_PATHS.topics}?status=${s}`} /></Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined"><CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('dashboard.recentJobs')}</Typography>
            <Table size="small">
              <TableHead><TableRow><TableCell>{t('dashboard.job')}</TableCell><TableCell>{t('common.status')}</TableCell><TableCell>{t('dashboard.startedAt')}</TableCell><TableCell>{t('dashboard.result')}</TableCell></TableRow></TableHead>
              <TableBody>
                {data.jobs.length === 0 && <TableRow><TableCell colSpan={4}>{t('common.empty')}</TableCell></TableRow>}
                {data.jobs.map((j) => (
                  <TableRow key={j.jobRunId}>
                    <TableCell>{j.jobRunJobName}</TableCell>
                    <TableCell><StatusChip status={j.jobRunStatus} /></TableCell>
                    <TableCell>{formatDateTime(j.jobRunStartedAt)}</TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Typography variant="caption" color={j.jobRunError ? 'error' : 'text.secondary'} noWrap component="div">
                        {j.jobRunError || j.jobRunStats?.reason || (j.jobRunStats?.articleCode ? `#${j.jobRunStats.articleCode}` : '')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined"><CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('dashboard.models')}</Typography>
            <Stack spacing={1}>
              {Object.entries(data.llm.roles ?? {}).map(([role, cfg]) => (
                <Box key={role}><Chip size="small" label={role} sx={{ mr: 1 }} /><Typography component="span" variant="body2">{cfg.model}</Typography></Box>
              ))}
              {Object.entries(data.ports).map(([name, label]) => (
                <Box key={name}><Chip size="small" variant="outlined" label={name} sx={{ mr: 1 }} /><Typography component="span" variant="body2" color="text.secondary">{label}</Typography></Box>
              ))}
              <Typography variant="caption" color="text.secondary">{t('dashboard.quality', { threshold: data.quality.threshold, rounds: data.quality.maxRounds, samples: data.quality.judgeSamples })}</Typography>
            </Stack>
          </CardContent></Card>
        </Grid>
      </Grid>
    </>
  );
}
