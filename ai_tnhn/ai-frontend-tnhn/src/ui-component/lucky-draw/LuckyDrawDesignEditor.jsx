import React, { useState, useEffect } from 'react';
import { Box, Paper, Grid, Stack, Select, MenuItem, FormControl, Typography, Button, Tooltip, Divider, Chip } from '@mui/material';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import TabletIcon from '@mui/icons-material/Tablet';
import MonitorIcon from '@mui/icons-material/Monitor';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LayersClearIcon from '@mui/icons-material/LayersClear';

// Reusing components from design-editor
import Canvas from 'ui-component/design-editor/Canvas';
import PropertiesPanel from 'ui-component/design-editor/PropertiesPanel';
import LuckyDrawToolbar from 'ui-component/design-editor/LuckyDrawToolbar';

// ------- Web4 Default Template -------
const getWeb4Template = (canvasW, canvasH) => {
    const W = canvasW || 1920;
    const H = canvasH || 1080;
    const cx = W / 2;
    const fs = (ratio) => Math.round(W * ratio);
    const px = (ratio) => Math.round(cx + W * ratio);
    const py = (ratio) => Math.round(H * ratio);
    const pw = (ratio) => Math.round(W * ratio);
    const ph = (ratio) => Math.round(H * ratio);

    return [
        // Background image
        {
            id: 'ld-bg', type: 'image', name: 'Nen',
            x: 0, y: 0, width: W, height: H,
            visible: true, groupId: null,
            content: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&q=80',
            style: {
                backgroundSize: 'cover', backgroundPosition: 'center',
                zIndex: 0, opacity: 1, borderWidth: 0, borderRadius: 0,
                borderColor: '#000', borderStyle: 'solid', padding: 0,
                backgroundColor: 'transparent',
            }
        },
        // Dark overlay
        {
            id: 'ld-overlay', type: 'box', name: 'Overlay toi',
            x: 0, y: 0, width: W, height: H,
            visible: true, groupId: null, content: '',
            style: {
                backgroundColor: 'rgba(0,0,0,0.58)',
                zIndex: 1, opacity: 1, borderWidth: 0, borderRadius: 0,
                borderColor: '#000', borderStyle: 'solid', padding: 0,
            }
        },
        // Content card panel
        {
            id: 'ld-card', type: 'box', name: 'Khung noi dung',
            x: Math.round(cx - pw(0.32)), y: py(0.07),
            width: pw(0.64), height: ph(0.86),
            visible: true, groupId: null, content: '',
            style: {
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 28, zIndex: 2, opacity: 1,
                borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)',
                borderStyle: 'solid', padding: 0,
            }
        },
        // Title
        {
            id: 'ld-title', type: 'text', name: 'Tieu de',
            x: Math.round(cx - pw(0.28)), y: py(0.12),
            width: pw(0.56), height: ph(0.10),
            visible: true, groupId: null,
            content: 'CHUC MUNG QUY KHACH TRUNG THUONG',
            style: {
                color: '#FFD700', fontSize: fs(0.026),
                fontFamily: 'Arial Black, sans-serif', fontWeight: '900',
                textAlign: 'center', letterSpacing: 4,
                backgroundColor: 'transparent', zIndex: 3, opacity: 1,
                borderWidth: 0, borderRadius: 0, padding: 0,
                borderColor: '#000', borderStyle: 'solid',
                textShadow: '0 0 30px rgba(255,215,0,0.8)',
            }
        },
        // Lucky Draw Code — animated rolling numbers
        {
            id: 'ld-code', type: 'luckydraw-code', name: 'So quay (Animated)',
            x: Math.round(cx - pw(0.24)), y: py(0.24),
            width: pw(0.48), height: ph(0.22),
            visible: true, groupId: null, content: '',
            isDrawing: true,
            winner: null,
            fontSize: fs(0.09),
            color: '#00C8FF',
            fontWeight: 900,
            backgroundColor: 'transparent',
            borderRadius: 0,
            padding: 0,
            showShadow: true,
            style: {
                color: '#00C8FF', fontSize: fs(0.09),
                fontFamily: 'Arial Black, sans-serif', fontWeight: '900',
                textAlign: 'center',
                backgroundColor: 'transparent', zIndex: 4, opacity: 1,
                borderWidth: 0, borderRadius: 0, padding: 0,
                borderColor: '#000', borderStyle: 'solid',
            }
        },
        // Divider
        {
            id: 'ld-divider', type: 'box', name: 'Duong ke',
            x: Math.round(cx - pw(0.2)), y: py(0.48),
            width: pw(0.4), height: 4,
            visible: true, groupId: null, content: '',
            style: {
                backgroundColor: 'rgba(255,215,0,0.7)',
                borderRadius: 2, zIndex: 4, opacity: 1, borderWidth: 0,
                borderColor: '#000', borderStyle: 'solid', padding: 0,
            }
        },
        // Lucky Draw Name — animated scrolling winner names
        {
            id: 'ld-name', type: 'luckydraw-name', name: 'Ten nguoi trung (Animated)',
            x: Math.round(cx - pw(0.28)), y: py(0.50),
            width: pw(0.56), height: ph(0.16),
            visible: true, groupId: null, content: '',
            isDrawing: true,
            winner: null,
            fontSize: fs(0.038),
            color: '#ffffff',
            fontWeight: 700,
            backgroundColor: 'transparent',
            borderRadius: 0,
            padding: 0,
            showShadow: true,
            style: {
                color: '#ffffff', fontSize: fs(0.038),
                fontFamily: 'Arial, sans-serif', fontWeight: '700',
                textAlign: 'center',
                backgroundColor: 'transparent', zIndex: 4, opacity: 1,
                borderWidth: 0, borderRadius: 0, padding: 0,
                borderColor: '#000', borderStyle: 'solid',
            }
        },
        // Spin button
        {
            id: 'ld-btn-spin', type: 'button', name: 'Nut QUAY SO',
            x: Math.round(cx - pw(0.22)), y: py(0.72),
            width: pw(0.18), height: ph(0.10),
            visible: true, groupId: null,
            content: 'QUAY SO',
            style: {
                backgroundColor: '#c9a690', color: '#ffffff',
                fontSize: fs(0.022),
                fontFamily: 'Arial Black, sans-serif', fontWeight: '900',
                textAlign: 'center', borderRadius: 12, borderWidth: 0,
                zIndex: 5, opacity: 1, borderColor: '#000', borderStyle: 'solid', padding: 0,
                boxShadow: '0 8px 24px rgba(201,166,144,0.5)',
            }
        },
        // Skip button
        {
            id: 'ld-btn-skip', type: 'button', name: 'Nut BO QUA',
            x: Math.round(cx + pw(0.04)), y: py(0.72),
            width: pw(0.18), height: ph(0.10),
            visible: true, groupId: null,
            content: 'BO QUA',
            style: {
                backgroundColor: '#b0a7a3', color: '#ffffff',
                fontSize: fs(0.022),
                fontFamily: 'Arial Black, sans-serif', fontWeight: '900',
                textAlign: 'center', borderRadius: 12, borderWidth: 0,
                zIndex: 5, opacity: 1, borderColor: '#000', borderStyle: 'solid', padding: 0,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }
        },
        // Fireworks effect
        {
            id: 'ld-fx', type: 'effect', name: 'Hieu ung Phao hoa',
            x: Math.round(cx - 350), y: py(0.10),
            width: 700, height: 700,
            visible: true, groupId: null, content: '',
            effectProps: {
                effectType: 'fireworks', intensity: 1, style: 'burst',
                colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#ffffff'],
                color: '#FFD700', side: 'both', shape: 'round',
            },
            style: {
                backgroundColor: 'transparent', zIndex: 10, opacity: 1,
                borderWidth: 0, borderRadius: 0, padding: 0,
                borderColor: '#000', borderStyle: 'solid',
            }
        }
    ];
};

