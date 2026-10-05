import { MenuItem, TextField } from '@mui/material';

// options: [{ value, label }]
export default function MuiSelect({ options = [], size = 'md', ...rest }) {
  return (
    <TextField select size={size === 'lg' ? 'medium' : 'small'} fullWidth {...rest}>
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
