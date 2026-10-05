import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useTranslation } from 'react-i18next';
import MuiButton from '../MuiButton/MuiButton.jsx';

export default function ConfirmDialog({ open, title, message, confirmLabel, color = 'primary', loading = false, onConfirm, onClose, children }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {message && <DialogContentText>{message}</DialogContentText>}
        {children}
      </DialogContent>
      <DialogActions>
        <MuiButton variant="text" onClick={onClose}>{t('common.cancel')}</MuiButton>
        <MuiButton color={color} loading={loading} onClick={onConfirm}>{confirmLabel ?? t('common.confirm')}</MuiButton>
      </DialogActions>
    </Dialog>
  );
}
