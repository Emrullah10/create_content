import { Button, CircularProgress } from '@mui/material';

const SIZES = { lg: 'large', md: 'medium', sm: 'small', xs: 'small' };

// Ham MUI yerine wrapper: boyut (lg|md|sm|xs) ve yukleniyor durumu tek yerde.
export default function MuiButton({ size = 'md', variant = 'contained', loading = false, disabled, startIcon, children, sx, ...rest }) {
  return (
    <Button
      size={SIZES[size] ?? 'medium'}
      variant={variant}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
      sx={size === 'xs' ? { py: 0, fontSize: 12, ...sx } : sx}
      {...rest}
    >
      {children}
    </Button>
  );
}
