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
    const replacements = [
      'dd', 'mm', 'yyyy', 'hh', 'noidung', 'time_mua', 'time_truoc_mua',
      'so_luong_ung_ngap', 'chi_tiet_cac_diem', 'mo_ta_ung_ngap',
      'hien_trang_mua', 'noi_dung_tram_bom', 'danh_sach_tram_bom'
    ];
    replacements.forEach(key => {
      let value = (data[key] !== undefined && data[key] !== null) ? String(data[key]) : "";
      body.replaceText('\\{' + key + '\\}', value);
    });

    // 2. Vẽ các bảng Phụ lục nếu template có sẵn placeholder
    let foundAppendixPlaceholder = false;
    const appendixKeys = [
      '{phu_luc_table_mua_phuong}', '{phu_luc_table_mua_xa}',
      '{phu_luc_table_song}', '{phu_luc_table_ho}'
    ];

    appendixKeys.forEach(k => {
      if (body.findText(k.replace(/[{}]/g, '\\$&'))) {
        foundAppendixPlaceholder = true;
      }
    });

    renderSimpleTable(body, '{phu_luc_table_mua_phuong}', data.phu_luc_table_mua_phuong);
    renderSimpleTable(body, '{phu_luc_table_mua_xa}', data.phu_luc_table_mua_xa);
    renderWaterTable(body, '{phu_luc_table_song}', data.phu_luc_table_song);
    renderWaterTable(body, '{phu_luc_table_ho}', data.phu_luc_table_ho);


    // 4. Nếu chưa có placeholder phụ lục trong template, tự động chèn phần PHỤ LỤC ở cuối document
    if (!foundAppendixPlaceholder) {
      renderAppendixSection(body, data);
    }

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
 * Tự động tạo phần PHỤ LỤC ở cuối văn bản với đầy đủ tất cả trạm mưa, sông, hồ
 */
function renderAppendixSection(body, data) {
  body.appendPageBreak();
  const heading = body.appendParagraph("PHỤ LỤC: BẢNG THỐNG KÊ CHI TIẾT TẤT CẢ CÁC TRẠM");
  heading.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  heading.setBold(true);
  heading.setFontSize(14);
  heading.setSpacingBefore(12);
  heading.setSpacingAfter(12);

  // 1. Phụ lục Mưa (Phường & Xã) - chỉ các trạm có mưa
  if ((data.phu_luc_table_mua_phuong && data.phu_luc_table_mua_phuong.length > 1) ||
      (data.phu_luc_table_mua_xa && data.phu_luc_table_mua_xa.length > 1)) {
    const pRain = body.appendParagraph("1. Thống kê lượng mưa các trạm có mưa");
    pRain.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    pRain.setBold(true);
    pRain.setFontSize(13);
    pRain.setSpacingBefore(10);
    pRain.setSpacingAfter(6);

    if (data.phu_luc_table_mua_phuong && data.phu_luc_table_mua_phuong.length > 1) {
      const pTitle = body.appendParagraph("a) Trạm đo mưa khu vực Phường:");
      pTitle.setBold(true);
      const t = body.appendTable(data.phu_luc_table_mua_phuong);
      applyTwoColumnStyle(t, data.phu_luc_table_mua_phuong.length);
    }

    if (data.phu_luc_table_mua_xa && data.phu_luc_table_mua_xa.length > 1) {
      const xTitle = body.appendParagraph("b) Trạm đo mưa khu vực Xã:");
      xTitle.setBold(true);
      const t = body.appendTable(data.phu_luc_table_mua_xa);
      applyTwoColumnStyle(t, data.phu_luc_table_mua_xa.length);
    }
  }

  // 2. Phụ lục Sông
  if (data.phu_luc_table_song && data.phu_luc_table_song.length > 1) {
    const pRiver = body.appendParagraph("2. Thống kê mực nước tất cả các trạm Sông");
    pRiver.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    pRiver.setBold(true);
    pRiver.setFontSize(13);
    pRiver.setSpacingBefore(10);
    pRiver.setSpacingAfter(6);

    const table = body.appendTable(data.phu_luc_table_song);
    applyAppendixWaterTableStyle(table, data.phu_luc_table_song.length);
  }

  // 3. Phụ lục Hồ
  if (data.phu_luc_table_ho && data.phu_luc_table_ho.length > 1) {
    const pLake = body.appendParagraph("3. Thống kê mực nước tất cả các trạm Hồ");
    pLake.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    pLake.setBold(true);
    pLake.setFontSize(13);
    pLake.setSpacingBefore(10);
    pLake.setSpacingAfter(6);

    const table = body.appendTable(data.phu_luc_table_ho);
    applyAppendixWaterTableStyle(table, data.phu_luc_table_ho.length);
  }
}

/**
 * Tự động chèn 2 bảng song song trong ô outer table không viền (dành cho bảng 2 cột gốc)
 */
function appendTwoSideTables(body, data1, data2) {
  if (!data1 || data1.length === 0) return;
  if (!data2 || data2.length <= 1) {
    const t = body.appendTable(data1);
    applyTwoColumnStyle(t, data1.length);
    return;
  }

  const outerTable = body.appendTable([['', '']]);
  outerTable.setBorderWidth(0);
  
  const cell1 = outerTable.getRow(0).getCell(0);
  const cell2 = outerTable.getRow(0).getCell(1);

  if (cell1.getNumChildren() > 0 && cell1.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH) {
    cell1.removeChild(cell1.getChild(0));
  }
  if (cell2.getNumChildren() > 0 && cell2.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH) {
    cell2.removeChild(cell2.getChild(0));
  }

  const t1 = cell1.appendTable(data1);
  applyTwoColumnStyle(t1, data1.length);

  const t2 = cell2.appendTable(data2);
  applyTwoColumnStyle(t2, data2.length);
}



