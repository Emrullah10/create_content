import { Alert, Card, CardContent, Chip, Link, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function SourcesTab({ sources, brief }) {
  const { t } = useTranslation();
  if (!sources.length) return <Alert severity="warning">{t('sources.none')}</Alert>;
  return (
    <Stack spacing={2}>
      {brief?.weak && <Alert severity="warning">{t('sources.weak')}</Alert>}
      {sources.map((s) => (
        <Card key={s.researchSourceUrl} variant="outlined"><CardContent>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={s.researchSourceKind} />
            <Link href={s.researchSourceUrl} target="_blank" rel="noreferrer noopener" fontWeight={600}>{s.researchSourceTitle || s.researchSourceUrl}</Link>
          </Stack>
          <List dense>
            {s.researchSourceFacts.map((f) => (
              <ListItem key={f.quote} disableGutters><ListItemText primary={f.claim} secondary={<Typography variant="caption" color="text.secondary">“{f.quote}”</Typography>} /></ListItem>
            ))}
          </List>
        </CardContent></Card>
      ))}
    </Stack>
  );
}
