function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const docId = requestData.doc_id;
    const data = requestData.data;

    // 1. Tạo bản sao từ file mẫu để không ghi đè vào mẫu gốc
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

    // 3. Vẽ bảng Mưa Phường
    replacePlaceholderWithTable(body, '{table_mua_phuong}', data.table_mua_phuong);

    // 4. Vẽ bảng Mưa Xã
    replacePlaceholderWithTable(body, '{table_mua_xa}', data.table_mua_xa);

    // 5. Vẽ bảng Song song (Sông bên trái, Hồ bên phải) như ảnh bạn gửi
    renderRiverLakeTable(body, '{table_song_ho}', data.table_song_ho);

    doc.saveAndClose();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      file_url: newFile.getUrl(),
      file_id: newFile.getId()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Hàm hỗ trợ vẽ bảng từ mảng 2 chiều
 */
function replacePlaceholderWithTable(body, placeholder, dataArray) {
  const rangeElement = body.findText(placeholder);
  if (!rangeElement || !dataArray || dataArray.length === 0) return;

  const element = rangeElement.getElement();
  const childIndex = body.getChildIndex(element.getParent());
  
  // Tạo bảng
  const table = body.insertTable(childIndex + 1, dataArray);
  table.setBorderWidth(1);
  
  // Xóa placeholder
  element.asText().setText("");
}

/**
 * Hàm vẽ bảng kép (Sông & Hồ) nằm cạnh nhau
 */
function renderRiverLakeTable(body, placeholder, songHoData) {
  const rangeElement = body.findText(placeholder);
  if (!rangeElement) return;

  const element = rangeElement.getElement();
  const childIndex = body.getChildIndex(element.getParent());

  // Tạo một bảng cha không viền để chứa 2 bảng con (trái/phải)
  const outerTable = body.insertTable(childIndex + 1, [['', '']]);
  outerTable.setBorderWidth(0); 
  
  const leftCell = outerTable.getCell(0, 0);
  const rightCell = outerTable.getCell(0, 1);

  // Điền bảng Sông vào ô bên trái
  if (songHoData.river) {
    leftCell.appendParagraph("Mực nước Sông").setBold(true);
    leftCell.appendTable(songHoData.river).setBorderWidth(1);
  }

  // Điền bảng Hồ vào ô bên phải
  if (songHoData.lake) {
    rightCell.appendParagraph("Mực nước Hồ").setBold(true);
    rightCell.appendTable(songHoData.lake).setBorderWidth(1);
  }

  element.asText().setText("");
}