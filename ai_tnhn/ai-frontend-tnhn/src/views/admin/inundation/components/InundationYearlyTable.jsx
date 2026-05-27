import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  IconButton
} from '@mui/material';
import { IconEye } from '@tabler/icons-react';

const InundationYearlyTable = ({
  loading,
  aggregatedData,
  year,
  onViewDetails,
  formatDuration
}) => {
  return (
    <TableContainer
      component={Paper}
      sx={{
        display: { xs: 'none', md: 'block' },
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
    >
      <Table>
        <TableHead sx={{ bgcolor: '#f8f9fa' }}>
          <TableRow>
            <TableCell align="center" sx={{ fontWeight: 800, width: '60px', borderRight: '1px solid #ddd' }}>
              STT
            </TableCell>
            <TableCell sx={{ fontWeight: 800, borderRight: '1px solid #ddd' }}>Điểm ngập / Địa bàn</TableCell>
            <TableCell sx={{ fontWeight: 800, borderRight: '1px solid #ddd' }}>
              Đơn vị quản lý
            </TableCell>
            <TableCell sx={{ fontWeight: 800, borderRight: '1px solid #ddd' }}>Địa điểm / Quận</TableCell>
            <TableCell align="center" sx={{ fontWeight: 800, width: '120px', borderRight: '1px solid #ddd' }}>
              Số lần ngập
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 800, width: '180px', borderRight: '1px solid #ddd' }}>
              Tổng thời gian ngập
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 800, width: '100px' }}>
              Thao tác
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                <CircularProgress size={28} color="secondary" />
              </TableCell>
            </TableRow>
          ) : aggregatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                Không có dữ liệu cho năm {year}
              </TableCell>
            </TableRow>
          ) : (
            aggregatedData.map((row, index) => (
              <TableRow key={row.point_id || row.street_name || index} hover>
                <TableCell align="center" sx={{ borderRight: '1px solid #eee' }}>
                  {index + 1}
                </TableCell>
                <TableCell sx={{ borderRight: '1px solid #eee', fontWeight: 600 }}>
                  {row.street_name || row.point_id}
                </TableCell>
                <TableCell sx={{ borderRight: '1px solid #eee', fontWeight: 500 }}>
                  {row.org_name || row.org_code}
                </TableCell>
                <TableCell sx={{ borderRight: '1px solid #eee', fontSize: '0.85rem' }}>
                  {row.address || '...'}
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    borderRight: '1px solid #eee',
                    fontWeight: 700,
                    color: 'error.main',
                    fontSize: '1.1rem'
                  }}
                >
                  {row.count}
                </TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid #eee', fontWeight: 600 }}>
                  {formatDuration(row.total_duration)}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    color="primary"
                    onClick={() => onViewDetails(row)}
                    sx={{
                      borderRadius: '8px',
                      p: 1,
                      '&:hover': {
                        bgcolor: 'primary.lighter',
                        boxShadow: '0 4px 10px rgba(33,150,243,0.15)'
                      }
                    }}
                  >
                    <IconEye size={20} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default InundationYearlyTable;
