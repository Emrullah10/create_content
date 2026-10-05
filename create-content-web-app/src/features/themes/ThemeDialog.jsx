import { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import MuiButton from '@components/MuiButton/MuiButton';
import MuiTextInput from '@components/MuiTextInput/MuiTextInput';
import { splitTags } from '@utils/format';

const initial = (theme) => ({
  name: theme?.themeName ?? '',
  description: theme?.themeDescription ?? '',
  tags: (theme?.themeTags ?? []).join(', '),
  targetAudience: theme?.themeTargetAudience ?? '',
  expertiseNotes: theme?.themeExpertiseNotes ?? '',
  weight: String(theme?.themeWeight ?? 1),
});

export default function ThemeDialog({ open, theme, saving, onSave, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => initial(theme));
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const submit = () =>
    onSave({ themeCode: theme?.themeCode, name: form.name, description: form.description, tags: splitTags(form.tags), targetAudience: form.targetAudience, expertiseNotes: form.expertiseNotes, weight: Number(form.weight) });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{theme ? t('themes.edit') : t('themes.new')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <MuiTextInput label={t('themes.name')} value={form.name} onChange={set('name')} required />
          <MuiTextInput label={t('themes.description')} value={form.description} onChange={set('description')} multiline minRows={2} />
          <MuiTextInput label={t('themes.tags')} value={form.tags} onChange={set('tags')} infoLabel={t('themes.tagsHint')} />
          <MuiTextInput label={t('themes.audience')} value={form.targetAudience} onChange={set('targetAudience')} />
          <MuiTextInput label={t('themes.weight')} type="number" value={form.weight} onChange={set('weight')} slotProps={{ htmlInput: { min: 1, max: 10 } }} infoLabel={t('themes.weightHint')} />
          <MuiTextInput label={t('themes.notes')} value={form.expertiseNotes} onChange={set('expertiseNotes')} multiline minRows={4} infoLabel={t('themes.notesHint')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <MuiButton variant="text" onClick={onClose}>{t('common.cancel')}</MuiButton>
        <MuiButton loading={saving} disabled={!form.name.trim()} onClick={submit}>{t('common.save')}</MuiButton>
      </DialogActions>
    </Dialog>
  );
}
