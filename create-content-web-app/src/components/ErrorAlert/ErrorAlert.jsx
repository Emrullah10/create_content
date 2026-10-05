import { Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage } from '@utils/format';

export default function ErrorAlert({ error, sx }) {
  const { t } = useTranslation();
  if (!error) return null;
  return <Alert severity="error" sx={sx}>{apiErrorMessage(error, t)}</Alert>;
}
