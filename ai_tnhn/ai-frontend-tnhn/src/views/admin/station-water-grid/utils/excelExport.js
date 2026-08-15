import dayjs from 'dayjs';
import { getStationId, getThresholdStr } from './threshold';

/**
 * Export daily grid table data to Excel file (.xlsx)
 */
export const exportGridToExcel = async ({ groupedStations, gridValues, mode, flexibleSlots, stationTypeFilter, selectedDate }) => {
    const XLSX = await import('xlsx');

    const isRiver = stationTypeFilter === 'river';
    const typeLabel = isRiver ? 'Song' : 'Ho';
    const modeLabel = mode === 'fixed' ? 'CoDinh' : 'LinhHoat';
    const dateStr = selectedDate.format('YYYYMMDD_HHmm');
    const displayDateStr = selectedDate.format('DD/MM/YYYY HH:mm');

    const headers = [];
    if (mode === 'fixed') {
        headers.push(['STT', 'Mã Trạm', 'Tên Trạm', 'Địa chỉ', 'Đơn vị Quản lý (Xí nghiệp)', '6h30 (m)', '13h30 (m)', 'Hiện tại (m)', 'Chênh lệch (13h30 - 6h30)']);
    } else {
        const slotHeaders = flexibleSlots.map(s => s.label);
        headers.push(['STT', 'Mã Trạm', 'Tên Trạm', 'Địa chỉ', 'Đơn vị Quản lý (Xí nghiệp)', 'Mực nước gần nhất (m)', 'Giờ gần nhất', ...slotHeaders]);
    }

    const rows = [];
    let stt = 1;

    groupedStations.forEach(group => {
        group.stations.forEach(st => {
            const oldId = getStationId(st);
            const key = `${st.type}_${oldId}`;

            if (mode === 'fixed') {
                const v630 = gridValues[`${key}_6h30`] ?? '';
                const v1330 = gridValues[`${key}_13h30`] ?? '';
                const vNow = gridValues[`${key}_now`] ?? '';

                let diffVal = '';
                if (v1330 !== '' && v630 !== '' && !isNaN(parseFloat(v1330)) && !isNaN(parseFloat(v630))) {
                    const diff = parseFloat(v1330) - parseFloat(v630);
                    const roundedDiff = Math.round(diff * 100) / 100;
                    diffVal = roundedDiff > 0 ? `+${roundedDiff}` : `${roundedDiff}`;
                }

                rows.push([
                    stt++,
                    oldId,
                    st.TenTram || st.ten_tram,
                    st.DiaChi || st.dia_chi || st.address || '',
                    group.orgName,
                    v630 !== '' ? parseFloat(v630) : '',
                    v1330 !== '' ? parseFloat(v1330) : '',
                    vNow !== '' ? parseFloat(vNow) : '',
                    diffVal
                ]);
            } else {
                const vNow = gridValues[`${key}_now`] ?? '';
                const nowTimeStr = gridValues[`${key}_nowTime`] ?? '';
                const timeLabel = nowTimeStr ? dayjs(nowTimeStr).format('HH:mm') : '';

                const slotVals = flexibleSlots.map(slot => {
                    const val = gridValues[`${key}_${slot.key}`];
                    return (val !== undefined && val !== '' && !isNaN(parseFloat(val))) ? parseFloat(val) : '';
                });

                rows.push([
                    stt++,
                    oldId,
                    st.TenTram || st.ten_tram,
                    st.DiaChi || st.dia_chi || st.address || '',
                    group.orgName,
                    vNow !== '' ? parseFloat(vNow) : '',
                    timeLabel,
                    ...slotVals
                ]);
            }
        });
    });

    const titleText = `BẢNG THỐNG KÊ MỰC NƯỚC ${isRiver ? 'SÔNG' : 'HỒ'} - ${mode === 'fixed' ? 'CỐ ĐỊNH' : 'CHU KỲ LINH HOẠT'}`;
    const worksheetData = [
        [titleText],
        [`Mốc thời gian báo cáo: ${displayDateStr}`],
        [],
        ...headers,
        ...rows
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    const totalCols = headers[0].length;
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }
    ];

    worksheet['!cols'] = [
        { wch: 6 },  // STT
        { wch: 10 }, // Mã Trạm
        { wch: 28 }, // Tên Trạm
        { wch: 32 }, // Địa chỉ
        { wch: 32 }, // Xí nghiệp
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Muc_Nuoc_${typeLabel}`);
    XLSX.writeFile(workbook, `Muc_nuoc_Grid_${typeLabel}_${modeLabel}_${dateStr}.xlsx`);
};

/**
 * Export monthly grid table data to Excel file (.xlsx)
 * Cấu trúc: Ngày là hàng, Trạm là cột (giống bảng trên giao diện)
 */
export const exportMonthlyGridToExcel = async ({ groupedStations, gridData, daysInMonth, stationTypeFilter, selectedMonth }) => {
    const XLSX = await import('xlsx');

    const isRiver = stationTypeFilter === 'river';
    const typeLabel = isRiver ? 'Song' : 'Ho';
    const monthStr = selectedMonth.format('MM_YYYY');
    const displayMonthStr = selectedMonth.format('MM/YYYY');

    // Flatten stations
    const flatStations = [];
    let stationCounter = 1;
    groupedStations.forEach(group => {
        group.stations.forEach(st => {
            flatStations.push({ ...st, orgName: group.orgName, mnkcIndex: stationCounter++ });
        });
    });

    const totalCols = flatStations.length + 1; // +1 cho cột NGÀY
    const merges = [];

    // Row 3: XN (số thứ tự xí nghiệp)
    let orgIdx = 0;
    const xnRow = ['XN'];
    groupedStations.forEach(group => {
        orgIdx++;
        group.stations.forEach(() => {
            xnRow.push(group.orgId === 'unassigned' ? '-' : orgIdx);
        });
    });

    // Row 4: Tên xí nghiệp (merge ngang theo số lượng trạm)
    const orgRow = [''];
    let currentCol = 1;
    groupedStations.forEach(group => {
        orgRow.push(group.orgName);
        for(let i = 1; i < group.stations.length; i++) {
            orgRow.push(''); // Ô trống để merge
        }
        if (group.stations.length > 1) {
            merges.push({ s: { r: 4, c: currentCol }, e: { r: 4, c: currentCol + group.stations.length - 1 } });
        }
        currentCol += group.stations.length;
    });

    // Row 5: Tên trạm
    const stationRow = ['NGÀY'];
    flatStations.forEach(st => {
        stationRow.push(st.TenTram || st.ten_tram || '');
    });

    // Row 6: Địa chỉ
    const addressRow = ['Địa chỉ'];
    flatStations.forEach(st => {
        addressRow.push(st.DiaChi || st.dia_chi || st.address || '');
    });

    // Row 7: MNKC
    const mnkcRow = ['MNKC'];
    flatStations.forEach(st => {
        mnkcRow.push(st.mnkcIndex);
    });

    // Row 8: MM (Mùa Mưa)
    const mmRow = ['MM'];
    flatStations.forEach(st => {
        mmRow.push(getThresholdStr(st, 'mua_mua'));
    });

    // Row 9: MK (Mùa Khô)
    const mkRow = ['MK'];
    flatStations.forEach(st => {
        mkRow.push(getThresholdStr(st, 'mua_kho'));
    });

    // Data rows: mỗi ngày 2 dòng (6h30 và 13h30), merge cột Ngày
    const dataRows = [];
    let startRow = 10; // Index bắt đầu data
    daysInMonth.forEach(day => {
        // Dòng 6h30
        const row630 = [`Ngày ${day}`];
        flatStations.forEach(st => {
            const oldId = getStationId(st);
            const val = gridData[`${st.type}_${oldId}_${day}_6h30`];
            row630.push(val !== undefined && val !== '' ? parseFloat(val) : '');
        });
        dataRows.push(row630);

        // Dòng 13h30
        const row1330 = ['']; // Cột ngày trống để merge
        flatStations.forEach(st => {
            const oldId = getStationId(st);
            const val = gridData[`${st.type}_${oldId}_${day}_13h30`];
            row1330.push(val !== undefined && val !== '' ? parseFloat(val) : '');
        });
        dataRows.push(row1330);

        // Merge cột ngày dọc (2 ô)
        merges.push({ s: { r: startRow, c: 0 }, e: { r: startRow + 1, c: 0 } });
        startRow += 2;
    });

    const titleText = `BẢNG THỐNG KÊ MỰC NƯỚC ${isRiver ? 'SÔNG' : 'HỒ'} THEO THÁNG`;
    const worksheetData = [
        [titleText],
        [`Tháng: ${displayMonthStr}`],
        [], // Row 2 (index 2) - khoảng trống
        xnRow,      // index 3
        orgRow,     // index 4
        stationRow, // index 5
        addressRow, // index 6
        mnkcRow,    // index 7
        mmRow,      // index 8
        mkRow,      // index 9
        ...dataRows // index 10+
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Merge tiêu đề
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } });
    
    worksheet['!merges'] = merges;

    // Set column widths
    const cols = [{ wch: 12 }]; // Cột NGÀY
    flatStations.forEach(() => cols.push({ wch: 14 }));
    worksheet['!cols'] = cols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Muc_Nuoc_Thang_${typeLabel}`);
    XLSX.writeFile(workbook, `Muc_nuoc_Thang_${typeLabel}_${monthStr}.xlsx`);
};