// Helper component for Auto-Scaling (copied/adapted from DesignEditor)
const AutoScaledCanvas = ({ canvasSize, elements, selectedId, handleSelect, handleUpdateElement, handleUpdateElementFinish, handleContextMenu, guides }) => {
    const containerRef = React.useRef(null);
    const [scale, setScale] = useState(1);

    // Font injection effect
    React.useEffect(() => {
        elements.forEach(el => {
            if (el.style?.customFontUrl && el.style?.fontFamily) {
                // Assuming injectFont is available globaly or imported, for now simplicity skipping injectFont logic or we can import it if needed
                // But since resources are usually loaded, we can skip for this basic impl
            }
        });
    }, [elements]);

    React.useEffect(() => {
        const calculateScale = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const padding = 40;
                const availW = clientWidth - padding;
                const availH = clientHeight - padding;

                const scaleW = availW / canvasSize.width;
                const scaleH = availH / canvasSize.height;

                const newScale = Math.min(scaleW, scaleH);
                setScale(newScale <= 0 ? 0.1 : newScale);
            }
        };

        calculateScale();
        const observer = new ResizeObserver(calculateScale);
        if (containerRef.current) observer.observe(containerRef.current);
        window.addEventListener('resize', calculateScale);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', calculateScale);
        };
    }, [canvasSize, containerRef]);

    return (
        <Box ref={containerRef} sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', bgcolor: '#f0f2f5' }}>
            <Box style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                width: canvasSize.width,
                height: canvasSize.height,
                flexShrink: 0,
                position: 'relative'
            }}>
                <Canvas
                    elements={elements}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    onUpdate={handleUpdateElement}
                    onUpdateFinish={handleUpdateElementFinish}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    onContextMenu={handleContextMenu}
                    scale={scale}
                    guides={guides}
                />
            </Box>
        </Box>
    );
};

