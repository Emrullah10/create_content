import { Card, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '@components/PageHeader/PageHeader';
import StatusChip from '@components/StatusChip/StatusChip';
import ScoreChip from '@components/ScoreChip/ScoreChip';
import LoadingBlock from '@components/LoadingBlock/LoadingBlock';
import ErrorAlert from '@components/ErrorAlert/ErrorAlert';
import { ROUTE_PATHS } from '@shared/constant/route-paths';
import { formatDateTime } from '@utils/format';
import { useArticles } from './hooks/useArticles';

const TABS = ['all', 'drafting', 'needs_assets', 'review', 'approved', 'published', 'failed'];

export default function ArticlesPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const status = TABS.includes(params.get('status')) ? params.get('status') : 'all';
  const { data, isLoading, error } = useArticles(status === 'all' ? {} : { status });
  const items = data?.items ?? [];
  const counts = data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader title={t('articles.title')} subtitle={t('articles.subtitle')} />
      <ErrorAlert error={error} sx={{ mb: 2 }} />
      <Tabs value={status} onChange={(_, v) => setParams(v === 'all' ? {} : { status: v })} variant="scrollable" sx={{ mb: 2 }}>
        {TABS.map((s) => <Tab key={s} value={s} label={`${s === 'all' ? t('common.all') : t(`status.${s}`)} (${s === 'all' ? total : counts[s] ?? 0})`} />)}
      </Tabs>
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <Card variant="outlined">
          <Table size="small">
            <TableHead><TableRow><TableCell>{t('articles.titleCol')}</TableCell><TableCell>{t('common.status')}</TableCell><TableCell>{t('articles.score')}</TableCell><TableCell>{t('articles.stage')}</TableCell><TableCell>{t('common.updated')}</TableCell></TableRow></TableHead>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={5}>{t('common.empty')}</TableCell></TableRow>}
              {items.map((a) => (
                <TableRow key={a.articleCode} hover component={RouterLink} to={ROUTE_PATHS.article(a.articleCode)} sx={{ textDecoration: 'none' }}>
                  <TableCell sx={{ maxWidth: 520 }}><Typography fontWeight={600} color="text.primary">{a.articleTitle}</Typography><Typography variant="caption" color="text.secondary">{a.articleSlug}</Typography></TableCell>
                  <TableCell><StatusChip status={a.articleStatus} /></TableCell>
                  <TableCell><ScoreChip score={a.articleQualityScore} /></TableCell>
                  <TableCell>{a.articlePipelineStage ?? '-'}</TableCell>
                  <TableCell>{formatDateTime(a.articleUpdatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
