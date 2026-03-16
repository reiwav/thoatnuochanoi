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

    // 2. Thay thế các placeholder văn bản đơn giản
    const replacements = ['dd', 'mm', 'yyyy', 'hh', 'noidung', 'time_mua'];
    replacements.forEach(key => {
      body.replaceText('{' + key + '}', data[key] || "");
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