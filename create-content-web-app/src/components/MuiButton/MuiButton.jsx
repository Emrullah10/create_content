import { Button } from '@mui/material';

const SIZE_MAP = { lg: 'large', md: 'medium', sm: 'small', xs: 'small' };

const MuiButton = ({ size = 'md', variant = 'contained', children, ...rest }) => (
  <Button size={SIZE_MAP[size] ?? 'medium'} variant={variant} {...rest}>
    {children}
  </Button>
);

export default MuiButton;