const LuckyDrawDesignEditor = ({
    elements: initialElements = [],
    canvasSize: initialCanvasSize = { width: 1920, height: 1080 },
    onSave,
}) => {
    const [elements, setElements] = useState(
        initialElements.length > 0 ? initialElements : getWeb4Template(initialCanvasSize.width, initialCanvasSize.height)
    );
    const [selectedId, setSelectedId] = useState(null);
    const [canvasSize, setCanvasSize] = useState(initialCanvasSize);
    const [sizePreset, setSizePreset] = useState('desktop-hd');
    const [guides, setGuides] = useState([]);

    useEffect(() => {
        if (JSON.stringify(initialElements) !== JSON.stringify(elements)) {
            setElements(initialElements || []);
        }
    }, [initialElements]);

    const handleSizeChange = (event) => {
        const value = event.target.value;
        setSizePreset(value);

        switch (value) {
            case 'mobile':
                setCanvasSize({ width: 1080, height: 1920 });
                break;
            case 'tablet':
                setCanvasSize({ width: 1536, height: 2048 });
                break;
            case 'desktop-hd':
                setCanvasSize({ width: 1920, height: 1080 });
                break;
            case 'desktop-2k':
                setCanvasSize({ width: 2560, height: 1440 });
                break;
            case 'desktop-4k':
                setCanvasSize({ width: 3840, height: 2160 });
                break;
            default:
                break;
        }
    };

    const handleAddElement = (type, selectedIdForContext = null, initialProps = {}) => {
        const scale = (canvasSize?.width || 1080) / 1080;
        let baseW = 450;
        let baseH = 450;
        let baseFS = 48;

        if (type === 'text' || type === 'button' || type === 'dynamic-text' || type === 'clock' || type === 'time') {
            baseW = 600;
            baseH = 150;
        } else if (type === 'luckydraw-code') {
            baseW = Math.round(canvasSize.width * 0.48);
            baseH = Math.round(canvasSize.height * 0.22);
        } else if (type === 'luckydraw-name') {
            baseW = Math.round(canvasSize.width * 0.56);
            baseH = Math.round(canvasSize.height * 0.16);
        } else if (type === 'luckydraw-prize' || type === 'luckydraw-wheel') {
            baseW = Math.round(canvasSize.width * 0.4);
            baseH = Math.round(canvasSize.height * 0.12);
        } else if (type === 'box' || type === 'image' || type === 'qrcode' || type === 'avatar') {
            baseW = 400;
            baseH = 400;
        } else if (type === 'circle') {
            baseW = 400;
            baseH = 400;
        } else if (type === 'line') {
            baseW = 600;
            baseH = 20;
        } else if (type === 'table') {
            baseW = 800;
            baseH = 600;
        } else if (type === 'checkin-gallery') {
            baseW = 1920;
            baseH = 400;
        }

        // Apply scale
        const scaledWidth = Math.round((initialProps.width || baseW) * scale);
        const scaledHeight = Math.round((initialProps.height || baseH) * scale);
        const scaledFontSize = Math.round(baseFS * scale);

        let initialX = initialProps.x !== undefined ? initialProps.x : Math.round(((canvasSize?.width || 1080) - scaledWidth) / 2);
        let initialY = initialProps.y !== undefined ? initialProps.y : Math.round(((canvasSize?.height || 1920) - scaledHeight) / 2);

        const newElement = {
            id: crypto.randomUUID(),
            type,
            ...initialProps,
            groupId: null,
            x: initialX,
            y: initialY,
            width: scaledWidth,
            height: scaledHeight,
            content: (type === 'text' || type === 'button') ? 'New Text' : '',
            visible: true,
            style: {
                backgroundColor: 'transparent',
                color: '#000000',
                fontSize: scaledFontSize,
                fontFamily: "Roboto, sans-serif",
                borderWidth: 0,
                borderColor: '#000000',
                borderRadius: 0,
                padding: 0,
                textAlign: 'center',
                borderStyle: 'solid',
                zIndex: elements.length + 1,
                opacity: 1,
                ...initialProps.style
            }
        };

        // Specific defaults per type
        switch (type) {
            case 'luckydraw-code':
                newElement.isDrawing = true;
                newElement.winner = null;
                newElement.fontSize = Math.round(canvasSize.width * 0.06);
                newElement.color = '#00C8FF';
                newElement.fontWeight = 900;
                newElement.backgroundColor = 'transparent';
                newElement.borderRadius = 0;
                newElement.padding = 0;
                newElement.showShadow = true;
                newElement.style.color = '#00C8FF';
                newElement.style.fontSize = Math.round(canvasSize.width * 0.06);
                newElement.style.fontWeight = '900';
                newElement.style.backgroundColor = 'transparent';
                break;
            case 'luckydraw-name':
                newElement.isDrawing = true;
                newElement.winner = null;
                newElement.fontSize = Math.round(canvasSize.width * 0.035);
                newElement.color = '#ffffff';
                newElement.fontWeight = 700;
                newElement.backgroundColor = 'transparent';
                newElement.borderRadius = 0;
                newElement.padding = 0;
                newElement.showShadow = true;
                newElement.style.color = '#ffffff';
                newElement.style.fontSize = Math.round(canvasSize.width * 0.035);
                newElement.style.fontWeight = '700';
                newElement.style.backgroundColor = 'transparent';
                break;
            case 'luckydraw-prize':
                newElement.selectedPrizeName = 'Giai Nhat';
                newElement.style.color = '#FFD700';
                newElement.style.fontSize = Math.round(canvasSize.width * 0.025);
                newElement.style.backgroundColor = 'transparent';
                break;
            case 'button':
                newElement.style.backgroundColor = '#2196f3';
                newElement.style.color = '#ffffff';
                newElement.style.borderRadius = Math.round(8 * scale);
                newElement.style.padding = `${Math.round(16 * scale)}px`;
                break;
            case 'box':
                newElement.style.backgroundColor = '#cccccc';
                newElement.style.borderWidth = 1;
                break;
            case 'circle':
                newElement.style.backgroundColor = '#cccccc';
                newElement.style.borderRadius = '50%';
                break;
            case 'line':
                newElement.style.borderTopWidth = Math.round(4 * scale);
                newElement.style.borderColor = '#000000';
                newElement.height = Math.round(20 * scale); // Logical height for selection
                break;
            case 'image':
                newElement.content = 'https://via.placeholder.com/400';
                newElement.style.backgroundImage = 'url(https://via.placeholder.com/400)';
                break;
            case 'avatar':
                newElement.content = '';
                newElement.style.backgroundImage = 'url(https://i.pravatar.cc/300)';
                newElement.style.borderRadius = '50%';
                newElement.style.borderWidth = 2;
                newElement.style.borderColor = '#ffffff';
                break;
            case 'qrcode':
                newElement.content = 'https://example.com';
                newElement.color = '#000000';
                newElement.backgroundColor = '#ffffff';
                break;
            case 'dynamic-text':
                newElement.content = '{customer_name}';
                newElement.style.color = '#2196f3';
                break;
            case 'clock':
            case 'time':
                newElement.format = 'HH:mm:ss';
                newElement.style.fontSize = Math.round(64 * scale);
                newElement.style.fontWeight = 'bold';
                break;
            case 'slide':
                newElement.images = [];
                newElement.interval = 5000;
                newElement.transitionStyle = 'fade';
                newElement.style.backgroundColor = '#f0f0f0';
                break;
            case 'video':
                newElement.content = '';
                newElement.autoPlay = true;
                newElement.loop = true;
                newElement.muted = true;
                break;
            case 'audio':
                newElement.content = '';
                newElement.autoPlay = false;
                newElement.loop = false;
                break;
            case 'table':
                newElement.content = JSON.stringify([['Header 1', 'Header 2'], ['Cell 1', 'Cell 2']]);
                newElement.style.backgroundColor = '#ffffff';
                newElement.style.borderWidth = 1;
                break;
            case 'checkin-gallery':
                newElement.rows = 2;
                newElement.cols = 4;
                newElement.gap = 10;
                break;
            case 'action-success':
            case 'action-failed':
                newElement.iconSize = Math.round(100 * scale);
                newElement.message = type === 'action-success' ? 'Check-in Thành công!' : 'Check-in Thất bại!';
                newElement.style.color = type === 'action-success' ? '#4caf50' : '#f44336';
                break;
            case 'effect':
                // Effects are largely handled by initialProps passed from Toolbar
                break;
            default:
                break;
        }

        setElements([...elements, newElement]);
        setSelectedId(newElement.id);
    };

    const handleUpdateElement = (id, updates) => {
        setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
    };

    const handleUpdateElementFinish = (id, updates) => {
        handleUpdateElement(id, updates);
        // Here we could save history
    };

    const handleSelect = (id) => setSelectedId(id);
    const handleDelete = (id) => {
        setElements(elements.filter(el => el.id !== id));
        setSelectedId(null);
    };

    const selectedElement = elements.find(el => el.id === selectedId);

    return (
        <Grid container sx={{ height: '100%' }}>
            {/* Left Toolbar */}
            <Grid item sx={{ width: 80, borderRight: '1px solid #e0e0e0', bgcolor: '#fff', overflowY: 'auto' }}>
                <LuckyDrawToolbar onAdd={handleAddElement} selectedId={selectedId} />
            </Grid>

            {/* Main Canvas Area */}
            <Grid item xs sx={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {/* Top Bar */}
                <Paper square elevation={0} sx={{ p: 1, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="subtitle2" sx={{ ml: 1, whiteSpace: 'nowrap' }}>Kich thuoc:</Typography>
                        <FormControl size="small" sx={{ minWidth: 165 }}>
                            <Select value={sizePreset} onChange={handleSizeChange} displayEmpty>
                                <MenuItem value="mobile"><Stack direction="row" gap={1} alignItems="center"><SmartphoneIcon fontSize="small" /> Mobile (1080x1920)</Stack></MenuItem>
                                <MenuItem value="tablet"><Stack direction="row" gap={1} alignItems="center"><TabletIcon fontSize="small" /> Tablet (1536x2048)</Stack></MenuItem>
                                <MenuItem value="desktop-hd"><Stack direction="row" gap={1} alignItems="center"><MonitorIcon fontSize="small" /> HD (1920x1080)</Stack></MenuItem>
                                <MenuItem value="desktop-2k"><Stack direction="row" gap={1} alignItems="center"><MonitorIcon fontSize="small" /> 2K (2560x1440)</Stack></MenuItem>
                                <MenuItem value="desktop-4k"><Stack direction="row" gap={1} alignItems="center"><MonitorIcon fontSize="small" /> 4K (3840x2160)</Stack></MenuItem>
                            </Select>
                        </FormControl>

                        <Divider orientation="vertical" flexItem />

                        <Tooltip title="Load template Web4 mac dinh (nen anh, so quay, ten nguoi trung, 2 button)">
                            <Button
                                size="small" variant="outlined" color="secondary"
                                startIcon={<AutoAwesomeIcon />}
                                onClick={() => {
                                    if (elements.length === 0 || window.confirm('Thao tac nay se thay the thiet ke hien tai bang Template Web4. Tiep tuc?')) {
                                        setElements(getWeb4Template(canvasSize.width, canvasSize.height));
                                        setSelectedId(null);
                                    }
                                }}
                            >
                                Template Web4
                            </Button>
                        </Tooltip>

                        <Tooltip title="Xoa toan bo canvas">
                            <Button
                                size="small" variant="outlined" color="error"
                                startIcon={<LayersClearIcon />}
                                onClick={() => {
                                    if (window.confirm('Xoa toan bo canvas?')) {
                                        setElements([]);
                                        setSelectedId(null);
                                    }
                                }}
                            >
                                Lam trong
                            </Button>
                        </Tooltip>
                    </Stack>

                    <Box sx={{ mr: 2 }}>
                        <Button
                            variant="contained" color="primary"
                            onClick={() => onSave && onSave({ elements, canvasSize })}
                        >
                            Luu thiet ke
                        </Button>
                    </Box>
                </Paper>

                {/* Canvas */}
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                    <AutoScaledCanvas
                        canvasSize={canvasSize}
                        elements={elements}
                        selectedId={selectedId}
                        handleSelect={handleSelect}
                        handleUpdateElement={handleUpdateElement}
                        handleUpdateElementFinish={handleUpdateElementFinish}
                        guides={guides}
                    />
                </Box>
            </Grid>

            {/* Right Properties Panel */}
            <Grid item sx={{ width: 320, borderLeft: '1px solid #e0e0e0', bgcolor: '#fff', overflowY: 'auto' }}>
                <PropertiesPanel
                    element={selectedElement}
                    onUpdate={(updates) => handleUpdateElement(selectedElement.id, updates)}
                    onDelete={() => handleDelete(selectedElement.id)}
                    canvasSize={canvasSize}
                    onCanvasUpdate={(prop, val) => setCanvasSize(prev => ({ ...prev, [prop]: val }))}
                />
            </Grid>
        </Grid>
    );
};

export default LuckyDrawDesignEditor;
