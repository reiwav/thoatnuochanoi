export const formatResourceUrl = (url, type = 'image') => {
    if (!url || url.startsWith('http')) return url;

    let baseUrl = '';

    if (type === 'font') {
        baseUrl = import.meta.env.VITE_APP_FONT_URL || import.meta.env.VITE_APP_PHOTO_URL || import.meta.env.VITE_APP_API_URL || '';
    } else {
        baseUrl = import.meta.env.VITE_APP_IMAGE_URL || import.meta.env.VITE_APP_PHOTO_URL || import.meta.env.VITE_APP_API_URL || '';
    }

    // Clean quotes if any
    baseUrl = baseUrl.replace(/^['"]|['"]$/g, '');

    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;

    return `${cleanBase}${cleanPath}`;
};
