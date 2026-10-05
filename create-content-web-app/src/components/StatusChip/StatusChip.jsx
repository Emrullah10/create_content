import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

const COLORS = {
  // makale
  drafting: 'info', needs_assets: 'warning', review: 'primary', approved: 'success', publishing: 'info', published: 'success', failed: 'error',
  // konu
  suggested: 'default', used: 'success', rejected: 'default',
  // yayin / is
  pending: 'default', draft: 'info', pending_import: 'warning', running: 'info', succeeded: 'success', skipped: 'default',
};

// Durum kodu -> yerelleştirilmiş etiket (status.<kod>); bilinmeyen kod ham gösterilir.
export default function StatusChip({ status, size = 'small' }) {
  const { t } = useTranslation();
  return <Chip size={size} label={t(`status.${status}`, { defaultValue: status ?? '-' })} color={COLORS[status] ?? 'default'} variant={COLORS[status] === 'default' || !COLORS[status] ? 'outlined' : 'filled'} />;
}
