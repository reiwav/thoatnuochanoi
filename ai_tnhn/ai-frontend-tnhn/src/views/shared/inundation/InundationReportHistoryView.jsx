import React, { useState, useEffect, useCallback } from 'react';
import inundationApi from 'api/inundation';
import InundationHistoryTimeline from './InundationHistoryTimeline';
import { Box, Typography } from '@mui/material';

const InundationReportHistoryView = ({ reportId, hideHeader = false }) => {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    const loadHistory = useCallback(async () => {
        if (!reportId) {
            setHistory([]);
            return;
        }

        setLoading(true);
        try {
            const response = await inundationApi.getReportHistory(reportId);

            let dataArr = [];
            if (response) {
                dataArr = Array.isArray(response) ? response : (response.data || response.items || []);
            }
            
            // Deduplicate just in case
            const merged = [];
            const seenIds = new Set();
            for (const item of dataArr) {
                if (!seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    merged.push(item);
                }
            }
            
            setHistory(merged);
        } catch (err) {
            console.error('Failed to load report history:', err);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, [reportId]);

    useEffect(() => {
        if (reportId) {
            loadHistory();
        } else {
            setHistory([]);
        }
    }, [reportId, loadHistory]);

    if (!reportId) {
        return (
            <Box sx={{ py: 6, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                <Typography color="textSecondary" variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Vui lòng chọn một đợt ngập để xem lịch sử bản tin
                </Typography>
            </Box>
        );
    }

    return (
        <InundationHistoryTimeline
            history={history}
            loading={loading}
            loadingMore={false}
            hasMore={false}
            hideHeader={hideHeader}
            title="Lịch sử đợt ngập"
            onLoadMore={() => {}}
        />
    );
};

export default InundationReportHistoryView;
