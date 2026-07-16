import React from 'react';
import {
    Paper, Box, Stack, Typography, Chip, Divider, Grid, IconButton
} from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';

const stringToColor = (string) => {
    let hash = 0;
    let i;
    for (i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
};

const getContrastText = (hexcolor) => {
    if (!hexcolor || hexcolor.length < 7) return '#fff';
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000' : '#fff';
};

const EmployeeCard = ({ row, handleOpenEdit, handleDelete, roleLabel, orgName, userRole, hasPermission }) => {
    const roleTxt = roleLabel(row.role);
    const bgColor = stringToColor(roleTxt);
    const textColor = getContrastText(bgColor);

    return (
        <Paper
            sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px',
                borderLeft: `6px solid ${bgColor}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                        {row.name}
                    </Typography>
                    <Chip
                        label={roleTxt}
                        size="small"
                        sx={{
                            bgcolor: bgColor,
                            color: textColor,
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: 'none'
                        }}
                    />
                </Box>
                
                <Stack direction="row" spacing={0.5}>
                    {hasPermission('employee:edit') && (
                        <IconButton size="small" color="primary" onClick={() => handleOpenEdit(row)}>
                            <IconEdit size={18} />
                        </IconButton>
                    )}
                    {hasPermission('employee:delete') && (
                        <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                            <IconTrash size={18} />
                        </IconButton>
                    )}
                </Stack>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="textSecondary" display="block">Email</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                        {row.email}
                    </Typography>
                </Grid>
                
                {userRole !== 'admin_org' && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="textSecondary" display="block">Đơn vị / Xí nghiệp</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {orgName(row.org_id)}
                        </Typography>
                    </Grid>
                )}
                
                <Grid size={6}>
                    <Typography variant="caption" color="textSecondary" display="block">Trạng thái tài khoản</Typography>
                    <Chip 
                        label={row.active ? 'Hoạt động' : 'Ngừng hoạt động'} 
                        color={row.active ? 'success' : 'default'} 
                        size="small" 
                        variant="outlined" 
                        sx={{ fontWeight: 700 }}
                    />
                </Grid>
            </Grid>
        </Paper>
    );
};

export default EmployeeCard;
