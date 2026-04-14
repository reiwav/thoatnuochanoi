function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const docId = requestData.doc_id;
    const data = requestData.data;

    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();

    // Xử lý câu từ cho phần úng ngập
    let so_luong = data.so_luong_ung_ngap !== undefined ? data.so_luong_ung_ngap : 0;
    let chi_tiet = data.chi_tiet_cac_diem !== undefined ? String(data.chi_tiet_cac_diem).trim() : "";

    if (so_luong == 0) {
      chi_tiet = "";
    } else if (chi_tiet !== "") {
      chi_tiet = chi_tiet.charAt(0).toUpperCase() + chi_tiet.slice(1);
      if (!chi_tiet.endsWith(".")) {
        chi_tiet += ".";
      }
      if (!chi_tiet.toLowerCase().startsWith("cụ thể") && !chi_tiet.toLowerCase().startsWith("chi tiết")) {
        chi_tiet = "Cụ thể: " + chi_tiet;
      }
    }
    
    data.so_luong_ung_ngap = so_luong;
    data.chi_tiet_cac_diem = chi_tiet;

    // 1. Thay thế các placeholder văn bản đơn giản
    const replacements = ['dd', 'mm', 'yyyy', 'hh', 'noidung', 'time_mua', 'mo_ta_ung_ngap', 'chi_tiet_cac_diem', 'hien_trang_mua', 'noi_dung_tram_bom'];
    replacements.forEach(key => {
      let value = (data[key] !== undefined && data[key] !== null) ? String(data[key]) : "";
      body.replaceText('\\{' + key + '\\}', value);
    });

    // 2. Vẽ các bảng 2 cột
    renderSimpleTable(body, '{table1_mua_phuong}', data.table1_mua_phuong);
    renderSimpleTable(body, '{table2_mua_phuong}', data.table2_mua_phuong);
    renderSimpleTable(body, '{table1_mua_xa}', data.table1_mua_xa);
    renderSimpleTable(body, '{table2_mua_xa}', data.table2_mua_xa);
    renderSimpleTable(body, '{table_song}', data.table_song);
    renderSimpleTable(body, '{table_ho}', data.table_ho);

    doc.saveAndClose();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      file_id: docId,
      file_url: "https://docs.google.com/document/d/" + docId + "/edit",
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
 * Tìm placeholder bằng findText, navigate lên parent để xác định context, vẽ table tại chỗ
 */
function renderSimpleTable(body, placeholder, dataArray) {
  if (!dataArray || dataArray.length === 0) return;

  // Escape regex cho findText
  const regex = placeholder.replace(/[{}]/g, '\\$&');
  const rangeElement = body.findText(regex);
  if (!rangeElement) return;

  const element = rangeElement.getElement();
  const paragraph = element.getParent();
  const container = paragraph.getParent();

  let table;
  if (container.getType() === DocumentApp.ElementType.TABLE_CELL) {
    const cell = container;
    cell.removeChild(paragraph);
    table = cell.appendTable(dataArray); // Vẽ đúng 2 cột gốc
    
    if (cell.getNumChildren() > 1) {
      const first = cell.getChild(0);
      if (first.getType() === DocumentApp.ElementType.PARAGRAPH && first.getText().trim() === "") {
        cell.removeChild(first);
      }
    }
  } else if (container.getType() === DocumentApp.ElementType.BODY_SECTION) {
    const childIndex = body.getChildIndex(paragraph);
    table = body.insertTable(childIndex + 1, dataArray);
    paragraph.removeFromParent();
  }

  if (table) {
    applyTwoColumnStyle(table, dataArray.length);
  }
}

/**
 * Áp dụng style cho bảng con (chữ 13pt, padding 3, viền đen)
 */
function applyTwoColumnStyle(table, numRows) {
  // Set alignment về LEFT để tránh table tự giãn 100% chiều rộng cell cha
  const tableAttr = {};
  tableAttr[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.LEFT;
  table.setAttributes(tableAttr);

  // Style cho từng ô: chữ to 13pt, có padding theo yêu cầu user
  const cellStyle = {};
  cellStyle[DocumentApp.Attribute.BORDER_COLOR] = '#000000';
  cellStyle[DocumentApp.Attribute.BORDER_WIDTH] = 1;
  cellStyle[DocumentApp.Attribute.FONT_SIZE] = 13;
  cellStyle[DocumentApp.Attribute.PADDING_TOP] = 3;
  cellStyle[DocumentApp.Attribute.PADDING_BOTTOM] = 3;
  cellStyle[DocumentApp.Attribute.PADDING_LEFT] = 3;
  cellStyle[DocumentApp.Attribute.PADDING_RIGHT] = 3;

  const colWidths = [120, 80]; // Tên (110) | Lượng mưa (80)

  for (let i = 0; i < numRows; i++) {
    const row = table.getRow(i);
    for (let j = 0; j < row.getNumCells(); j++) {
      const cell = row.getCell(j);
      cell.setAttributes(cellStyle);
      
      // Chỉnh giãn dòng của Paragraph bên trong Cell
      for (let k = 0; k < cell.getNumChildren(); k++) {
        const child = cell.getChild(k);
        if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
          child.asParagraph().setSpacingAfter(0).setLineSpacing(1.15);
        }
      }

      // Dùng setWidth trực tiếp trên Cell (ép phê hơn setColumnWidth trong bảng lồng)
      if (j < colWidths.length) {
        cell.setWidth(colWidths[j]);
      }

      if (i === 0) {
        cell.editAsText().setBold(true);
        cell.setBackgroundColor('#f3f3f3');
      }
    }
  }
}