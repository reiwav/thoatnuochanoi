import dayjs from 'dayjs';

/**
 * Phân tích dữ liệu báo cáo mới nhất từ danh sách updates
 */
export const getLatestData = (report) => {
    if (!report) return null;
    let data = { ...report, traffic_status: report.traffic_status || report.trafficStatus };

    const updates = report.updates && Array.isArray(report.updates) ? report.updates : [];
    const sortedUpdates = [...updates].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (sortedUpdates.length > 0) {
        const newest = sortedUpdates[0];
        const oldest = sortedUpdates[sortedUpdates.length - 1];

        const updateWithDimensions = sortedUpdates.find(u => u.length || u.width || u.depth);
        const updateWithTraffic = sortedUpdates.find(u => u.traffic_status || u.trafficStatus);
        const updateWithImages = sortedUpdates.find(u => u.images && u.images.length > 0);

        const surveyUpdate = sortedUpdates.find(u => 'survey_checked' in u || 'surveyChecked' in u || u.survey_note || (u.survey_images && u.survey_images.length > 0));
        const mechUpdate = sortedUpdates.find(u => 'mech_checked' in u || 'mechChecked' in u || u.mech_note || u.mech_d || u.mech_r || u.mech_s || (u.mech_images && u.mech_images.length > 0));

        const parseBool = (val) => val === true || val === 'true' || val === 1 || val === '1';

        return {
            ...data,
            depth: updateWithDimensions?.depth || data.depth,
            length: updateWithDimensions?.length || data.length,
            width: updateWithDimensions?.width || data.width,
            images: (updateWithImages?.images && updateWithImages.images.length > 0) ? updateWithImages.images : (data.images || []),
            description: newest.description || data.description,
            timestamp: newest.timestamp,
            newest_ts: newest.timestamp,
            oldest_ts: oldest.timestamp,
            status: data.status === 'resolved' || data.status === 'normal' ? 'normal' : data.status,
            traffic_status: (data.status === 'resolved' || data.status === 'normal') ? "" : (updateWithTraffic?.traffic_status || updateWithTraffic?.trafficStatus || data.traffic_status),

            survey_checked: parseBool(surveyUpdate ? (surveyUpdate.survey_checked || surveyUpdate.surveyChecked) : (data.survey_checked || data.surveyChecked)),
            survey_note: surveyUpdate ? (surveyUpdate.survey_note || surveyUpdate.surveyNote) : (data.survey_note || data.surveyNote),
            survey_images: (surveyUpdate?.survey_images && surveyUpdate.survey_images.length > 0) ? surveyUpdate.survey_images : (data.survey_images || []),
            survey_ts: surveyUpdate?.timestamp,

            mech_checked: parseBool(mechUpdate ? (mechUpdate.mech_checked || mechUpdate.mechChecked) : (data.mech_checked || data.mechChecked)),
            mech_note: mechUpdate ? (mechUpdate.mech_note || mechUpdate.mechNote) : (data.mech_note || data.mechNote),
            mech_d: mechUpdate ? (mechUpdate.mech_d || mechUpdate.mechD) : (data.mech_d || data.mechD),
            mech_r: mechUpdate ? (mechUpdate.mech_r || mechUpdate.mechR) : (data.mech_r || data.mechR),
            mech_s: mechUpdate ? (mechUpdate.mech_s || mechUpdate.mechS) : (data.mech_s || data.mechS),
            mech_images: (mechUpdate?.mech_images && mechUpdate.mech_images.length > 0) ? mechUpdate.mech_images : (data.mech_images || []),
            mech_ts: mechUpdate?.timestamp
        };
    }

    const startTime = data.start_time || data.startTime || 0;
    const parseBoolBase = (val) => val === true || val === 'true' || val === 1 || val === '1';
    return {
        ...data,
        timestamp: startTime,
        newest_ts: startTime,
        oldest_ts: startTime,
        traffic_status: (data.status === 'resolved' || data.status === 'normal') ? "" : data.traffic_status,
        survey_ts: startTime,
        mech_ts: startTime,
        survey_checked: parseBoolBase(data.survey_checked || data.surveyChecked),
        mech_checked: parseBoolBase(data.mech_checked || data.mechChecked)
    };
};
