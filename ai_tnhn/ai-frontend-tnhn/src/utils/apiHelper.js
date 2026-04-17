/**
 * Hàm hỗ trợ lấy mảng dữ liệu từ phản hồi API một cách an toàn.
 * Hỗ trợ các định dạng:
 * 1. [item1, item2] (Mảng trực tiếp)
 * 2. { data: [item1, item2], total: 10 } (Đối tượng phân trang)
 * 3. { items: [item1, item2], count: 10 } (Định dạng khác)
 */
export const getDataArray = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.data && Array.isArray(res.data)) return res.data;
    if (res.items && Array.isArray(res.items)) return res.items;
    return [];
};

/**
 * Hàm hỗ trợ lấy số lượng bản ghi từ phản hồi API.
 */
export const getTotalItems = (res) => {
    if (!res) return 0;
    if (Array.isArray(res)) return res.length;
    if (typeof res.total === 'number') return res.total;
    if (typeof res.count === 'number') return res.count;
    if (res.data && Array.isArray(res.data)) return res.data.length;
    return 0;
};

/**
 * Hàm lấy đối tượng dữ liệu duy nhất (ví dụ khi gọi getById)
 */
export const getDataObject = (res) => {
    if (!res) return null;
    // Nếu kết quả là mảng, lấy phần tử đầu tiên
    if (Array.isArray(res)) return res[0] || null;
    // Nếu kết quả có bọc trong .data (mặc dù interceptor đã bóc nhưng đề phòng lồng nhau)
    if (res.data && !Array.isArray(res.data)) return res.data;
    return res;
};
