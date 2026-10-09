import { useState } from 'react';
import { Alert, Card, CardContent, Link, Stack, Typography } from '@mui/material';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import MuiButton from '@components/MuiButton/MuiButton';
import MuiTextInput from '@components/MuiTextInput/MuiTextInput';
import StatusChip from '@components/StatusChip/StatusChip';
import { usePublishDevto, useConfirmMedium } from './hooks/useArticles';
import { copyText } from '@utils/clipboard';

// dev.to (taslak/canli) ve Medium (dev.to canli olduktan sonra manuel import) yayin paneli.
export default function PublishingPanel({ article, publications }) {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const code = article.articleCode;
  const publish = usePublishDevto(code);
  const confirm = useConfirmMedium(code);
  const [mediumUrl, setMediumUrl] = useState('');
  const devto = publications.find((p) => p.publicationPlatform === 'devto');
  const medium = publications.find((p) => p.publicationPlatform === 'medium');
  // Medium import sayfasi ?url= parametresini artik doldurmuyor: dev.to adresini panoya kopyalayip sayfayi aciyoruz, kullanici yapistirir.
  // Kopyalama sekme ACILMADAN once yapilir: yeni sekme odagi alinca pano yazimi reddediliyordu (sessizce kopyalanmiyordu).
  const openMediumImport = async () => {
    const url = devto?.publicationExternalUrl;
    const copying = copyText(url);
    window.open('https://medium.com/p/import', '_blank', 'noopener,noreferrer');
    if (!url) return;
    if (await copying) enqueueSnackbar(t('publishing.mediumCopied'), { variant: 'success' });
    else enqueueSnackbar(t('publishing.mediumCopyFailed', { url }), { variant: 'warning', persist: true });
  };
  const canPublish = article.articleStatus === 'approved';

  return (
    <Stack spacing={2}>
      {!canPublish && !devto && <Alert severity="info">{t('publishing.needApproval')}</Alert>}
      <Card variant="outlined"><CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>dev.to</Typography>
          {devto && <StatusChip status={devto.publicationStatus} />}
        </Stack>
        {devto?.publicationExternalUrl && <Link href={devto.publicationExternalUrl} target="_blank" rel="noreferrer noopener" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 1 }}>{devto.publicationExternalUrl} <ArrowSquareOut /></Link>}
        {devto?.publicationError && <Alert severity="error" sx={{ mb: 1 }}>{devto.publicationError}</Alert>}
        {canPublish && (
          <Stack direction="row" spacing={1}>
            <MuiButton variant="outlined" loading={publish.isPending} onClick={() => publish.mutate('draft')}>{devto ? t('publishing.updateDraft') : t('publishing.draft')}</MuiButton>
            <MuiButton loading={publish.isPending} onClick={() => publish.mutate('live')}>{t('publishing.live')}</MuiButton>
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>{t('publishing.devtoNote')}</Typography>
      </CardContent></Card>

      <Card variant="outlined"><CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>Medium</Typography>
          {medium && <StatusChip status={medium.publicationStatus} />}
        </Stack>
        {article.articleStatus !== 'published' ? (
          <Typography variant="body2" color="text.secondary">{t('publishing.mediumWait')}</Typography>
        ) : (
          <Stack spacing={1.5}>
            <Typography variant="body2">{t('publishing.mediumSteps')}</Typography>
            <MuiButton onClick={openMediumImport} variant="outlined" endIcon={<ArrowSquareOut />} sx={{ alignSelf: 'flex-start' }}>{t('publishing.mediumOpen')}</MuiButton>
            {medium?.publicationStatus === 'published' ? (
              <Link href={medium.publicationExternalUrl} target="_blank" rel="noreferrer noopener">{medium.publicationExternalUrl}</Link>
            ) : (
              <Stack direction="row" spacing={1}>
                <MuiTextInput label={t('publishing.mediumUrl')} value={mediumUrl} onChange={(e) => setMediumUrl(e.target.value)} placeholder="https://medium.com/@.../..." />
                <MuiButton loading={confirm.isPending} disabled={!mediumUrl.trim()} onClick={() => confirm.mutate(mediumUrl.trim())}>{t('common.save')}</MuiButton>
              </Stack>
            )}
          </Stack>
        )}
      </CardContent></Card>
    </Stack>
  );
}
