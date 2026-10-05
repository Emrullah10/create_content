import { FormControlLabel, Switch } from '@mui/material';

export default function MuiSwitch({ label, ...rest }) {
  return <FormControlLabel control={<Switch {...rest} />} label={label} />;
}
