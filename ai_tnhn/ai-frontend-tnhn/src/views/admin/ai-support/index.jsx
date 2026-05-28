import React from 'react';
import { Box, CircularProgress, SwipeableDrawer, Zoom, Fab } from '@mui/material';
import { IconArrowDown } from '@tabler/icons-react';

// project components
import MessageItem from './components/MessageItem';
import ChatHeader from './components/ChatHeader';
import ChatInput from './components/ChatInput';
import StatsContent from './components/StatsContent';
import RainChartDialog from './components/RainChartDialog';
import InundationDetailDialog from '../../shared/inundation/InundationDetailDialog';
import ConstructionReportDialog from './components/ConstructionReportDialog';

// custom hook
import useAiSupport from './hooks/useAiSupport';

const AiSupport = () => {
    const {
        userInfo,
        hasPermission,
        theme,
        isMobile,
        messages,
        input,
        setInput,
        loading,
        stats,
        statsLoading,
        loadingMore,
        showStats,
        setShowStats,
        reportDate,
        setReportDate,
        openReportDialog,
        setOpenReportDialog,
        exporting,
        showScrollBottom,
        rainChart,
        setRainChart,
        inundationDetail,
        setInundationDetail,
        scrollRef,
        handleScroll,
        scrollToBottom,
        handleSend,
        handleRainSummary,
        handleShowRainCharts,
        handleEmailDetail,
        handleListEmails,
        handleListConstructions,
        handleEmcHistory,
        handleQuickReportText,
        handleAIDynamicReport,
        handleQuickReport,
        handleConstructionReport,
        handleRainChart,
        handleInundationClick,
        quotaPercentage,
        formatBytes,
        fetchStats
    } = useAiSupport();

    // Safety guard: if no ai:chat permission, don't render.
    if (!hasPermission('ai:chat')) return null;

    return (
        <Box sx={{
            height: { xs: 'calc(100vh - 64px)', md: 'calc(100vh - 120px)' },
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            position: 'relative',
            bgcolor: '#ffffff',
            borderRadius: { xs: 0, md: '24px' },
            overflow: 'hidden',
            border: { xs: 'none', md: '1px solid' },
            borderColor: 'divider',
            mx: { xs: '-10px', sm: '-16px', md: 0 },
            mt: { xs: '-20px', sm: '-24px', md: 0 },
            mb: { xs: '-20px', sm: '-24px', md: 0 },
            width: { xs: '100.2%', sm: '100.5%', md: '100%' }
        }}>
            <ChatHeader
                showStats={showStats}
                setShowStats={setShowStats}
                hasPermission={hasPermission}
                handleQuickReportText={handleQuickReportText}
                handleAIDynamicReport={handleAIDynamicReport}
                handleQuickReport={handleQuickReport}
                openReportDialog={() => setOpenReportDialog(true)}
                sx={{ bgcolor: 'white' }}
            />

            <Box
                ref={scrollRef}
                onScroll={handleScroll}
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    p: { xs: 1, md: 2.5 },
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'transparent',
                    scrollBehavior: 'smooth',
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: '10px' }
                }}
            >
                <Box sx={{ minHeight: loadingMore ? '40px' : 0, transition: 'min-height 0.2s' }}>
                    {loadingMore && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                            <CircularProgress size={18} thickness={5} sx={{ color: 'rgba(0,0,0,0.2)' }} />
                        </Box>
                    )}
                </Box>
                {messages.map((msg) => (
                    <MessageItem
                        key={msg.id}
                        msg={msg}
                        userInfo={userInfo}
                        handleEmailDetail={handleEmailDetail}
                        handleEmcHistory={handleEmcHistory}
                        handleRainChart={handleRainChart}
                        handleInundationClick={handleInundationClick}
                    />
                ))}
                {loading && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mb: 2, width: '100%', px: { xs: 1, md: 2 } }}>
                        <Box sx={{
                            p: '10px 14px',
                            bgcolor: '#E4E6EB',
                            borderRadius: '18px 18px 18px 4px',
                            width: 'fit-content',
                            maxWidth: '90%'
                        }}>
                            <CircularProgress size={30} color="inherit" sx={{ ml: 1, opacity: 0.5 }} />
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Input Area */}
            <ChatInput
                loading={loading}
                input={input}
                setInput={setInput}
                handleSend={handleSend}
                handleRainSummary={handleRainSummary}
                handleShowRainCharts={handleShowRainCharts}
                handleAIDynamicReport={handleAIDynamicReport}
                handleRainChart={handleRainChart}
                isMobile={isMobile}
            />

            {/* Scroll to Bottom Button */}
            <Zoom in={showScrollBottom}>
                <Fab
                    size="small"
                    color="primary"
                    onClick={scrollToBottom}
                    sx={{ position: 'absolute', bottom: 120, right: 30, bgcolor: 'white', color: '#0084FF', '&:hover': { bgcolor: '#f0f2f5' } }}
                >
                    <IconArrowDown size={20} />
                </Fab>
            </Zoom>

            {/* Stats Drawer (for both Mobile & Desktop) */}
            <SwipeableDrawer
                anchor="right"
                open={showStats}
                onClose={() => setShowStats(false)}
                onOpen={() => setShowStats(true)}
                slotProps={{
                    paper: {
                        sx: { width: { xs: '85%', sm: 400 }, p: 0, borderTopLeftRadius: '24px', borderBottomLeftRadius: '24px' }
                    }
                }}
            >
                <StatsContent
                    stats={stats}
                    statsLoading={statsLoading}
                    fetchStats={fetchStats}
                    formatBytes={formatBytes}
                    quotaPercentage={quotaPercentage}
                    handleListEmails={handleListEmails}
                    handleListConstructions={handleListConstructions}
                />
            </SwipeableDrawer>

            {/* Report Dialog */}
            <ConstructionReportDialog
                open={openReportDialog}
                onClose={() => setOpenReportDialog(false)}
                exporting={exporting}
                reportDate={reportDate}
                setReportDate={setReportDate}
                handleConstructionReport={handleConstructionReport}
            />

            <RainChartDialog
                open={rainChart.open}
                onClose={() => setRainChart(prev => ({ ...prev, open: false }))}
                stationName={rainChart.stationName}
                date={rainChart.date}
                data={rainChart.data}
                loading={rainChart.loading}
            />

            <InundationDetailDialog
                open={inundationDetail.open}
                onClose={() => setInundationDetail({ open: false, point: null })}
                point={inundationDetail.point}
            />
        </Box>
    );
};

export default AiSupport;
