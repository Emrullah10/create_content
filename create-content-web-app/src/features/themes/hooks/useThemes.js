import { useQuery } from '@tanstack/react-query';
import api from '@api';
import { QK } from '@shared/constant/queryKeys';
import useApiMutation from '@hooks/useApiMutation';

export const useThemes = () => useQuery({ queryKey: QK.themes, queryFn: api.listThemes });

export const useSaveTheme = ({ onDone } = {}) =>
  useApiMutation({
    mutationFn: ({ themeCode, ...body }) => (themeCode ? api.updateTheme(themeCode, body) : api.createTheme(body)),
    invalidate: [QK.themes],
    successKey: 'common.saved',
    onSuccess: onDone,
  });

export const useToggleTheme = () => useApiMutation({ mutationFn: ({ themeCode, isActive }) => api.toggleTheme(themeCode, isActive), invalidate: [QK.themes] });
