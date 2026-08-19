import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listThemes, createTheme, toggleTheme } from '@api/themes';
import { queryKeys } from '@shared/constant/query-keys';

export const useThemes = () => useQuery({ queryKey: queryKeys.themes, queryFn: listThemes });

export const useCreateTheme = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTheme,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.themes }),
  });
};

export const useToggleTheme = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => toggleTheme(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.themes }),
  });
};
