import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function Footer() {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 3, mt: 'auto' }}>
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        &copy; 2026 Bản quyền thuộc về{' '}
        <Typography component="span" sx={{ color: 'primary.main', fontWeight: 800 }}>
          Hanoi Sewerage and Drainage Company (HSDC)
        </Typography>
      </Typography>
      <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500 }}>
          HTBC mùa mưa
        </Typography>
      </Stack>
    </Stack>
  );
}
