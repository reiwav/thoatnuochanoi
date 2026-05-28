import { useState, useEffect } from 'react';
import axiosClient from 'api/axiosClient';
import useAuthStore from 'store/useAuthStore';
import * as XLSX from 'xlsx';

const useStationRainCompare = () => {
    const { hasPermission } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [year1, setYear1] = useState(new Date().getFullYear());
    const [year2, setYear2] = useState(new Date().getFullYear() - 1);
    const [reportData, setReportData] = useState(null);

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

    const formatPercent = (val1, val2) => {
        if (!val1 && !val2) return '';
        if (!val2) return val1 > 0 ? '100.0%' : '0%';
        return ((val1 / val2) * 100).toFixed(1) + '%';
    };

    const exportToExcel = () => {
        if (!reportData) return;

        const header = ['Tháng', ...reportData.stations.sort()];
        const rows = months.map(m => {
            const row = [m];
            reportData.stations.forEach(st => {
                const v1 = reportData.data[year1]?.[m]?.[st] || 0;
                const v2 = reportData.data[year2]?.[m]?.[st] || 0;
                row.push(formatPercent(v1, v2));
            });
            return row;
        });

        // Add Year total row for percentage
        const totalPercentRow = ['% Tổng Năm'];
        reportData.stations.forEach(st => {
            totalPercentRow.push(formatPercent(reportData.annualTotals[year1]?.[st] || 0, reportData.annualTotals[year2]?.[st] || 0));
        });
        rows.push(totalPercentRow);

        rows.push([]); // Empty row separator

        // Add Annual Summary Data
        rows.push(['Chi tiết tổng lượng mưa (mm)']);
        rows.push(['Năm', ...reportData.stations.sort()]);

        const rowYear1 = [`Năm ${year1}`];
        const rowYear2 = [`Năm ${year2}`];
        const rowDiff = ['Chênh lệch'];

        reportData.stations.sort().forEach(st => {
            const v1 = reportData.annualTotals[year1]?.[st] || 0;
            const v2 = reportData.annualTotals[year2]?.[st] || 0;
            const diff = v1 - v2;
            rowYear1.push(v1.toFixed(1));
            rowYear2.push(v2.toFixed(1));
            rowDiff.push((diff > 0 ? '+' : '') + diff.toFixed(1));
        });

        rows.push(rowYear1, rowYear2, rowDiff);

        const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'So Sanh Mua');
        XLSX.writeFile(workbook, `So_sanh_mua_${year1}_vs_${year2}.xlsx`);
    };

    const loadReport = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/weather/rain/compare?year1=${year1}&year2=${year2}`);
            if (res) {
                setReportData(res);
            }
        } catch (err) {
            console.error('Lỗi tải báo cáo so sánh:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReport();
    }, [year1, year2]);

    return {
        hasPermission,
        loading,
        year1,
        setYear1,
        year2,
        setYear2,
        reportData,
        months,
        years,
        formatPercent,
        exportToExcel,
        loadReport
    };
};

export default useStationRainCompare;