/**
 * Tìm placeholder bằng findText cho các bảng 2 cột thông thường
 */
function renderSimpleTable(body, placeholder, dataArray) {
  if (!dataArray || dataArray.length === 0) return;

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
    table = cell.appendTable(dataArray);
    
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
 * Tìm placeholder bằng findText cho bảng Sông / Hồ Phụ lục
 */
function renderWaterTable(body, placeholder, dataArray) {
  if (!dataArray || dataArray.length === 0) return;

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
    table = cell.appendTable(dataArray);
    
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
    applyAppendixWaterTableStyle(table, dataArray.length);
  }
}

/**
 * GỐC 100%: Áp dụng style cho tất cả bảng (chữ 13pt/11pt, padding 3, viền đen)
 */
function applyTwoColumnStyle(table, numRows) {
  const tableAttr = {};
  tableAttr[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.LEFT;
  table.setAttributes(tableAttr);

  const isNested = table.getParent() && table.getParent().getType() === DocumentApp.ElementType.TABLE_CELL;
  const cols = numRows > 0 ? table.getRow(0).getNumCells() : 0;
  
  let colWidths = [];
  let fontSize = 13;

  if (isNested) {
    if (cols >= 5) {
      colWidths = [25, 50, 60, 45, 45]; // Total 225
      fontSize = 9.5;
    } else if (cols === 4) {
      colWidths = [30, 60, 75, 60]; // Total 225
      fontSize = 9.5;
    }
  } else {
    if (cols >= 5) {
      colWidths = [40, 100, 130, 94, 94]; // Total ~458
      fontSize = 11;
    } else if (cols === 4) {
      colWidths = [40, 120, 178, 120]; // Total ~458
      fontSize = 11;
    }
  }

  const cellStyle = {};
  cellStyle[DocumentApp.Attribute.BORDER_COLOR] = '#000000';
  cellStyle[DocumentApp.Attribute.BORDER_WIDTH] = 1;
  cellStyle[DocumentApp.Attribute.FONT_SIZE] = fontSize;
  cellStyle[DocumentApp.Attribute.PADDING_TOP] = 3;
  cellStyle[DocumentApp.Attribute.PADDING_BOTTOM] = 3;
  cellStyle[DocumentApp.Attribute.PADDING_LEFT] = 3;
  cellStyle[DocumentApp.Attribute.PADDING_RIGHT] = 3;

  for (let i = 0; i < numRows; i++) {
    const row = table.getRow(i);
    for (let j = 0; j < row.getNumCells(); j++) {
      const cell = row.getCell(j);
      cell.setAttributes(cellStyle);
      
      if (colWidths.length > j) {
        cell.setWidth(colWidths[j]);
      }
      
      for (let k = 0; k < cell.getNumChildren(); k++) {
        const child = cell.getChild(k);
        if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
          const p = child.asParagraph();
          p.setSpacingAfter(0).setLineSpacing(1.15);
          if (cols >= 5 && (j >= 3 || j === 0)) {
            p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          } else if (cols === 4 && (j >= 3 || j === 0)) {
            p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          }
        }
      }

      if (i === 0) {
        cell.editAsText().setBold(true);
        cell.setBackgroundColor('#f3f3f3');
      }
    }
  }
}

/**
 * CHỈ RIÊNG BẢNG SÔNG / HỒ PHỤ LỤC (3-4 CỘT)
 */
function applyAppendixWaterTableStyle(table, numRows) {
  const isNested = table.getParent() && table.getParent().getType() === DocumentApp.ElementType.TABLE_CELL;

  const tableAttr = {};
  tableAttr[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.LEFT;
  table.setAttributes(tableAttr);

  if (numRows <= 0) return;

  const cols = table.getRow(0).getNumCells();
  let colWidths = [198, 90, 90, 90];
  let fontSize = 11;

  if (isNested) {
    if (cols >= 5) {
      colWidths = [25, 50, 60, 45, 45]; // Total 225
      fontSize = 9.5;
    } else if (cols === 4) {
      colWidths = [90, 44, 44, 48];
      fontSize = 9.5;
    } else if (cols === 3) {
      colWidths = [108, 60, 60];
      fontSize = 10.5;
    }
  } else {
    if (cols >= 5) {
      colWidths = [40, 100, 130, 94, 94]; // Total ~458
      fontSize = 11;
    } else if (cols === 4) {
      colWidths = [198, 90, 90, 90];
      fontSize = 11;
    } else if (cols === 3) {
      colWidths = [228, 120, 120];
      fontSize = 12;
    }
  }

  const cellStyle = {};
  cellStyle[DocumentApp.Attribute.BORDER_COLOR] = '#000000';
  cellStyle[DocumentApp.Attribute.BORDER_WIDTH] = 1;
  cellStyle[DocumentApp.Attribute.FONT_SIZE] = fontSize;
  cellStyle[DocumentApp.Attribute.PADDING_TOP] = 3;
  cellStyle[DocumentApp.Attribute.PADDING_BOTTOM] = 3;
  cellStyle[DocumentApp.Attribute.PADDING_LEFT] = 3;
  cellStyle[DocumentApp.Attribute.PADDING_RIGHT] = 3;

  for (let i = 0; i < numRows; i++) {
    const row = table.getRow(i);
    for (let j = 0; j < row.getNumCells(); j++) {
      const cell = row.getCell(j);
      cell.setAttributes(cellStyle);
      
      for (let k = 0; k < cell.getNumChildren(); k++) {
        const child = cell.getChild(k);
        if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
          const p = child.asParagraph();
          p.setSpacingAfter(0).setLineSpacing(1.15);
          if (j > 0) {
            p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          } else {
            p.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
          }
        }
      }

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