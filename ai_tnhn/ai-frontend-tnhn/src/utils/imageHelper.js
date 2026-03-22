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

    // Optimized Google Drive CDN format (lh3), which is faster and supports resizing
    // s1000 provides a good balance between quality and performance
    return `https://lh3.googleusercontent.com/d/${img}=s1000`;
};
