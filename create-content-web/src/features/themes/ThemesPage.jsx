import { useState } from 'react';
import { Box, Typography, TextField, Switch, Stack, Paper } from '@mui/material';
import MuiButton from '@components/MuiButton/MuiButton';
import { useThemes, useCreateTheme, useToggleTheme } from './hooks/useThemes';

const ThemesPage = () => {
  const { data: themes = [], isLoading } = useThemes();
  const createThemeMutation = useCreateTheme();
  const toggleThemeMutation = useToggleTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    createThemeMutation.mutate({ name, description, tags: [], weight: 1 });
    setName('');
    setDescription('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Icerik Nisleri (Temalar)</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField label="Tema adi" value={name} onChange={(e) => setName(e.target.value)} size="small" />
          <TextField label="Aciklama" value={description} onChange={(e) => setDescription(e.target.value)} size="small" sx={{ flex: 1 }} />
          <MuiButton onClick={handleCreate} size="md">Ekle</MuiButton>
        </Stack>
      </Paper>

      {isLoading ? <Typography>Yukleniyor...</Typography> : (
        <Stack spacing={1}>
          {themes.map((theme) => (
            <Paper key={theme.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1">{theme.name}</Typography>
                <Typography variant="body2" color="text.secondary">{theme.description}</Typography>
              </Box>
              <Switch
                checked={theme.isActive}
                onChange={(e) => toggleThemeMutation.mutate({ id: theme.id, isActive: e.target.checked })}
              />
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default ThemesPage;
