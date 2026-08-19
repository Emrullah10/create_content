import http from '@shared/axios/http';

export const listThemes = async () => (await http.get('/themes')).data;
export const createTheme = async (payload) => (await http.post('/themes', payload)).data;
export const toggleTheme = async (id, isActive) => (await http.patch(`/themes/${id}/toggle`, { isActive })).data;
