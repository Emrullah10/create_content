import { Box, Typography, Stack, Paper } from '@mui/material';
import MuiButton from '@components/MuiButton/MuiButton';
import { useMutation } from '@tanstack/react-query';
import { retryPublications } from '@api/publications';

const PublicationsPage = () => {
  const retryMutation = useMutation({ mutationFn: retryPublications });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Yayinlar</Typography>
      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Basarisiz yayinlari (dev.to/Medium) manuel tekrar dene. Medium token yoksa "pending_import"
          durumundaki yayinlar icin makale detayindaki canonical URL'i Medium "Import a story" akisina
          elle yapistirin: https://medium.com/p/import
        </Typography>
        <MuiButton onClick={() => retryMutation.mutate()}>Basarisiz Yayinlari Tekrar Dene</MuiButton>
      </Paper>
    </Box>
  );
};

export default PublicationsPage;
