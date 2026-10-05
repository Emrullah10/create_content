import { Card, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MuiButton from '@components/MuiButton/MuiButton';
import PageHeader from '@components/PageHeader/PageHeader';
import StatusChip from '@components/StatusChip/StatusChip';
import LoadingBlock from '@components/LoadingBlock/LoadingBlock';
import ErrorAlert from '@components/ErrorAlert/ErrorAlert';
import { ROUTE_PATHS } from '@shared/constant/route-paths';
import { formatDateTime } from '@utils/format';
import { usePublications, useRetryPublications } from './hooks/usePublications';

const PLATFORM_LABEL = { devto: 'dev.to', medium: 'Medium' };

export default function PublicationsPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = usePublications();
  const retry = useRetryPublications();
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader title={t('publications.title')} subtitle={t('publications.subtitle')} actions={<MuiButton variant="outlined" loading={retry.isPending} onClick={() => retry.mutate()}>{t('publications.retry')}</MuiButton>} />
      <ErrorAlert error={error} sx={{ mb: 2 }} />
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <Card variant="outlined">
          <Table size="small">
            <TableHead><TableRow><TableCell>{t('articles.titleCol')}</TableCell><TableCell>{t('publications.platform')}</TableCell><TableCell>{t('common.status')}</TableCell><TableCell>{t('publications.link')}</TableCell><TableCell>{t('common.updated')}</TableCell></TableRow></TableHead>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={5}>{t('common.empty')}</TableCell></TableRow>}
              {items.map((p) => (
                <TableRow key={p.publicationId} hover>
                  <TableCell sx={{ maxWidth: 420 }}><Link component={RouterLink} to={ROUTE_PATHS.article(p.articleCode)} underline="hover">{p.articleTitle}</Link></TableCell>
                  <TableCell>{PLATFORM_LABEL[p.publicationPlatform] ?? p.publicationPlatform}</TableCell>
                  <TableCell><StatusChip status={p.publicationStatus} />{p.publicationError && <Typography variant="caption" color="error" component="div" noWrap sx={{ maxWidth: 260 }}>{p.publicationError}</Typography>}</TableCell>
                  <TableCell>{p.publicationExternalUrl ? <Link href={p.publicationExternalUrl} target="_blank" rel="noreferrer noopener">{t('publications.open')}</Link> : '-'}</TableCell>
                  <TableCell>{formatDateTime(p.publicationUpdatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
