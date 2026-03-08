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
