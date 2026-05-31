import { useState, useEffect, useCallback, useMemo } from 'react';
import axiosClient from 'api/axiosClient';
import useInundationStore from 'store/useInundationStore';
import stationApi from 'api/station';
import dayjs from 'dayjs';

export const useChatIntegrations = ({ setMessages, setLoading, shouldScrollToBottom }) => {
    const { points, fetchInitialData } = useInundationStore();
    const [inundationDetail, setInundationDetail] = useState({ open: false, point: null });
    const [inundationHistory, setInundationHistory] = useState({ open: false, point: null, year: null, fromTime: null, toTime: null });

    useEffect(() => {
        if (points.length === 0) {
            fetchInitialData();
        }
    }, [points, fetchInitialData]);

    const [stats, setStats] = useState({
        unread_emails: 0,
        drive_quota: { limit: 0, usage: 0, usage_in_drive: 0 },
        ai_usage: { total_tokens: 0, total_cost_usd: 0, request_count: 0 }
    });
    const [statsLoading, setStatsLoading] = useState(true);
    const [showStats, setShowStats] = useState(false);
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [openReportDialog, setOpenReportDialog] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Rain Chart State
    const [rainChart, setRainChart] = useState({
        open: false,
        loading: false,
        data: [],
        stationName: '',
        date: ''
    });

    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const res = await axiosClient.get('/admin/google/status');
            if (res) {
                setStats(res);
            }
        } catch (error) {
            console.error('Failed to fetch Google status:', error);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleRainSummary = useCallback(async () => {
        const text = 'Tình hình mưa đang như thế nào?';
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text }]);
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/google/rain-summary-text');
            if (res && typeof res === 'object' && res.text) {
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: res.text, tables: res.tables }]);
            } else {
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: res || 'Không thể lấy dữ liệu mưa.' }]);
            }
            if (shouldScrollToBottom) shouldScrollToBottom.current = true;
        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: 'Lỗi tải dữ liệu.' }]);
        } finally {
            setLoading(false);
        }
    }, [setMessages, setLoading, shouldScrollToBottom]);

    const handleShowRainCharts = useCallback(async () => {
        const text = 'Biểu đồ mưa hiện tại';
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text }]);
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/weather/rain');
            if (res && res.items) {
                if (res.items.length === 0) {
                    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: res.summary || 'Hiện tại hệ thống không ghi nhận trạm nào có mưa trong ngày hôm nay.' }]);
                } else {
                    setMessages(prev => [...prev, {
                        id: Date.now() + 1,
                        role: 'ai',
                        text: `${res.summary || `Hệ thống ghi nhận ${res.items.length} trạm đang có mưa trong ngày.`} Click vào trạm để xem biểu đồ chi tiết:\n\n[TABLE:rains]`,
                        tables: {
                            rains: res.items
                        },
                        timestamp: new Date()
                    }]);
                }
            }
            if (shouldScrollToBottom) shouldScrollToBottom.current = true;
        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: 'Lỗi tải dữ liệu biểu đồ.' }]);
        } finally {
            setLoading(false);
        }
    }, [setMessages, setLoading, shouldScrollToBottom]);

    const handleEmailDetail = useCallback(async (emailId) => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/google/email/${emailId}`);
            if (res) {
                const detail = res;
                let attachmentsText = '';
                if (detail.attachments?.length > 0) {
                    attachmentsText = '\n\n**File đính kèm:**\n' + detail.attachments.map(a => `- [${a.filename}](http://localhost:8089${a.url})`).join('\n');
                }
                const aiMsg = {
                    id: Date.now(),
                    role: 'ai',
                    text: `### ${detail.subject}\n**Từ:** ${detail.from}\n**Ngày:** ${detail.date}\n\n${detail.body}${attachmentsText}`,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMsg]);
                if (shouldScrollToBottom) shouldScrollToBottom.current = true;
                fetchStats();
            }
        } catch (error) {
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, [setMessages, setLoading, shouldScrollToBottom, fetchStats]);

    const handleListEmails = useCallback(async (type) => {
        setLoading(true);
        const url = type === 'recent' ? '/admin/google/emails/recent' : '/admin/google/emails/unread';
        try {
            const res = await axiosClient.get(url);
            if (res) {
                let tableText = `### Danh sách Email\n\n| Người gửi | Tiêu đề | Thời gian | Thao tác |\n| :--- | :--- | :--- | :--- |\n`;
                if (res.length === 0) tableText = 'Không tìm thấy email mới.';
                else res.forEach(m => tableText += `| ${m.from} | ${m.subject} | ${m.date} | [Xem chi tiết](#email-detail-${m.id}) |\n`);
                setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: tableText }]);
                if (shouldScrollToBottom) shouldScrollToBottom.current = true;
            }
        } catch (error) {
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, [setMessages, setLoading, shouldScrollToBottom]);

    const handleListConstructions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/emergency-constructions');
            if (res) {
                const items = res.data || res;
                let tableText = `### Danh sách Công trình khẩn\n\n| Tên công trình | Địa điểm | Trạng thái | Thao tác |\n| :--- | :--- | :--- | :--- |\n`;
                items.forEach(item => tableText += `| ${item.name} | ${item.location} | ${item.status} | [Xem lịch sử](#emc-history-${item.id}) |\n`);
                setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: tableText }]);
                if (shouldScrollToBottom) shouldScrollToBottom.current = true;
            }
        } catch (error) {
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, [setMessages, setLoading, shouldScrollToBottom]);

    const handleEmcHistory = useCallback(async (id) => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/emergency-constructions/${id}/progress`);
            if (res) {
                let text = `### Lịch sử thi công\n\n`;
                res.forEach(h => {
                    const date = new Date(h.report_date * 1000).toLocaleString('vi-VN');
                    text += `**Ngày:** ${date}\n**Công việc:** ${h.work_done}\n---\n`;
                });
                setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text }]);
                if (shouldScrollToBottom) shouldScrollToBottom.current = true;
            }
        } catch (error) {
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, [setMessages, setLoading, shouldScrollToBottom]);

    const handleQuickReportText = useCallback(async () => {
        const text = 'Lấy báo cáo nhanh tình hình (Văn bản)';
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text, timestamp: new Date() }]);
        setLoading(true);
        try {
            const res = await axiosClient.post('/admin/google/quick-report-text');
            if (res) {
                let text = res;
                let tables = null;
                if (typeof res === 'object' && res.text) {
                    text = res.text;
                    tables = res.tables;
                }
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text, tables, timestamp: new Date() }]);
            }
            if (shouldScrollToBottom) shouldScrollToBottom.current = true;
        } catch (error) {
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, [setMessages, setLoading, shouldScrollToBottom]);

    const handleAIDynamicReport = useCallback(async () => {
        const text = 'Tổng hợp tình hình toàn hệ thống (AI)';
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text, timestamp: new Date() }]);
        setLoading(true);
        try {
            const res = await axiosClient.post('/admin/google/dynamic-report');
            if (res) {
                let text = res;
                let tables = null;
                if (typeof res === 'object' && res.text) {
                    text = res.text;
                    tables = res.tables;
                }
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text, tables, timestamp: new Date() }]);
            }
            if (shouldScrollToBottom) shouldScrollToBottom.current = true;
        } catch (error) {
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, [setMessages, setLoading, shouldScrollToBottom]);

    const handleQuickReport = useCallback(async () => {
        const text = 'Tạo báo cáo nhanh (Word/Google Docs)';
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text, timestamp: new Date() }]);
        setLoading(true);
        try {
            const res = await axiosClient.post('/admin/google/quick-report');
            if (res && res.report_url) {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    role: 'ai',
                    text: `### Đã tạo báo cáo nhanh (Word)\n[Mở file Google Docs tại đây](${res.report_url})`,
                    timestamp: new Date()
                }]);
            }
            if (shouldScrollToBottom) shouldScrollToBottom.current = true;
        } catch (error) {
            console.error('Failed to generate quick report:', error);
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: 'Lỗi khi tạo báo cáo Word. Vui lòng thử lại.', timestamp: new Date() }]);
        } finally {
            setLoading(false);
        }
    }, [setMessages, setLoading, shouldScrollToBottom]);

    const handleConstructionReport = useCallback(async (customDate = null) => {
        const dateToUse = customDate !== null ? customDate : reportDate;
        setExporting(true);
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/emergency-constructions/export?date=${dateToUse}`);
            if (res) {
                const { url } = res;
                setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: `### Đã tạo báo cáo công trình\n[Tải về tại đây](${url})` }]);
                setOpenReportDialog(false);
            }
        } catch (error) {
            setLoading(false);
        } finally {
            setExporting(false);
            setLoading(false);
        }
    }, [setMessages, setLoading, reportDate]);

    const handleRainChart = useCallback(async (oldId, date, stationName) => {
        setRainChart(prev => ({ ...prev, open: true, loading: true, stationName, date, data: [] }));
        try {
            const res = await stationApi.rain.getHistory(oldId, { date, limit: 5000 });
            setRainChart(prev => ({
                ...prev,
                data: Array.isArray(res) ? res : (res?.data || []),
                loading: false
            }));
        } catch (error) {
            console.error('Failed to fetch rain history:', error);
            setRainChart(prev => ({ ...prev, loading: false, data: [] }));
        }
    }, []);

    const handleInundationClick = useCallback((pointData) => {
        const pointName = pointData['Tên điểm ngập'] || pointData['Vị trí ngập'] || pointData['street_name'] || '';
        const pointId = pointData['point_id'] || pointData['id'];
        const reportId = pointData['report_id'] || null;

        const count = pointData['count'] || pointData['Count'];
        const duration = pointData['duration'] || pointData['Duration'] || pointData['Tổng thời gian'] || pointData['Thời gian ngập'] || '';
        const currentStatus = pointData['Trạng thái'] || pointData['current_status'] || pointData['CurrentStatus'] || '';
        
        const isHistory = count !== undefined || duration.includes('lần') || currentStatus.includes('lần');

        let matchedPoint = null;
        if (pointId) {
            matchedPoint = points.find(p => p.id === pointId);
        }
        if (!matchedPoint && pointName) {
            const cleanName = pointName.toLowerCase().trim();
            matchedPoint = points.find(p => {
                const pName = p.name?.toLowerCase().trim();
                return pName === cleanName || pName?.includes(cleanName) || cleanName.includes(pName);
            });
        }

        // Try to parse year from start_time/time
        let extractedYear = null;
        const timeVal = pointData['Thời gian'] || pointData['Giờ bắt đầu'] || pointData['start_time'] || '';
        if (timeVal && timeVal.includes('/')) {
            const parts = timeVal.split(' ').pop().split('/');
            if (parts.length === 3) {
                const y = parseInt(parts[2], 10);
                if (!isNaN(y) && y >= 2000) {
                    extractedYear = y;
                }
            }
        }

        // Parse query dates if present
        const queryStartDate = pointData['query_start_date'];
        const queryEndDate = pointData['query_end_date'];
        let fromTime = null;
        let toTime = null;
        if (queryStartDate && queryEndDate) {
            const startDay = dayjs(queryStartDate, 'YYYY-MM-DD');
            const endDay = dayjs(queryEndDate, 'YYYY-MM-DD');
            if (startDay.isValid() && endDay.isValid()) {
                fromTime = startDay.startOf('day').unix();
                toTime = endDay.endOf('day').unix();
            }
        }

        const pointToUse = matchedPoint ? {
            id: matchedPoint.id,
            name: matchedPoint.name,
            address: matchedPoint.address || matchedPoint.street_name || matchedPoint.name,
            org_code: matchedPoint.org_code,
            org_name: matchedPoint.org_name,
            count: count
        } : {
            id: pointId || `dummy-${Date.now()}`,
            name: pointName,
            address: pointData['address'] || pointData['Địa chỉ'] || pointName,
            org_code: pointData['org_code'] || '',
            org_name: pointData['org_name'] || pointData['Đơn vị quản lý'] || '',
            count: count,
            report_id: reportId
        };

        if (isHistory) {
            setInundationHistory({ open: true, point: pointToUse, year: extractedYear, fromTime: fromTime, toTime: toTime });
        } else {
            if (matchedPoint) {
                setInundationDetail({ open: true, point: matchedPoint });
            } else {
                setInundationDetail({
                    open: true,
                    point: pointToUse
                });
            }
        }
    }, [points]);

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const quotaPercentage = useMemo(() => {
        return stats.drive_quota.limit > 0 ? Math.round((stats.drive_quota.usage / stats.drive_quota.limit) * 100) : 0;
    }, [stats.drive_quota]);

    return {
        stats,
        statsLoading,
        showStats,
        setShowStats,
        reportDate,
        setReportDate,
        openReportDialog,
        setOpenReportDialog,
        exporting,
        rainChart,
        setRainChart,
        inundationDetail,
        setInundationDetail,
        inundationHistory,
        setInundationHistory,
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
    };
};

export default useChatIntegrations;
