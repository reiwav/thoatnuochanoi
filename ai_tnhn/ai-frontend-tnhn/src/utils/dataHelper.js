import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(duration);
dayjs.extend(relativeTime);

// Recursive utility to convert MongoDB KV arrays (primitive.D) to standard JS objects
export const unwrapKV = (data) => {
    if (data === null || typeof data !== 'object') return data;
    if (Array.isArray(data)) {
        // Check if it's an array of {Key, Value} pairs
        const isKVArray = data.length > 0 && data.every(item =>
            item !== null && typeof item === 'object' && 'Key' in item && 'Value' in item
        );

        if (isKVArray) {
            const result = {};
            data.forEach(item => {
                result[item.Key] = unwrapKV(item.Value);
            });
            return result;
        }
        return data.map(unwrapKV);
    }
    const result = {};
    for (const key in data) {
        result[key] = unwrapKV(data[key]);
    }
    return result;
};

export const formatDateTime = (timestamp) => {
    if (!timestamp) return '---';
    // Backend uses Unix seconds
    return dayjs.unix(timestamp).format('HH:mm DD/MM/YYYY');
};

export const formatDuration = (startTime, endTime) => {
    if (!startTime) return '---';
    const start = dayjs.unix(startTime);
    const end = endTime ? dayjs.unix(endTime) : dayjs();
    
    const diff = dayjs.duration(end.diff(start));
    const days = Math.floor(diff.asDays());
    const hours = diff.hours();
    const minutes = diff.minutes();

    let result = '';
    if (days > 0) result += `${days} ngày `;
    if (hours > 0) result += `${hours} giờ `;
    if (minutes > 0 || result === '') result += `${minutes} phút`;
    
    return result.trim();
};
