function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const docId = requestData.doc_id;
    const data = requestData.data;

    // 1. Tạo bản sao từ file mẫu
    const templateFile = DriveApp.getFileById(docId);
    const newFileName = "Báo cáo nhanh - " + data.hh + " " + data.dd + "-" + data.mm;
    const newFile = templateFile.makeCopy(newFileName);
    const doc = DocumentApp.openById(newFile.getId());
    const body = doc.getBody();

    // Xử lý câu từ cho phần úng ngập
    let so_luong = data.so_luong_ung_ngap !== undefined ? data.so_luong_ung_ngap : 0;
    let chi_tiet = data.chi_tiet_cac_diem !== undefined ? String(data.chi_tiet_cac_diem).trim() : "";

    if (so_luong == 0) {
      chi_tiet = ""; // Xóa chi tiết nếu không có điểm ngập
    } else if (chi_tiet !== "") {
      // Đảm bảo viết hoa chữ cái đầu tiên và có dấu chấm để thành câu hoàn chỉnh
      chi_tiet = chi_tiet.charAt(0).toUpperCase() + chi_tiet.slice(1);
      if (!chi_tiet.endsWith(".")) {
        chi_tiet += ".";
      }
      // Nếu bổ sung thêm chữ "Cụ thể: " vào trước thì bật đoạn này lên:
      if (!chi_tiet.toLowerCase().startsWith("cụ thể") && !chi_tiet.toLowerCase().startsWith("chi tiết")) {
        chi_tiet = "Cụ thể: " + chi_tiet;
      }
    }
    
    data.so_luong_ung_ngap = so_luong;
    data.chi_tiet_cac_diem = chi_tiet;

    // 2. Thay thế các placeholder văn bản đơn giản
    const replacements = ['dd', 'mm', 'yyyy', 'hh', 'noidung', 'time_mua', 'so_luong_ung_ngap', 'chi_tiet_cac_diem'];
    replacements.forEach(key => {
      let value = (data[key] !== undefined && data[key] !== null) ? String(data[key]) : "";
      body.replaceText('{' + key + '}', value);
    });

    // 3. Vẽ bảng Mưa Phường theo layout 5 cột
    renderSplitTable(body, '{table_mua_phuong}', data.table_mua_phuong);

    // 4. Vẽ bảng Mưa Xã theo layout 5 cột
    renderSplitTable(body, '{table_mua_xa}', data.table_mua_xa);

    // 5. Vẽ bảng 5 cột (Sông bên trái, Hồ bên phải, giữa là cột trống)
    renderDualColumnTable(body, '{table_song_ho}', data.table_song_ho);

    doc.saveAndClose();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      file_id: newFile.getId(),
      file_url: newFile.getUrl(),
      message: "Report generation successful"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Hàm vẽ bảng 5 cột từ 1 mảng dữ liệu duy nhất bằng cách dàn đều sang 2 bên
 */
function renderSplitTable(body, placeholder, dataArray) {
  const rangeElement = body.findText(placeholder);
  if (!rangeElement || !dataArray || dataArray.length <= 1) return;

  const element = rangeElement.getElement();
  const parent = element.getParent();
  const childIndex = body.getChildIndex(parent);

  const headers = dataArray[0]; // [ "Tên Phường", "Lượng mưa" ]
  const items = dataArray.slice(1);
  
  // Chia đôi danh sách
  const half = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, half);
  const rightItems = items.slice(half);

  const combinedData = [];
  // Hàng tiêu đề 5 cột
  combinedData.push([headers[0], headers[1], "", headers[0], headers[1]]);

  for (let i = 0; i < half; i++) {
    combinedData.push([
      (leftItems[i] && leftItems[i][0]) || "",
      (leftItems[i] && leftItems[i][1]) || "",
      "",
      (rightItems[i] && rightItems[i][0]) || "",
      (rightItems[i] && rightItems[i][1]) || ""
    ]);
  }

  const table = body.insertTable(childIndex + 1, combinedData);
  applyFiveColumnStyle(table, combinedData.length);

  removePlaceholder(element, parent);
}

/**
 * Hàm vẽ bảng 5 cột kết hợp Sông và Hồ (2 mảng khác nhau)
 */
function renderDualColumnTable(body, placeholder, songHoData) {
  const rangeElement = body.findText(placeholder);
  if (!rangeElement) return;

  const element = rangeElement.getElement();
  const parent = element.getParent();
  const childIndex = body.getChildIndex(parent);

  const rivers = songHoData.river || [["Tên Trạm", "Mực nước"]];
  const lakes = songHoData.lake || [["Tên Trạm", "Mực nước"]];

  const maxRows = Math.max(rivers.length, lakes.length);
  const combinedData = [];

  for (let i = 0; i < maxRows; i++) {
    combinedData.push([
      (rivers[i] && rivers[i][0]) || "",
      (rivers[i] && rivers[i][1]) || "",
      "",
      (lakes[i] && lakes[i][0]) || "",
      (lakes[i] && lakes[i][1]) || ""
    ]);
  }

  const table = body.insertTable(childIndex + 1, combinedData);
  applyFiveColumnStyle(table, combinedData.length);

  removePlaceholder(element, parent);
}

/**
 * Áp dụng style chung cho bảng 5 cột
 */
function applyFiveColumnStyle(table, numRows) {
  table.setBorderWidth(1);
  table.setBorderColor('#000000');
  
  // Set độ rộng cột
  table.setColumnWidth(0, 155); 
  table.setColumnWidth(1, 75);  
  table.setColumnWidth(2, 15);  // Separator
  table.setColumnWidth(3, 155); 
  table.setColumnWidth(4, 75);  

  // Format header (Hàng 0)
  const headerRow = table.getRow(0);
  for (let j = 0; j < 5; j++) {
    if (j !== 2) {
      headerRow.getCell(j).setBold(true);
      headerRow.getCell(j).setBackgroundColor('#f3f3f3');
    }
  }

  // Khử viền trên/dưới cột giữa (cột 2) bằng cách dùng viền trắng đè lên
  const whiteBorder = {};
  whiteBorder[DocumentApp.Attribute.BORDER_COLOR] = '#ffffff';
  
  const blackBorder = {};
  blackBorder[DocumentApp.Attribute.BORDER_COLOR] = '#000000';

  for (let r = 0; r < numRows; r++) {
    const row = table.getRow(r);
    // 1. Gán trắng toàn bộ viền cột 2 (làm mất luôn viền trên, dưới)
    row.getCell(2).setAttributes(whiteBorder);
    
    // 2. Gán đè lại đen cho cột 1 và 3 (thậm chí cột 0, 4) 
    // để cứu vớt cạnh viền phải của cột 1 và cạnh trái của cột 3
    row.getCell(0).setAttributes(blackBorder);
    row.getCell(1).setAttributes(blackBorder);
    row.getCell(3).setAttributes(blackBorder);
    row.getCell(4).setAttributes(blackBorder);
  }
}

/**
 * Hỗ trợ xóa placeholder sạch sẽ
 */
function removePlaceholder(element, parent) {
  if (parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
    parent.removeFromParent();
  } else {
    element.asText().setText("");
  }
}