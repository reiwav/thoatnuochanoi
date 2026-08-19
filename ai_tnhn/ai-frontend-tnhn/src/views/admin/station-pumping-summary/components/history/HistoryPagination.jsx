import React from 'react';
import { Stack, Typography, Pagination } from '@mui/material';

const HistoryPagination = ({ total, page, perPage, onPageChange }) => {
    if (!total || total <= 0) return null;

    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);
    const pageCount = Math.ceil(total / perPage);

    return (
        <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            justifyContent="space-between" 
            alignItems="center" 
            sx={{ mt: 3, px: 1 }}
        >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Hiển thị <strong>{start}</strong> - <strong>{end}</strong> trên tổng số <strong>{total}</strong> bản ghi
            </Typography>

            {total > perPage && (
                <Pagination 
                    count={pageCount} 
                    page={page} 
                    onChange={(e, v) => onPageChange(v)} 
                    color="primary" 
                    variant="outlined"
                    shape="rounded"
                    size="medium" 
                />
            )}
        </Stack>
    );
};

export default HistoryPagination;
