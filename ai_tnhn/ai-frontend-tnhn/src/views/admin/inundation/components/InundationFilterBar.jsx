import React from 'react';
import { Box, TextField, MenuItem, Stack } from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';

const InundationFilterBar = ({ filters, setFilters }) => {
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
          label="Hiện trạng"
          value={filters.conditionFilter || 'all'}
          onChange={(e) => setFilters({ conditionFilter: e.target.value })}
          sx={{ width: { xs: '100%', sm: 300 } }}
          slotProps={{ input: { sx: { borderRadius: 3 } } }}
        >
          <MenuItem value="all">Tất cả hiện trạng</MenuItem>
          <MenuItem value="site_checked">Đã kiểm tra hiện trường</MenuItem>
          <MenuItem value="flooded_today">Ngập trong ngày</MenuItem>
          <MenuItem value="flooded_1h">Ngập {'>'} 1h</MenuItem>
          <MenuItem value="flooded_2h">Ngập {'>'} 2h</MenuItem>
          <MenuItem value="flooded_4h">Ngập {'>'} 4h</MenuItem>
          <MenuItem value="flooded_overnight">Ngập qua ngày</MenuItem>
        </TextField>
      </Stack>
    </Box>
  );
};

export default InundationFilterBar;
