export const getInundationImageUrl = (img) => {
    if (!img) return '';
    if (typeof img !== 'string') return '';

    // If it's already a full URL
    if (img.startsWith('http')) {
        return img;
    }

    const apiUrl = import.meta.env?.VITE_APP_API_URL || '';
    const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

    // Support various local storage path formats
    if (img.startsWith('/api/storage/file/')) {
        return base + img;
    }

    if (img.startsWith('/storage/') || img.startsWith('storage/')) {
        const path = img.startsWith('/') ? img : '/' + img;
        return base + path;
    }

    // Default Google Drive ID fallback - use the most universal format
    // lh3 is usually faster for thumbnails but if it fails, uc?id= is more robust
    // We'll try lh3 but without the extra parameters first, or just stick to uc?id= for safety
    return `https://drive.google.com/uc?id=${img}`;
};
