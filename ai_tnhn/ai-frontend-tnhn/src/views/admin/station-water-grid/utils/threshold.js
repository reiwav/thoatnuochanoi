/**
 * Safely resolve station ID with fallback (handling OldId = 0 correctly)
 * @param {object} s - Station object
 * @returns {string|number}
 */
export const getStationId = (s) => s?.OldId ?? s?.old_id ?? s?.Id ?? s?.id ?? '';

/**
 * Get text color according to threshold status for edit / input mode
 * @param {string} status - 'high' | 'low' | 'normal'
 * @param {string} defaultColor - default color for normal status (default: 'primary.main')
 * @returns {string}
 */
export const getCellTextColor = (status, defaultColor = 'primary.main') => {
    if (status === 'high') return 'error.main'; // Red
    if (status === 'low') return 'warning.dark'; // Orange
    return defaultColor;
};

/**
 * Get text color according to threshold status for read-only cells
 * @param {string} status - 'high' | 'low' | 'normal'
 * @param {boolean} hasVal - whether cell has value
 * @returns {string}
 */
export const getReadOnlyCellColor = (status, hasVal) => {
    if (status === 'high') return 'error.main'; // Red
    if (status === 'low') return 'warning.dark'; // Orange
    return hasVal ? 'text.primary' : 'text.secondary';
};

/**
 * Calculate threshold status ('normal' | 'high' | 'low') for a station value.
 * @param {object} station - Station data object
 * @param {string|number} valStr - Cell value string or number
 * @param {dayjs.Dayjs} selectedDate - The currently selected date
 * @param {object} activeSetting - Active water threshold setting
 * @returns {string} 'normal' | 'high' | 'low'
 */
export const calculateThresholdStatus = (station, valStr, selectedDate, activeSetting) => {
    if (valStr === undefined || valStr === null || valStr === '' || isNaN(parseFloat(valStr))) return 'normal';
    const val = parseFloat(valStr);

    const currentMonth = selectedDate ? selectedDate.month() + 1 : 1; // 1-12
    const configs = station?.threshold_configs || [];

    let seasonType = 'mua_kho';
    if (activeSetting && activeSetting.thresholds) {
        const activeSeason = activeSetting.thresholds.find(t => t.months && t.months.includes(currentMonth));
        if (activeSeason) seasonType = activeSeason.type;
    } else if ([5, 6, 7, 8, 9, 10].includes(currentMonth)) {
        seasonType = 'mua_mua';
    }

    const cfg = configs.find(c => c.threshold_type === seasonType);
    if (!cfg) return 'normal';

    if (cfg.max_level > 0 && val > cfg.max_level) return 'high';
    if (cfg.min_level > 0 && val < cfg.min_level) return 'low';
    return 'normal';
};

/**
 * Get threshold formatted range string for Excel export
 * @param {object} st - Station object
 * @param {string} seasonType - 'mua_mua' | 'mua_kho'
 * @returns {string} E.g. '1.5-3.5', '≤ 3.5', '≥ 1.5'
 */
export const getThresholdStr = (st, seasonType) => {
    const configs = st?.threshold_configs || [];
    const cfg = configs.find(c => c.threshold_type === seasonType);
    if (!cfg) return '';
    if (cfg.max_level > 0 && cfg.min_level > 0) return `${cfg.min_level}-${cfg.max_level}`;
    if (cfg.max_level > 0) return `≤ ${cfg.max_level}`;
    if (cfg.min_level > 0) return `≥ ${cfg.min_level}`;
    return '';
};
