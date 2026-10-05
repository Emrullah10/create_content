import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Makale onizlemesi: GFM (tablo), kod bloklari; HTML ISLENMEZ (react-markdown varsayilani guvenli).
export default function MarkdownView({ children }) {
  return (
    <Box sx={{ '& img': { maxWidth: '100%' }, '& pre': { background: '#f4f4f8', p: 1.5, borderRadius: 1, overflow: 'auto' }, '& table': { borderCollapse: 'collapse' }, '& th, & td': { border: '1px solid #ddd', px: 1, py: 0.5 }, lineHeight: 1.7 }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || ''}</ReactMarkdown>
    </Box>
  );
}
