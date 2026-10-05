import { Card, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatDateTime, formatDuration } from '@utils/format';

// Asama gecmisi ve LLM kullanimi (rol/asama basina cagri, token, sure, hata).
export default function PipelineTab({ stages, llmUsage }) {
  const { t } = useTranslation();
  const totals = llmUsage.reduce((a, u) => ({ calls: a.calls + u.calls, input: a.input + u.inputTokens, output: a.output + u.outputTokens, ms: a.ms + u.durationMs }), { calls: 0, input: 0, output: 0, ms: 0 });
  return (
    <>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('pipeline.stages')}</Typography>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>{t('articles.stage')}</TableCell><TableCell>{t('pipeline.at')}</TableCell><TableCell>{t('pipeline.detail')}</TableCell></TableRow></TableHead>
          <TableBody>
            {stages.map((s, i) => (
              <TableRow key={`${s.stage}-${i}`}>
                <TableCell><Chip size="small" label={s.stage} /></TableCell>
                <TableCell>{formatDateTime(s.at)}</TableCell>
                <TableCell sx={{ maxWidth: 520 }}><Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>{JSON.stringify(s.content).slice(0, 240)}</Typography></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{t('pipeline.llm')}</Typography>
      <Card variant="outlined">
        <Table size="small">
          <TableHead><TableRow><TableCell>{t('articles.stage')}</TableCell><TableCell>{t('pipeline.role')}</TableCell><TableCell align="right">{t('pipeline.calls')}</TableCell><TableCell align="right">{t('pipeline.tokens')}</TableCell><TableCell align="right">{t('pipeline.duration')}</TableCell><TableCell align="right">{t('pipeline.errors')}</TableCell></TableRow></TableHead>
          <TableBody>
            {llmUsage.map((u) => (
              <TableRow key={`${u.stage}-${u.role}`}>
                <TableCell>{u.stage}</TableCell><TableCell>{u.role}</TableCell><TableCell align="right">{u.calls}</TableCell>
                <TableCell align="right">{u.inputTokens} → {u.outputTokens}</TableCell><TableCell align="right">{formatDuration(u.durationMs)}</TableCell>
                <TableCell align="right">{u.errors || '-'}</TableCell>
              </TableRow>
            ))}
            <TableRow><TableCell colSpan={2}><b>{t('pipeline.total')}</b></TableCell><TableCell align="right"><b>{totals.calls}</b></TableCell><TableCell align="right"><b>{totals.input} → {totals.output}</b></TableCell><TableCell align="right"><b>{formatDuration(totals.ms)}</b></TableCell><TableCell /></TableRow>
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
