import React from 'react';
import { Box, TextField, MenuItem, Stack } from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';

const InundationFilterBar = ({ filters, setFilters, floodLevels }) => {
  return (
    <Box sx={{ mb: 3, px: { xs: 1.5, sm: 0 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Tìm kiếm"
          size="small"
          placeholder="Tìm tên đường, địa chỉ..."
          value={filters.searchQuery}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
          sx={{ width: { xs: '100%', sm: 300 } }}
          slotProps={{
            input: {
              startAdornment: <IconSearch size={18} style={{ marginRight: 8, opacity: 0.5 }} />,
              sx: { borderRadius: 3 }
            }
          }}
        />
        <OrganizationSelect
          value={filters.orgFilter === 'all' ? '' : filters.orgFilter}
          onChange={(e) => setFilters({ orgFilter: e.target.value || 'all' })}
          label="Đơn vị quản lý"
          sx={{ width: { xs: '100%', sm: 300 } }}
        />

        <TextField
          select
          size="small"
          label="Trạng thái"
          value={filters.statusFilter}
          onChange={(e) => setFilters({ statusFilter: e.target.value })}
          sx={{ width: { xs: '100%', sm: 300 } }}
          slotProps={{ input: { sx: { borderRadius: 3 } } }}
          SelectProps={{
            renderValue: (selected) => {
              if (selected === 'all') {
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'transparent',
                        flexShrink: 0
                      }}
                    />
                    Tất cả trạng thái
                  </Box>
                );
              }
              if (selected === 'active') {
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main', flexShrink: 0 }} />
                    Đang ngập
                  </Box>
                );
              }
              if (selected === 'normal') {
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }} />
                    Bình thường
                  </Box>
                );
              }
              const level = floodLevels.find((l) => l.code === selected);
              if (!level) return selected;
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: level.color || 'grey.400',
                      flexShrink: 0
                    }}
                  />
                  {level.name}
                </Box>
              );
            }
          }}
        >
          <MenuItem key="all" value="all" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'transparent',
                flexShrink: 0
              }}
            />
            Tất cả trạng thái
          </MenuItem>
          {floodLevels.length > 0 ? (
            floodLevels.map((level) => (
              <MenuItem key={level.code} value={level.code} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: level.color || 'grey.400',
                    flexShrink: 0
                  }}
                />
                {level.name}
              </MenuItem>
            ))
          ) : (
            <>
              <MenuItem key="active" value="active" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', flexShrink: 0 }} />
                Đang ngập
              </MenuItem>
              <MenuItem key="normal" value="normal" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }} />
                Bình thường
              </MenuItem>
            </>
          )}
        </TextField>
      </Stack>
    </Box>
  );
};

export default InundationFilterBar;
