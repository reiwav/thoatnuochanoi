import React from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import { IconSend } from '@tabler/icons-react';
import SuggestedQuestions from './SuggestedQuestions';

const ChatInput = ({
    loading,
    input,
    setInput,
    handleSend,
    handleRainSummary,
    handleShowRainCharts,
    handleAIDynamicReport,
    handleRainChart,
    isMobile
}) => {
    return (
        <Box sx={{
            p: { xs: 1, md: 2 },
            bgcolor: 'white',
            borderTop: '1px solid',
            borderColor: 'divider'
        }}>
            <SuggestedQuestions
                loading={loading}
                handleRainSummary={handleRainSummary}
                handleShowRainCharts={handleShowRainCharts}
                handleAIDynamicReport={handleAIDynamicReport}
                handleSendQuestion={handleSend}
                handleRainChart={handleRainChart}
                sx={{ mb: 1, px: 0.5 }}
            />

            <TextField
                fullWidth
                size={isMobile ? "small" : "medium"}
                placeholder="Aa"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                disabled={loading}
                autoComplete="off"
                slotProps={{
                    input: {
                        endAdornment: (
                            <IconButton
                                color="primary"
                                onClick={() => handleSend()}
                                disabled={!input.trim() || loading}
                                sx={{ color: '#0084FF' }}
                            >
                                <IconSend size={24} />
                            </IconButton>
                        ),
                        sx: {
                            borderRadius: '22px',
                            bgcolor: '#f0f2f5',
                            px: 2,
                            '& fieldset': { border: 'none' } // Remove border for Messenger look
                        }
                    }
                }}
            />
        </Box>
    );
};

export default ChatInput;
