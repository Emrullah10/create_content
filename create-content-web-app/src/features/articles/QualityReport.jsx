import { Alert, Box, Card, CardContent, Chip, Grid, LinearProgress, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

const CRITERIA = ['technical_depth', 'structural_richness', 'clarity', 'originality'];

const CheckIcon = ({ item }) => (item.ok ? <CheckCircle color="#2e7d32" weight="fill" /> : item.severity === 'error' ? <XCircle color="#d32f2f" weight="fill" /> : <WarningCircle color="#ed6c02" weight="fill" />);

// Rapor, ham JSON yerine kartlar: hakem kriterleri, otomatik kontroller, kod/link/asset sonuçları, redaktör turları.
export default function QualityReport({ report }) {
  const { t } = useTranslation();
  if (!report) return <Alert severity="info">{t('report.none')}</Alert>;
  const { judge, checks, code, links, assets, editorRounds = [] } = report;

  return (
    <Grid container spacing={2}>
      {judge && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined"><CardContent>
            <Typography variant="subtitle1" fontWeight={700}>{t('report.judge')}</Typography>
            <Typography variant="caption" color="text.secondary">{t('report.judgeNote', { samples: judge.samples })}{report.capped ? ` · ${t('report.capped', { raw: report.rawScore })}` : ''}</Typography>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              {CRITERIA.map((c) => (
                <Box key={c}>
                  <Stack direction="row" justifyContent="space-between"><Typography variant="body2">{t(`report.criteria.${c}`)}</Typography><Typography variant="body2" fontWeight={700}>{judge.criteria[c].score}/5 <Typography component="span" variant="caption" color="text.secondary">({judge.criteria[c].samples.join(', ')})</Typography></Typography></Stack>
                  <LinearProgress variant="determinate" value={(judge.criteria[c].score / 5) * 100} color={judge.criteria[c].score >= 4 ? 'success' : judge.criteria[c].score >= 3 ? 'warning' : 'error'} sx={{ height: 6, borderRadius: 3 }} />
                  <Typography variant="caption" color="text.secondary">{judge.criteria[c].reasoning}</Typography>
                </Box>
              ))}
            </Stack>
          </CardContent></Card>
        </Grid>
      )}
      {judge && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ mb: 2 }}><CardContent>
            <Typography variant="subtitle2" color="success.main">{t('report.strengths')}</Typography>
            <List dense>{judge.strengths.map((s) => <ListItem key={s} disableGutters><ListItemText primary={s} /></ListItem>)}</List>
            <Typography variant="subtitle2" color="warning.main">{t('report.weaknesses')}</Typography>
            <List dense>{judge.weaknesses.map((s) => <ListItem key={s} disableGutters><ListItemText primary={s} /></ListItem>)}</List>
          </CardContent></Card>
        </Grid>
      )}
      {checks && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined"><CardContent>
            <Typography variant="subtitle1" fontWeight={700}>{t('report.checks')} <Chip size="small" color={checks.passed ? 'success' : 'error'} label={checks.passed ? t('report.passed') : t('report.failed')} /></Typography>
            <List dense>
              {checks.items.map((item) => (
                <ListItem key={item.id} disableGutters alignItems="flex-start" sx={{ gap: 1 }}>
                  <CheckIcon item={item} />
                  <ListItemText primary={t(`report.check.${item.id}`, { defaultValue: item.id })} secondary={item.detail} />
                </ListItem>
              ))}
            </List>
          </CardContent></Card>
        </Grid>
      )}
      <Grid size={{ xs: 12, md: 6 }}>
        <Stack spacing={2}>
          {code && (
            <Card variant="outlined"><CardContent>
              <Typography variant="subtitle1" fontWeight={700}>{t('report.code')}</Typography>
              <Typography variant="body2">{t('report.codeSummary', { total: code.total, validated: code.validated, failed: code.failed })}</Typography>
              {code.failures?.map((f) => <Alert key={f.index} severity="error" sx={{ mt: 1 }}>#{f.index} ({f.lang}): {f.error}</Alert>)}
            </CardContent></Card>
          )}
          {links && (
            <Card variant="outlined"><CardContent>
              <Typography variant="subtitle1" fontWeight={700}>{t('report.links')}</Typography>
              <Typography variant="body2">{t('report.linksSummary', { total: links.total, trusted: links.trusted, broken: links.broken?.length ?? 0 })}</Typography>
              {links.broken?.map((b) => <Alert key={b.url} severity="warning" sx={{ mt: 1 }}>{b.url}: {b.reason}</Alert>)}
            </CardContent></Card>
          )}
          {assets && (
            <Card variant="outlined"><CardContent>
              <Typography variant="subtitle1" fontWeight={700}>{t('report.assets')}</Typography>
              <Typography variant="body2">{t('report.assetsSummary', { uploaded: assets.uploaded, diagrams: assets.diagrams, cover: assets.coverUploaded ? '✓' : '✗' })}</Typography>
              {assets.errors?.map((e) => <Alert key={e.asset} severity="error" sx={{ mt: 1 }}>{e.asset}: {e.error}</Alert>)}
            </CardContent></Card>
          )}
          {editorRounds.length > 0 && (
            <Card variant="outlined"><CardContent>
              <Typography variant="subtitle1" fontWeight={700}>{t('report.editor')}</Typography>
              {editorRounds.map((r) => <Typography key={r.round} variant="body2">{t('report.editorRound', { round: r.round, issues: r.issues, changed: r.changed?.length ?? 0 })}</Typography>)}
            </CardContent></Card>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
}
