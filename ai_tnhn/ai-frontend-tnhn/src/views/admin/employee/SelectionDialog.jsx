import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Checkbox, IconButton,
    InputAdornment, Box, Typography, Chip, Stack
} from '@mui/material';
import { IconSearch, IconX, IconCheck, IconSquare, IconCheckbox } from '@tabler/icons-react';

const SelectionDialog = ({ open, onClose, onConfirm, title, items = [], initialSelectedIds = [], labelField = 'name', singleSelect = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        if (open) {
            setSelectedIds(initialSelectedIds);
            setSearchTerm('');
        }
    }, [open, initialSelectedIds]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        const lowerSearch = searchTerm.toLowerCase();
        return items.filter(item => 
            (item[labelField] || '').toLowerCase().includes(lowerSearch)
        );
    }, [items, searchTerm, labelField]);

    const handleToggle = (id) => {
        if (singleSelect) {
            setSelectedIds(prev => prev.includes(id) ? [] : [id]);
            return;
        }
        const currentIndex = selectedIds.indexOf(id);
        const newSelected = [...selectedIds];

        if (currentIndex === -1) {
            newSelected.push(id);
        } else {
            newSelected.splice(currentIndex, 1);
        }

        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.length === items.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map(i => i.id));
        }
    };

    const handleConfirm = () => {
        onConfirm(selectedIds);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth scroll="paper">
            <DialogTitle sx={{ fontWeight: 800, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>{title}</Typography>
                <IconButton onClick={onClose} size="small"><IconX size={20} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                <Box sx={{ p: 2, bgcolor: 'background.paper', position: 'sticky', top: 0, zIndex: 1 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Tìm kiếm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={18} />
                                </InputAdornment>
                            ),
                            endAdornment: searchTerm && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                                        <IconX size={16} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 3, fontWeight: 600 }
                        }}
                    />
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                            Đã chọn: {selectedIds.length} {singleSelect ? '/ 1' : `/ ${items.length}`}
                        </Typography>
                        {!singleSelect && (
                            <Button size="small" onClick={handleSelectAll} sx={{ fontWeight: 700 }}>
                                {selectedIds.length === items.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </Button>
                        )}
                    </Stack>
                </Box>
                <List sx={{ pt: 0 }}>
                    {filteredItems.map((item) => {
                        const labelId = `checkbox-list-label-${item.id}`;
                        const isItemSelected = selectedIds.indexOf(item.id) !== -1;

                        return (
                            <ListItem key={item.id} disablePadding divider>
                                <ListItemButton onClick={() => handleToggle(item.id)} dense>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <Checkbox
                                            edge="start"
                                            checked={isItemSelected}
                                            tabIndex={-1}
                                            disableRipple
                                            inputProps={{ 'aria-labelledby': labelId }}
                                            icon={<IconSquare size={20} />}
                                            checkedIcon={<IconCheckbox size={20} />}
                                        />
                                    </ListItemIcon>
                                    <ListItemText 
                                        id={labelId} 
                                        primary={item[labelField]} 
                                        primaryTypographyProps={{ 
                                            variant: 'body2',
                                            fontWeight: isItemSelected ? 700 : 400,
                                            color: isItemSelected ? 'primary.main' : 'text.primary'
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                    {filteredItems.length === 0 && (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography color="textSecondary" variant="body2">Không tìm thấy kết quả</Typography>
                        </Box>
                    )}
                </List>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit" sx={{ borderRadius: 3 }}>Hủy</Button>
                <Button onClick={handleConfirm} variant="contained" color="primary" sx={{ borderRadius: 3, fontWeight: 700 }}>
                    Xác nhận
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SelectionDialog;
