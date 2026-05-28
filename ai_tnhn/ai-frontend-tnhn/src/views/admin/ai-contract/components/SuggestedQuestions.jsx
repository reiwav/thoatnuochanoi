import React from 'react';
import { Box, Paper } from '@mui/material';

const SuggestedQuestions = ({ loading, handleSendQuestion }) => {
    if (loading) return null;

    const questions = [
        'Tổng quan hợp đồng hiện tại?',
        'Hợp đồng nào sắp hết hạn?',
        'Hợp đồng đã hết hạn?',
        'Giai đoạn thanh toán sắp đến hạn?',
        'Giai đoạn thanh toán đã quá hạn?',
    ];

    return (
        <Box sx={{ px: 3, pb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {questions.map((text, i) => (
                <Paper
                    key={i}
                    onClick={() => handleSendQuestion(text)}
                    sx={{
                        px: 2, py: 1, borderRadius: '12px', cursor: 'pointer',
                        border: '1px solid', borderColor: 'primary.200',
                        color: 'primary.main', fontSize: '13px', fontWeight: 600,
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' }
                    }}
                >
                    {text}
                </Paper>
            ))}
        </Box>
    );
};

export default SuggestedQuestions;
