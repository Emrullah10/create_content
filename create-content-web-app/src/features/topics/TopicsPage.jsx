import { useState } from 'react';
import { Alert, Card, IconButton, Stack, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { Check, MagicWand, PencilSimple, Play, Plus, X } from '@phosphor-icons/react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MuiButton from '@components/MuiButton/MuiButton';
import MuiSelect from '@components/MuiSelect/MuiSelect';
import MuiTextInput from '@components/MuiTextInput/MuiTextInput';
import PageHeader from '@components/PageHeader/PageHeader';
import StatusChip from '@components/StatusChip/StatusChip';
import LoadingBlock from '@components/LoadingBlock/LoadingBlock';
import ErrorAlert from '@components/ErrorAlert/ErrorAlert';
import { useThemes } from '@features/themes/hooks/useThemes';
import { useRunPipeline } from '@features/dashboard/hooks/useDashboard';
import TopicDialog from './TopicDialog';
import { useApproveTopic, useCreateTopic, useGenerateTopics, useRejectTopic, useTopics, useUpdateTopic } from './hooks/useTopics';

const TABS = ['suggested', 'approved', 'drafting', 'used', 'rejected'];

export default function TopicsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const status = TABS.includes(params.get('status')) ? params.get('status') : 'suggested';
  const { data, isLoading, error } = useTopics({ status });
  const { data: themes = [] } = useThemes();
  const [dialog, setDialog] = useState(null); // { mode, topic }
  const [genTheme, setGenTheme] = useState('');
  const [genCount, setGenCount] = useState('8');
  const close = () => setDialog(null);
  const generate = useGenerateTopics();
  const create = useCreateTopic({ onDone: close });
  const approve = useApproveTopic({ onDone: close });
  const update = useUpdateTopic({ onDone: close });
  const reject = useRejectTopic();
  const run = useRunPipeline();
  const items = data?.items ?? [];
  const counts = data?.counts ?? {};
  const themeCode = genTheme || themes.find((th) => th.themeIsActive)?.themeCode || '';

  return (
    <>
      <PageHeader title={t('topics.title2')} subtitle={t('topics.subtitle')} actions={<MuiButton startIcon={<Plus />} onClick={() => setDialog({ mode: 'create' })}>{t('topics.add')}</MuiButton>} />
      <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <Typography variant="subtitle2" sx={{ minWidth: 120 }}>{t('topics.aiSuggest')}</Typography>
          <MuiSelect sx={{ minWidth: 260 }} label={t('nav.themes')} value={themeCode} onChange={(e) => setGenTheme(e.target.value)} options={themes.map((th) => ({ value: th.themeCode, label: th.themeName }))} />
          <MuiTextInput sx={{ maxWidth: 110 }} type="number" label={t('topics.count')} value={genCount} onChange={(e) => setGenCount(e.target.value)} slotProps={{ htmlInput: { min: 1, max: 20 } }} />
          <MuiButton startIcon={<MagicWand />} loading={generate.isPending} disabled={!themeCode} onClick={() => generate.mutate({ themeCode, count: Number(genCount) })}>{t('topics.suggest')}</MuiButton>
        </Stack>
        {generate.data?.skipped?.length > 0 && <Alert severity="info" sx={{ mt: 2 }}>{t('topics.skipped', { count: generate.data.skipped.length })}</Alert>}
      </Card>
      <ErrorAlert error={error} sx={{ mb: 2 }} />
      <Tabs value={status} onChange={(_, v) => setParams({ status: v })} sx={{ mb: 2 }}>
        {TABS.map((s) => <Tab key={s} value={s} label={`${t(`status.${s}`)} (${counts[s] ?? 0})`} />)}
      </Tabs>
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <Card variant="outlined">
          <Table size="small">
            <TableHead><TableRow><TableCell>{t('topics.title')}</TableCell><TableCell>{t('nav.themes')}</TableCell><TableCell>{t('common.status')}</TableCell><TableCell align="right" /></TableRow></TableHead>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={4}>{t('common.empty')}</TableCell></TableRow>}
              {items.map((tp) => (
                <TableRow key={tp.topicCode} hover>
                  <TableCell sx={{ maxWidth: 520 }}>
                    <Typography fontWeight={600}>{tp.topicTitle}</Typography>
                    <Typography variant="caption" color="text.secondary" component="div">{tp.topicAngle}</Typography>
                    {tp.topicAuthorNote && <Typography variant="caption" color="primary" component="div">✎ {tp.topicAuthorNote}</Typography>}
                  </TableCell>
                  <TableCell>{tp.themeName}</TableCell>
                  <TableCell><StatusChip status={tp.topicStatus} /></TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {['suggested', 'rejected'].includes(tp.topicStatus) && <Tooltip title={t('topics.approve')}><IconButton size="small" color="success" onClick={() => setDialog({ mode: 'approve', topic: tp })}><Check /></IconButton></Tooltip>}
                      {['suggested', 'approved'].includes(tp.topicStatus) && <Tooltip title={t('topics.reject')}><IconButton size="small" color="error" onClick={() => reject.mutate(tp.topicCode)}><X /></IconButton></Tooltip>}
                      {['suggested', 'approved', 'rejected'].includes(tp.topicStatus) && <Tooltip title={t('common.edit')}><IconButton size="small" onClick={() => setDialog({ mode: 'edit', topic: tp })}><PencilSimple /></IconButton></Tooltip>}
                      {tp.topicStatus === 'approved' && <MuiButton size="xs" startIcon={<Play weight="fill" />} loading={run.isPending} onClick={() => run.mutate(tp.topicCode)}>{t('topics.writeNow')}</MuiButton>}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {dialog && (
        <TopicDialog
          key={`${dialog.mode}-${dialog.topic?.topicCode ?? 'new'}`}
          open
          mode={dialog.mode}
          topic={dialog.topic}
          themes={themes}
          saving={create.isPending || approve.isPending || update.isPending}
          onClose={close}
          onSubmit={(body) => (dialog.mode === 'create' ? create.mutate(body) : dialog.mode === 'approve' ? approve.mutate(body) : update.mutate(body))}
        />
      )}
    </>
  );
}
