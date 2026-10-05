import { useState } from 'react';
import { Card, Chip, IconButton, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { PencilSimple, Plus } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import MuiButton from '@components/MuiButton/MuiButton';
import PageHeader from '@components/PageHeader/PageHeader';
import LoadingBlock from '@components/LoadingBlock/LoadingBlock';
import ErrorAlert from '@components/ErrorAlert/ErrorAlert';
import ThemeDialog from './ThemeDialog';
import { useSaveTheme, useThemes, useToggleTheme } from './hooks/useThemes';

export default function ThemesPage() {
  const { t } = useTranslation();
  const { data = [], isLoading, error } = useThemes();
  const toggle = useToggleTheme();
  const [editing, setEditing] = useState(null); // null kapali | {} yeni | tema
  const save = useSaveTheme({ onDone: () => setEditing(null) });

  return (
    <>
      <PageHeader title={t('themes.title')} subtitle={t('themes.subtitle')} actions={<MuiButton startIcon={<Plus />} onClick={() => setEditing({})}>{t('themes.new')}</MuiButton>} />
      <ErrorAlert error={error} />
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('themes.name')}</TableCell>
                <TableCell>{t('themes.tags')}</TableCell>
                <TableCell>{t('themes.weight')}</TableCell>
                <TableCell>{t('themes.notes')}</TableCell>
                <TableCell>{t('common.active')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 && <TableRow><TableCell colSpan={6}>{t('common.empty')}</TableCell></TableRow>}
              {data.map((th) => (
                <TableRow key={th.themeCode} hover>
                  <TableCell><Typography fontWeight={600}>{th.themeName}</Typography><Typography variant="caption" color="text.secondary">{th.themeTargetAudience}</Typography></TableCell>
                  <TableCell><Stack direction="row" spacing={0.5} flexWrap="wrap">{(th.themeTags ?? []).map((tag) => <Chip key={tag} size="small" label={tag} />)}</Stack></TableCell>
                  <TableCell>{th.themeWeight}</TableCell>
                  <TableCell>{th.themeExpertiseNotes ? <Chip size="small" color="success" label={t('themes.hasNotes')} /> : <Chip size="small" variant="outlined" label={t('themes.noNotes')} />}</TableCell>
                  <TableCell><Switch size="small" checked={th.themeIsActive} onChange={(e) => toggle.mutate({ themeCode: th.themeCode, isActive: e.target.checked })} /></TableCell>
                  <TableCell align="right"><Tooltip title={t('common.edit')}><IconButton size="small" onClick={() => setEditing(th)}><PencilSimple /></IconButton></Tooltip></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {editing && <ThemeDialog key={editing.themeCode ?? 'new'} open theme={editing.themeCode ? editing : null} saving={save.isPending} onSave={save.mutate} onClose={() => setEditing(null)} />}
    </>
  );
}
