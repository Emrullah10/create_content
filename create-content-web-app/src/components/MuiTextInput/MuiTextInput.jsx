import { TextField } from '@mui/material';

export default function MuiTextInput({ size = 'md', infoLabel, helperText, ...rest }) {
  return <TextField size={size === 'lg' ? 'medium' : 'small'} fullWidth helperText={helperText ?? infoLabel} {...rest} />;
}
