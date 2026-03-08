/**
 * Converts a nested Key-Value array structure (frequently used by Go's map-to-slice conversion)
 * into a standard Javascript object.
 * 
 * Example input: [{ Key: "name", Value: "Màn hình" }, { Key: "elements", Value: [[{ Key: "id", Value: "..." }, ...]] }]
 * Example output: { name: "Màn hình", elements: [{ id: "...", ... }] }
 */
export const convertKVToObj = (data) => {
    if (!data) return data;

    // If it's an array of { Key, Value }
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'Key' in data[0] && 'Value' in data[0]) {
        const obj = {};
        data.forEach(item => {
            obj[item.Key] = convertKVToObj(item.Value);
        });
        return obj;
    }

    // If it's an array of items (like a list of elements), process each item
    if (Array.isArray(data)) {
        return data.map(item => convertKVToObj(item));
    }

    // Otherwise return as is
    return data;
};
