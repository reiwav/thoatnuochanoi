import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import inundationApi from 'api/inundation';
import InundationHistoryTimeline from './InundationHistoryTimeline';
import { Box, Typography } from '@mui/material';

const InundationPointHistoryView = ({ pointId: propPointId, hideHeader = false }) => {
    const [searchParams] = useSearchParams();
    const pointId = propPointId || searchParams.get('id');

    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [history, setHistory] = useState([]);

    const loadHistory = useCallback(async (lastHistoryId = null) => {
        if (!pointId) {
            setHistory([]);
            setHasMore(false);
            setTotal(0);
            return;
        }

        const isLoadMore = !!lastHistoryId;
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const limit = 5;
            const response = await inundationApi.getPointHistory(pointId, lastHistoryId, limit);

            let dataArr = [];
            let totalCount = 0;
            if (response) {
                dataArr = Array.isArray(response) ? response : (response.data || response.items || []);
                totalCount = typeof response.total === 'number' ? response.total : dataArr.length;
            }

            setHistory(prev => {
                const combined = isLoadMore ? [...prev, ...dataArr] : dataArr;
                const merged = [];
                const seenIds = new Set();
                for (const item of combined) {
                    if (!seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        merged.push(item);
                    }
                }

                setHasMore(merged.length < totalCount);
                return merged;
            });
            setTotal(totalCount);
        } catch (err) {
            console.error('Failed to load point history:', err);
            if (!isLoadMore) {
                setHistory([]);
                setHasMore(false);
                setTotal(0);
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [pointId]);

    useEffect(() => {
        if (pointId) {
            loadHistory();
        } else {
            setHistory([]);
            setHasMore(false);
            setTotal(0);
        }
    }, [pointId, loadHistory]);

    if (!pointId) {
        return (
            <Box sx={{ py: 6, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                <Typography color="textSecondary" variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Vui lòng chọn một điểm ngập để xem lịch sử bản tin
                </Typography>
            </Box>
        );
    }

    return (
        <InundationHistoryTimeline
            history={history}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            hideHeader={hideHeader}
            title="Lịch sử điểm ngập"
            onLoadMore={() => {
                const lastItem = history[history.length - 1];
                loadHistory(lastItem?.id);
            }}
        />
    );
};

export default InundationPointHistoryView;
