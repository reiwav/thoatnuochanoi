import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

const SuggestedQuestions = ({ loading, handleRainSummary, handleAIDynamicReport, handleSendQuestion, sx = {} }) => {
    if (loading) return null;

    const questions = [
        { text: 'Lượng mưa hiện tại các điểm?', type: 'rain' },
        { text: 'Tình hình vận hành các trạm bơm.', type: 'question' },
        { text: 'Những điểm nào đang ngập?', type: 'question' },
        { text: 'Dự báo thời tiết 3 ngày tới.', type: 'question' }
    ];

    return (
        <Box sx={{ 
            pb: 2, 
            display: 'flex', 
            gap: 1.5,
            overflowX: 'auto',
            width: '100%',
            maxWidth: '100%',
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            py: 1,
            ...sx
        }}>
            {questions.map((q, i) => (
                <Paper
                    key={i}
                    onClick={() => {
                        if (q.type === 'rain') handleRainSummary();
                        else if (q.type === 'dynamic') handleAIDynamicReport();
                        else handleSendQuestion(q.text);
                    }}
                    sx={{
                        px: 2, py: 0.8, 
                        borderRadius: '18px', 
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        bgcolor: 'white',
                        border: '1px solid', 
                        borderColor: '#0084FF',
                        color: '#0084FF', 
                        fontSize: '13px', 
                        fontWeight: 600,
                        flexShrink: 0,
                        transition: 'all 0.2s',
                        boxShadow: 'none',
                        '&:hover': { 
                            bgcolor: 'rgba(0, 132, 255, 0.05)', 
                            transform: 'translateY(-1px)'
                        },
                        '&:active': { transform: 'scale(0.96)' }
                    }}
                >
                    {q.text}
                </Paper>
            ))}
        </Box>
    );
};

export default SuggestedQuestions;
