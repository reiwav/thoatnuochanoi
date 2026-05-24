import React from 'react';
import { Stack, Chip, alpha } from '@mui/material';

const InundationHeaderChips = ({
  isMobile,
  floodLevels,
  levelCounts,
  floodedCount,
  normalCount,
  theme
}) => {
  if (isMobile) return null;

  return (
    <Stack direction="row" spacing={1}>
      {floodLevels.length > 0 ? (
        floodLevels.map((level) => {
          const count = levelCounts[level.code] || 0;
          return (
            <Chip
              key={level.code}
              label={`${count} ${level.name}`}
              variant="filled"
              size="small"
              sx={{
                fontWeight: 900,
                borderRadius: 2,
                bgcolor: level.color || 'grey.400',
                color: '#fff',
                textShadow: '0px 1px 2px rgba(0,0,0,0.35)'
              }}
            />
          );
        })
      ) : (
        <>
          <Chip
            label={`${floodedCount} Đang ngập`}
            color="error"
            variant="filled"
            size="small"
            sx={{ fontWeight: 800, borderRadius: 2 }}
          />
          <Chip
            label={`${normalCount} Bình thường`}
            color="success"
            variant="filled"
            size="small"
            sx={{
              fontWeight: 800,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.success.main, 1),
              color: '#fff'
            }}
          />
        </>
      )}
    </Stack>
  );
};

export default InundationHeaderChips;
