import { Chip } from '@mui/material';
import { scoreColor } from '@utils/format';

export default function ScoreChip({ score, size = 'small' }) {
  return <Chip size={size} color={scoreColor(score)} label={score === null || score === undefined ? '-' : score} />;
}
