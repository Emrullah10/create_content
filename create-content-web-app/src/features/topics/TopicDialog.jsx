import { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import MuiButton from '@components/MuiButton/MuiButton';
import MuiTextInput from '@components/MuiTextInput/MuiTextInput';
import MuiSelect from '@components/MuiSelect/MuiSelect';
import { splitTags } from '@utils/format';

// mode: 'create' (elle konu) | 'approve' (yazar notuyla onay) | 'edit'
export default function TopicDialog({ open, mode, topic, themes = [], saving, onSubmit, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    themeCode: topic?.themeCode ?? themes[0]?.themeCode ?? '',
    title: topic?.topicTitle ?? '',
    angle: topic?.topicAngle ?? '',
    keywords: (topic?.topicKeywords ?? []).join(', '),
    authorNote: topic?.topicAuthorNote ?? '',
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const title = { create: t('topics.add'), approve: t('topics.approveTitle'), edit: t('topics.edit') }[mode];
  const noteOnly = mode === 'approve';
  const valid = noteOnly || (form.title.trim() && (mode === 'edit' || form.themeCode));

  const submit = () => {
    if (mode === 'approve') return onSubmit({ topicCode: topic.topicCode, authorNote: form.authorNote });
    if (mode === 'edit') return onSubmit({ topicCode: topic.topicCode, title: form.title, angle: form.angle, keywords: splitTags(form.keywords), authorNote: form.authorNote });
    return onSubmit({ themeCode: form.themeCode, title: form.title, angle: form.angle, keywords: splitTags(form.keywords), authorNote: form.authorNote });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {noteOnly ? (
            <MuiTextInput label={t('topics.title')} value={topic.topicTitle} disabled />
          ) : (
            <>
              {mode === 'create' && <MuiSelect label={t('nav.themes')} value={form.themeCode} onChange={set('themeCode')} options={themes.map((th) => ({ value: th.themeCode, label: th.themeName }))} />}
              <MuiTextInput label={t('topics.title')} value={form.title} onChange={set('title')} required />
              <MuiTextInput label={t('topics.angle')} value={form.angle} onChange={set('angle')} multiline minRows={2} />
              <MuiTextInput label={t('topics.keywords')} value={form.keywords} onChange={set('keywords')} />
            </>
          )}
          <MuiTextInput label={t('topics.authorNote')} value={form.authorNote} onChange={set('authorNote')} multiline minRows={4} infoLabel={t('topics.authorNoteHint')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <MuiButton variant="text" onClick={onClose}>{t('common.cancel')}</MuiButton>
        <MuiButton loading={saving} disabled={!valid} onClick={submit}>{mode === 'approve' ? t('topics.approve') : t('common.save')}</MuiButton>
      </DialogActions>
    </Dialog>
  );
}
