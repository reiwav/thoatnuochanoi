import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Button, Grid } from '@mui/material';
import { IconFileExport } from '@tabler/icons-react';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';

const InundationYearlyFilterBar = ({
  year,
  onYearChange,
  years,
  canFilterAllOrgs,
  selectedOrgId,
  onOrgChange,
  onExport
}) => {
  return (
    <Grid container spacing={2} alignItems="center" sx={{ mb: 1 }}>
      <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Chọn năm</InputLabel>
          <Select
            value={year}
            label="Chọn năm"
            onChange={(e) => onYearChange(e.target.value)}
            sx={{ borderRadius: 3 }}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {canFilterAllOrgs && (
        <Grid size={{ xs: 12, sm: 5, md: 4.5 }}>
          <OrganizationSelect
            value={selectedOrgId}
            onChange={(e) => onOrgChange(e.target.value)}
            label="Chọn xí nghiệp"
            sx={{ borderRadius: 3 }}
          />
        </Grid>
      )}

      <Grid size={{ xs: 12, sm: 3, md: 3 }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<IconFileExport size="1.2rem" />}
          onClick={onExport}
          sx={{ borderRadius: 3, boxShadow: 'none', height: 40, whiteSpace: 'nowrap' }}
        >
          Xuất ra Excel
        </Button>
      </Grid>
    </Grid>
  );
};

export default InundationYearlyFilterBar;
