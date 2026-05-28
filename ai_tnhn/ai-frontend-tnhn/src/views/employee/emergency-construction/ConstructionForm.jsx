import {
    Box, Typography, Paper, TextField, Button,
    CircularProgress, Stack, Avatar, Divider,
    IconButton, useMediaQuery, MenuItem, Dialog, DialogContent
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconClipboardCheck, IconHistory, IconSend, IconAlertTriangle, IconTrash, IconArrowLeft, IconMapPin, IconFileText, IconBulb, IconCloudUpload, IconMessageExclamation, IconCar, IconRefresh, IconUser, IconX, IconChevronLeft, IconChevronRight, IconDownload } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import MainCard from 'ui-component/cards/MainCard';
import { getInundationImageUrl } from 'utils/imageHelper';
import { InputAdornment } from '@mui/material';
import useAuthStore from 'store/useAuthStore';

// Hook
import useConstructionForm from './hooks/useConstructionForm';

const TabSwitcher = ({ tab, setTab, visibleTabs }) => {
    if (visibleTabs.length <= 1) return null;

    return (
        <Box sx={{ display: 'flex', bgcolor: 'grey.100', borderRadius: 100, p: 0.5, mb: 3 }}>
            {visibleTabs.map((t) => (
                <Box
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    sx={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8,
                        py: 0.9, borderRadius: 100, cursor: 'pointer', transition: 'all .2s',
                        bgcolor: tab === t.id ? 'background.paper' : 'transparent',
                        boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
                        color: tab === t.id ? 'secondary.main' : 'text.secondary',
                        fontWeight: tab === t.id ? 700 : 500
                    }}
                >
                    {t.icon}
                    <Typography sx={{ fontSize: '1rem', fontWeight: 'inherit', color: 'inherit', lineHeight: 1 }}>{t.label}</Typography>
                </Box>
            ))}
        </Box>
    );
};

