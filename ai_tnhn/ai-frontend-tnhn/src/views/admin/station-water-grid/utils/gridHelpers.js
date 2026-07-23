import dayjs from 'dayjs';

/**
 * Calculate full dayjs timestamp for a given time slot key and selected date.
 * @param {string} slotKey - E.g. '6h30', '13h30', 'now', or '0_15:00'
 * @param {dayjs.Dayjs} selectedDate - The currently selected date
 * @returns {dayjs.Dayjs}
 */
export const getSlotTimestamp = (slotKey, selectedDate) => {
    const targetDate = selectedDate || dayjs();
    if (slotKey === '6h30') {
        return targetDate.hour(6).minute(30).second(0);
    }
    if (slotKey === '13h30') {
        return targetDate.hour(13).minute(30).second(0);
    }
    if (slotKey === 'now') {
        const now = dayjs();
        return targetDate.hour(now.hour()).minute(now.minute()).second(now.second());
    }
    if (slotKey && slotKey.includes('_')) {
        const [offsetStr, timeStr] = slotKey.split('_');
        const dayOffset = parseInt(offsetStr, 10);
        const [h, m] = timeStr.split(':').map(Number);
        return targetDate.add(dayOffset, 'day').hour(h).minute(m).second(0);
    }
    return targetDate;
};

/**
 * Calculate 5 flexible time slots centered around T0 based on step cycle.
 * @param {string} mode - 'fixed' | 'flexible'
 * @param {string} stepCycle - '5m'|'10m'|'15m'|'20m'|'30m'|'1h'|'2h'
 * @param {dayjs.Dayjs} selectedDate - The currently selected date
 * @returns {Array<{key: string, label: string, isT0: boolean, dayOffset: number}>}
 */
export const calculateFlexibleSlots = (mode, stepCycle, selectedDate) => {
    if (mode !== 'flexible') return [];
    
    let stepMinutes = 60;
    if (stepCycle === '5m') stepMinutes = 5;
    if (stepCycle === '10m') stepMinutes = 10;
    if (stepCycle === '15m') stepMinutes = 15;
    if (stepCycle === '20m') stepMinutes = 20;
    if (stepCycle === '30m') stepMinutes = 30;
    if (stepCycle === '1h') stepMinutes = 60;
    if (stepCycle === '2h') stepMinutes = 120;

    const currentHour = selectedDate.hour();
    const currentMinute = selectedDate.minute();

    let t0Minute = Math.floor(currentMinute / stepMinutes) * stepMinutes;
    let t0Hour = currentHour;
    
    if (stepMinutes >= 60) {
        const stepHours = stepMinutes / 60;
        t0Hour = Math.floor(currentHour / stepHours) * stepHours;
        t0Minute = 0;
    }

    const t0AbsoluteMinutes = (t0Hour * 60) + t0Minute;
    const slots = [];
    for (let i = -2; i <= 2; i++) {
        let slotAbsoluteMinutes = t0AbsoluteMinutes + (i * stepMinutes);
        
        let displayMinutes = slotAbsoluteMinutes % (24 * 60);
        let dayOffset = 0;
        if (displayMinutes < 0) {
            displayMinutes += (24 * 60);
            dayOffset = -1;
        } else if (slotAbsoluteMinutes >= (24 * 60)) {
            dayOffset = 1;
        }

        const h = Math.floor(displayMinutes / 60);
        const m = displayMinutes % 60;
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        
        slots.push({ 
            key: `${dayOffset}_${hh}:${mm}`, 
            label: `${hh}h${mm}`,
            isT0: i === 0,
            dayOffset
        });
    }
    return slots;
};

/**
 * Calculate threshold status ('normal' | 'high' | 'low') for a station value.
 * @param {object} station - Station data object
 * @param {string} valStr - Cell value string
 * @param {dayjs.Dayjs} selectedDate - The currently selected date
 * @param {object} activeSetting - Active water threshold setting
 * @returns {string}
 */
export const calculateThresholdStatus = (station, valStr, selectedDate, activeSetting) => {
    if (!valStr || isNaN(parseFloat(valStr))) return 'normal';
    const val = parseFloat(valStr);

    const currentMonth = selectedDate.month() + 1; // 1-12
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
