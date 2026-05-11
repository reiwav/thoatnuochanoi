import React from 'react';
import { Box, Typography } from '@mui/material';

// Formatting helpers
const formatHeader = (key) => {
    const nameMap = {
        'name': 'Tên trạm', 'total_rain': 'Tổng mưa (mm)', 'level': 'Mực nước (m)',
        'label': 'Loại', 'thoi_gian': 'Cập nhật', 'is_flooding': 'Tình trạng ngập',
        'depth': 'Độ sâu (m)', 'phuong': 'Phường', 'address': 'Địa chỉ',
        'report_date': 'Ngày báo cáo', 'status': 'Trạng thái', 'work_done': 'Công việc đã làm',
        'location': 'Vị trí', 'title': 'Tiêu đề'
    };
    return nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
};

const DefaultTable = ({ title, data }) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const columns = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object' && k !== 'id' && k !== 'old_id');

    return (
        <Box sx={{ my: 1, width: '100%' }}>
            {title && <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase', fontSize: '13px', opacity: 0.8 }}>{title}</Typography>}
            <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '8px', bgcolor: 'background.paper' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                        <tr>
                            {columns.map(col => <th key={col} style={{ padding: '6px 8px', borderBottom: '1px solid rgba(0,0,0,0.1)', textAlign: 'left', fontWeight: 600, color: '#333' }}>{formatHeader(col)}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: 'transparent' }}>
                                {columns.map(col => (
                                    <td key={col} style={{ padding: '6px 8px', color: '#000' }}>
                                        {typeof row[col] === 'boolean' ? (row[col] ? 'Có' : 'Không') : row[col]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Box>
        </Box>
    );
};

export default DefaultTable;