const ConstructionForm = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const {
        navigate,
        constructionId,
        constructionName,
        editReportId,
        tabValue,
        setTabValue,
        loading,
        fetching,
        history,
        constructions,
        selectedConstructionId,
        setSelectedConstructionId,
        workDone, setWorkDone,
        issues, setIssues,
        order, setOrder,
        location, setLocation,
        conclusion, setConclusion,
        influence, setInfluence,
        proposal, setProposal,
        imagePreviews,
        existingImages,
        handleImageChange,
        removeImage,
        removeExistingImage,
        handleOpenLocalViewer,
        viewer,
        handleOpenViewer,
        handleCloseViewer,
        handlePrev,
        handleNext,
        handleSubmit,
        handleExportExcel,
        hasPermission
    } = useConstructionForm();

    const renderForm = () => (
        <Stack spacing={2.5} sx={{ p: { xs: 2, md: 3 } }}>
            {!constructionId && (
                <TextField
                    select fullWidth label="Chọn công trình" value={selectedConstructionId}
                    onChange={(e) => setSelectedConstructionId(e.target.value)}
                    required
                    sx={{ mb: 1 }}
                    slotProps={{
                        input: { sx: { borderRadius: 3, fontWeight: 700 } }
                    }}
                >
                    {constructions.map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                </TextField>
            )}
            <TextField
                select fullWidth label="Lệnh số" value={order}
                onChange={(e) => setOrder(e.target.value)}
                required
                slotProps={{
                    input: {
                        startAdornment: <InputAdornment position="start"><IconClipboardCheck size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                        sx: { borderRadius: 3 }
                    }
                }}
            >
                {[...Array(100)].map((_, i) => (
                    <MenuItem key={i + 1} value={`Lệnh ${i + 1}`}>Lệnh {i + 1}</MenuItem>
                ))}
            </TextField>

            <TextField
                fullWidth label="Vị trí" placeholder="Nhập vị trí..."
                value={location} onChange={(e) => setLocation(e.target.value)} required
                slotProps={{
                    input: {
                        startAdornment: <InputAdornment position="start"><IconMapPin size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                        sx: { borderRadius: 3 }
                    }
                }}
            />

            <TextField
                fullWidth multiline rows={3} label="Mô tả chung công việc trong ngày"
                placeholder="Mô tả chi tiết công việc..."
                value={workDone} onChange={(e) => setWorkDone(e.target.value)} required
                slotProps={{
                    input: {
                        startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><IconFileText size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                        sx: { borderRadius: 3, '& .MuiInputBase-input': { lineHeight: 1.5 } }
                    }
                }}
            />

            <Divider />

            <TextField
                fullWidth multiline rows={2} label="Kết luận"
                placeholder="Nhập kết luận..."
                value={conclusion} onChange={(e) => setConclusion(e.target.value)} required
                slotProps={{
                    input: {
                        startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><IconBulb size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                        sx: { borderRadius: 3 }
                    }
                }}
            />

            <TextField
                fullWidth multiline rows={2} label="Ảnh hưởng"
                placeholder="Nhập ảnh hưởng..."
                value={influence} onChange={(e) => setInfluence(e.target.value)}
                slotProps={{
                    input: {
                        startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><IconCar size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                        sx: { borderRadius: 3 }
                    }
                }}
            />

            <TextField
                fullWidth multiline rows={2} label="Bất cập, đề xuất"
                placeholder="Nhập đề xuất..."
                value={proposal} onChange={(e) => setProposal(e.target.value)}
                slotProps={{
                    input: {
                        startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><IconMessageExclamation size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                        sx: { borderRadius: 3 }
                    }
                }}
            />

            <TextField
                fullWidth multiline rows={2} label="Vướng mắc, khó khăn (nếu có)"
                placeholder="Nhập vướng mắc..."
                value={issues} onChange={(e) => setIssues(e.target.value)}
                slotProps={{
                    input: {
                        startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><IconAlertTriangle size={18} color={theme.palette.text.secondary} /></InputAdornment>,
                        sx: { borderRadius: 3 }
                    }
                }}
            />

            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>Hình ảnh Cập nhật tiến độ</Typography>
                <Box>
                    <Box component="label" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 2, cursor: 'pointer', bgcolor: 'grey.50', transition: 'all .2s', '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.lighter' } }}>
                        <input type="file" hidden multiple accept="image/*" onChange={handleImageChange} />
                        <IconCloudUpload size={26} color={theme.palette.primary.main} />
                        <Typography variant="body2" color="text.secondary">Thêm ảnh</Typography>
                    </Box>
                    {existingImages.length > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>Ảnh đã có (Click để xem):</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {existingImages.map((img, idx) => (
                                    <Box key={idx} sx={{ position: 'relative', width: 68, height: 68 }}>
                                        <Avatar
                                            variant="rounded"
                                            src={getInundationImageUrl(img)}
                                            sx={{ width: '100%', height: '100%', borderRadius: 1.5, border: '1px solid', borderColor: 'divider', cursor: 'pointer' }}
                                            onClick={() => handleOpenViewer(existingImages, idx)}
                                        />
                                        <IconButton
                                            size="small" color="error"
                                            onClick={() => removeExistingImage(idx)}
                                            sx={{ position: 'absolute', top: -6, right: -6, bgcolor: 'error.main', color: '#fff', p: 0.3, '&:hover': { bgcolor: 'error.dark' }, zIndex: 1 }}
                                        >
                                            <IconTrash size={11} />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                    {imagePreviews.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block', width: '100%' }}>Ảnh mới thêm:</Typography>
                            {imagePreviews.map((preview, idx) => (
                                <Box key={idx} sx={{ position: 'relative', width: 68, height: 68 }}>
                                    <Avatar
                                        variant="rounded" src={preview}
                                        sx={{ width: '100%', height: '100%', borderRadius: 1.5, border: '1px solid', borderColor: 'divider', cursor: 'zoom-in' }}
                                        onClick={() => handleOpenLocalViewer(idx)}
                                    />
                                    <IconButton
                                        size="small" color="error"
                                        onClick={() => removeImage(idx)}
                                        sx={{ position: 'absolute', top: -6, right: -6, bgcolor: 'error.main', color: '#fff', p: 0.3, '&:hover': { bgcolor: 'error.dark' }, zIndex: 1 }}
                                    >
                                        <IconTrash size={11} />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            </Box>

            <Button
                fullWidth variant="contained" color="primary" size="large" onClick={handleSubmit} disabled={loading || fetching}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <IconSend size={20} />}
                sx={{ borderRadius: 100, py: 1.5, fontWeight: 700, mt: 1 }}
            >
                {fetching ? 'Đang tải...' : editReportId ? 'Cập nhật Cập nhật tiến độ' : 'Gửi Cập nhật tiến độ'}
            </Button>
        </Stack>
    );

    const renderHistory = () => (
        <Box sx={{ p: { xs: 1, md: 2 }, bgcolor: 'background.paper', minHeight: '100%' }}>
            {/* Header section similar to InundationDetail */}
            <Paper sx={{ mb: 3, p: isMobile ? 1.5 : 2, bgcolor: 'secondary.lighter', borderRadius: 3, boxShadow: 'none', border: '1px solid', borderColor: 'secondary.light' }}>
                <Stack spacing={1}>
                    <Typography variant={isMobile ? "h4" : "h3"} color="secondary.dark" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                        {selectedConstructionId ? (constructions.find(c => c.id === selectedConstructionId)?.name || constructionName) : 'Vui lòng chọn công trình'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}> Cập nhật theo dõi tiến độ chi tiết</Typography>
                </Stack>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
            ) : history.length === 0 ? (
                <Typography align="center" color="textSecondary" sx={{ py: 5, fontStyle: 'italic' }}>Chưa có dữ liệu Theo dõi tiến độ</Typography>
            ) : (
                <Box sx={{ px: 1 }}>
                    {history.map((h, idx) => (
                        <Box key={idx} sx={{ display: 'flex', gap: isMobile ? 1.5 : 2, position: 'relative' }}>
                            {idx < history.length - 1 && (
                                <Box sx={{ position: 'absolute', left: 11, top: 32, width: 2, height: 'calc(100% - 20px)', bgcolor: 'grey.200' }} />
                            )}
                            <Box sx={{
                                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, zIndex: 1, mt: 1,
                                bgcolor: idx === 0 ? 'secondary.main' : 'grey.300',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '4px solid white', boxShadow: '0 0 0 1px #eee'
                            }}>
                                <IconRefresh size={10} />
                            </Box>
                            <Box sx={{ pb: 3, flex: 1, minWidth: 0 }}>
                                <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} sx={{ mb: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>{h.order || `Cập nhật tiến độ ${dayjs(h.report_date * 1000).format('DD/MM')}`}</Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600, opacity: 0.8 }}>
                                        {dayjs(h.report_date * 1000).format('DD/MM/YYYY • HH:mm')}
                                    </Typography>
                                </Stack>

                                <Typography variant="body1" sx={{ mb: 1.5, color: 'text.secondary', lineHeight: 1.6 }}>{h.work_done}</Typography>

                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.5 }}>
                                    {h.location && (
                                        <Box sx={{ px: 1.2, py: 0.5, bgcolor: 'grey.50', borderRadius: 100, border: '1px solid', borderColor: 'grey.200', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <IconMapPin size={14} color={theme.palette.text.secondary} />
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{h.location}</Typography>
                                        </Box>
                                    )}
                                    {h.reporter_name && (
                                        <Box sx={{ px: 1.2, py: 0.5, bgcolor: 'secondary.lighter', borderRadius: 100, border: '1px solid', borderColor: 'secondary.light', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <IconUser size={14} color={theme.palette.secondary.main} />
                                            <Typography variant="caption" sx={{ color: 'secondary.dark', fontWeight: 700 }}>{h.reporter_name}</Typography>
                                        </Box>
                                    )}
                                </Box>

                                {h.conclusion && (
                                    <Box sx={{ mb: 1.5, p: 1.5, bgcolor: 'primary.lighter', borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                                        <Typography variant="caption" color="primary.dark" fontWeight={900} display="block" sx={{ mb: 0.5 }}>KẾT LUẬN:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{h.conclusion}</Typography>
                                    </Box>
                                )}

                                {h.issues && (
                                    <Box sx={{ mb: 1.5, p: 1.5, bgcolor: 'error.lighter', borderRadius: 2, borderLeft: '4px solid', borderColor: 'error.main' }}>
                                        <Typography variant="caption" color="error.dark" fontWeight={900} display="block" sx={{ mb: 0.5 }}>VƯỚNG MẮC:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{h.issues}</Typography>
                                    </Box>
                                )}

                                {h.images && h.images.length > 0 && (
                                    <Box sx={{ display: 'flex', gap: 1.2, mt: 1, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 4 } }}>
                                        {h.images.map((img, iidx) => (
                                            <Box
                                                key={iidx} component="img" src={getInundationImageUrl(img)}
                                                onClick={(e) => { e.stopPropagation(); handleOpenViewer(h.images, iidx); }}
                                                sx={{ width: 90, height: 90, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'zoom-in', transition: 'transform .2s', flexShrink: 0, '&:hover': { transform: 'scale(1.02)' } }}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );

    const renderContent = () => (
        <Box sx={{ width: '100%' }}>
            <TabSwitcher
                tab={tabValue}
                setTab={setTabValue}
                visibleTabs={[
                    { id: 0, label: 'Theo dõi tiến độ', icon: <IconHistory size={18} /> },
                    { id: 1, label: 'Cập nhật tiến độ', icon: <IconClipboardCheck size={18} /> }
                ]}
            />
            {tabValue === 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: { xs: 1, md: 2 }, mb: -1, position: 'relative', zIndex: 10 }}>
                    {useAuthStore().hasPermission('emergency:export') && (
                        <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            startIcon={<IconDownload size={16} />}
                            onClick={handleExportExcel}
                            disabled={history.length === 0}
                            sx={{ borderRadius: 2, bgcolor: 'background.paper' }}
                        >
                            Xuất Excel
                        </Button>
                    )}
                </Box>
            )}
            {tabValue === 0 ? renderHistory() : renderForm()}

            {/* Image Slider / Lightbox */}
            <Dialog open={viewer.open} onClose={handleCloseViewer} maxWidth="lg" slotProps={{ paper: { sx: { bgcolor: 'black', borderRadius: 4, overflow: 'hidden', position: 'relative' } } }}>
                <IconButton onClick={handleCloseViewer} sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
                    <IconX size={20} />
                </IconButton>

                <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', position: 'relative' }}>
                    {viewer.images.length > 1 && (
                        <>
                            <IconButton onClick={handlePrev} sx={{ position: 'absolute', left: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}>
                                <IconChevronLeft size={32} />
                            </IconButton>
                            <IconButton onClick={handleNext} sx={{ position: 'absolute', right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}>
                                <IconChevronRight size={32} />
                            </IconButton>
                        </>
                    )}

                    <Box
                        component="img"
                        src={viewer.isLocal ? viewer.images[viewer.index] : getInundationImageUrl(viewer.images[viewer.index])}
                        sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
                    />

                    <Box sx={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
                        <Typography sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.5)', display: 'inline-block', px: 2, py: 0.5, borderRadius: 10, fontSize: '0.85rem' }}>
                            {viewer.index + 1} / {viewer.images.length}
                        </Typography>
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );

    if (isMobile) {
        return (
            <Box sx={{ px: 2, pt: 2, pb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <IconButton size="small" onClick={() => navigate(-1)}>
                        <IconArrowLeft size={20} />
                    </IconButton>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {constructionName}
                    </Typography>
                </Box>
                {renderContent()}
            </Box>
        );
    }

    return (
        <MainCard
            title={selectedConstructionId ? (constructions.find(c => c.id === selectedConstructionId)?.name || constructionName) : "Báo cáo tiến độ"}
            secondary={<Button variant="outlined" size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => navigate(-1)}>Quay lại</Button>}
        >
            <Box sx={{ maxWidth: 640, mx: 'auto' }}>{renderContent()}</Box>
        </MainCard>
    );
};

export default ConstructionForm;
