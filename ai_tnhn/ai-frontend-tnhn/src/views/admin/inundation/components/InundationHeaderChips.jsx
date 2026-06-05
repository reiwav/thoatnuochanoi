import React from 'react';
import { Stack, Chip, alpha } from '@mui/material';

const InundationHeaderChips = ({
  isMobile,
  floodLevels,
  levelCounts,
  floodedCount,
  normalCount,
  theme,
  selectedStatus,
  onStatusChange,
  totalCount
}) => {
  if (isMobile) return null;

  const getChipStyle = (isActive, color) => {
    return {
      fontWeight: 800,
      fontSize: '0.8rem',
      borderRadius: 2.5,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      height: '32px',
      ...(isActive ? {
        bgcolor: alpha(color, 0.15),
        color: color,
        border: '1.5px solid',
        borderColor: alpha(color, 0.5),
        boxShadow: `0 2px 8px ${alpha(color, 0.2)}`,
        '& .MuiChip-label': { fontWeight: 900 }
      } : {
        bgcolor: 'grey.50',
        color: 'text.secondary',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          bgcolor: alpha(color, 0.08),
          borderColor: alpha(color, 0.3),
          color: color
        }
      })
    };
  };

  const allColor = theme.palette.primary.main;

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {/* Tất cả Chip */}
      <Chip
        label={
          <span>
            Tất cả <span style={{ color: allColor, fontWeight: 900 }}>({totalCount})</span>
          </span>
        }
        onClick={() => onStatusChange('all')}
        sx={getChipStyle(selectedStatus === 'all', allColor)}
      />

      {floodLevels.length > 0 ? (
        floodLevels.map((level) => {
          const count = levelCounts[level.code] || 0;
          const isActive = selectedStatus === level.code;
          const levelColor = level.is_flooding ? (level.color || theme.palette.error.main) : theme.palette.success.main;
          
          return (
            <Chip
              key={level.code}
              label={
                <span>
                  {level.name} <span style={{ color: levelColor, fontWeight: 900 }}>({count})</span>
                </span>
              }
              onClick={() => onStatusChange(level.code)}
              sx={getChipStyle(isActive, levelColor)}
            />
          );
        })
      ) : (
        <>
          <Chip
            label={
              <span>
                Đang ngập <span style={{ color: theme.palette.error.main, fontWeight: 900 }}>({floodedCount})</span>
              </span>
            }
            onClick={() => onStatusChange('active')}
            sx={getChipStyle(selectedStatus === 'active', theme.palette.error.main)}
          />
          <Chip
            label={
              <span>
                Bình thường <span style={{ color: theme.palette.success.main, fontWeight: 900 }}>({normalCount})</span>
              </span>
            }
            onClick={() => onStatusChange('normal')}
            sx={getChipStyle(selectedStatus === 'normal', theme.palette.success.main)}
          />
        </>
      )}
    </Stack>
  );
};

export default InundationHeaderChips;
