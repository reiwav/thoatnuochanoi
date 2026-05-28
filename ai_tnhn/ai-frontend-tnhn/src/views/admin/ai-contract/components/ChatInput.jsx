import React from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import { IconSend } from '@tabler/icons-react';

const ChatInput = ({ input, setInput, handleSend, loading }) => {
    return (
        <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <TextField
                fullWidth
                placeholder="Nhập câu hỏi của bạn tại đây..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                disabled={loading}
                slotProps={{
                    input: {
                        endAdornment: (
                            <IconButton 
                                color="primary" 
                                onClick={() => handleSend()} 
                                disabled={!input.trim() || loading}
                            >
                                <IconSend size={24} />
                            </IconButton>
                        ),
                        sx: { borderRadius: '16px', bgcolor: '#f8fafc', p: '4px 8px' }
                    }
                }}
            />
        </Box>
    );
};

export default ChatInput;
