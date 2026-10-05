import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage } from '@utils/format';

// Mutation + hata/başarı bildirimi + ilgili sorguların geçersiz kılınması tek yerde.
export default function useApiMutation({ mutationFn, invalidate = [], successKey, onSuccess }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn,
    onSuccess: (data, vars) => {
      invalidate.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      if (successKey) enqueueSnackbar(t(successKey), { variant: 'success' });
      onSuccess?.(data, vars);
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error, t), { variant: 'error' }),
  });
}
