// 本草針義 — Google Apps Script 後端
// 部署後，將 Web App 網址填入前端 .env 的 VITE_SHEETS_WEBAPP_URL

// 存取密碼：改成你自己的密碼，部署後只有輸入這組密碼的人能讀寫這份 Sheet
var SHARED_SECRET = 'bulalavet'

var ENTRIES_SHEET = '條目'
var LOGS_SHEET = '心得記錄'

// 內部欄位代號，順序固定，決定 Sheet 中每一欄的位置（勿更動順序，要新增欄位時加在最後）
var ENTRY_FIELDS = ['id', 'category', 'name', 'aliases', 'key_info', 'core', 'indications', 'tags', 'related', 'created_at', 'updated_at']
var LOG_FIELDS = ['id', 'entry_id', 'date', 'scenario', 'effect', 'note', 'created_at']

// 寫進 Sheet 第一列的中文標題，順序需與對應的 FIELDS 一一對應
var ENTRY_LABELS = ['編號', '分類', '名稱', '別名／出處', '關鍵資訊', '本質探討', '主治／適應症', '標籤', '相關條目', '建立時間', '更新時間']
var LOG_LABELS = ['編號', '條目編號', '日期', '應用情境', '效果', '心得', '建立時間']

function getSS_() {
  return SpreadsheetApp.getActiveSpreadsheet()
}

function getOrCreateSheet_(name, labels) {
  var ss = getSS_()
  var sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
  }
  // 每次都強制把第一列覆蓋成目前的中文標題，不依賴舊資料的狀態判斷
  sheet.getRange(1, 1, 1, labels.length).setValues([labels])
  sheet.setFrozenRows(1)
  return sheet
}

// 欄位資料一律用 FIELDS 的順序定位，不依賴 Sheet 上的標題文字（標題只是給人看的中文）
function rowToObj_(fields, row) {
  var obj = {}
  fields.forEach(function (h, i) {
    if (h === 'tags') {
      obj[h] = row[i] ? String(row[i]).split(',').map(function (s) { return s.trim() }).filter(Boolean) : []
    } else {
      obj[h] = row[i] === undefined || row[i] === null ? '' : row[i]
    }
  })
  return obj
}

function objToRow_(fields, obj) {
  return fields.map(function (h) {
    if (h === 'tags') return Array.isArray(obj.tags) ? obj.tags.join(',') : (obj.tags || '')
    return obj[h] !== undefined ? obj[h] : ''
  })
}

function readAll_(sheetName, fields, labels) {
  var sheet = getOrCreateSheet_(sheetName, labels)
  var data = sheet.getDataRange().getValues()
  var rows = data.slice(1)
  return rows.filter(function (r) { return r[0] }).map(function (r) { return rowToObj_(fields, r) })
}

function doGet(e) {
  if (e.parameter.pin !== SHARED_SECRET) return jsonOut_({ error: 'unauthorized' })

  var action = (e.parameter.action || 'list')
  if (action === 'list') {
    var entries = readAll_(ENTRIES_SHEET, ENTRY_FIELDS, ENTRY_LABELS)
    var logs = readAll_(LOGS_SHEET, LOG_FIELDS, LOG_LABELS)
    return jsonOut_({ entries: entries, logs: logs })
  }
  return jsonOut_({ error: 'unknown action' })
}

function upsert_(sheetName, fields, labels, obj) {
  var sheet = getOrCreateSheet_(sheetName, labels)
  var data = sheet.getDataRange().getValues()
  var idCol = fields.indexOf('id')
  var targetRow = -1
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === obj.id) { targetRow = i + 1; break }
  }
  var rowValues = objToRow_(fields, obj)
  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, fields.length).setValues([rowValues])
  } else {
    sheet.appendRow(rowValues)
  }
}

function delete_(sheetName, fields, labels, id) {
  var sheet = getOrCreateSheet_(sheetName, labels)
  var data = sheet.getDataRange().getValues()
  var idCol = fields.indexOf('id')
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][idCol] === id) {
      sheet.deleteRow(i + 1)
    }
  }
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents)
  if (body.pin !== SHARED_SECRET) return jsonOut_({ error: 'unauthorized' })

  var action = body.action

  if (action === 'upsert_entry') {
    upsert_(ENTRIES_SHEET, ENTRY_FIELDS, ENTRY_LABELS, body.entry)
    return jsonOut_({ ok: true })
  }

  if (action === 'delete_entry') {
    delete_(ENTRIES_SHEET, ENTRY_FIELDS, ENTRY_LABELS, body.id)
    // 連動刪除該條目底下的心得記錄
    var sheet = getOrCreateSheet_(LOGS_SHEET, LOG_LABELS)
    var data = sheet.getDataRange().getValues()
    var entryCol = LOG_FIELDS.indexOf('entry_id')
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][entryCol] === body.id) sheet.deleteRow(i + 1)
    }
    return jsonOut_({ ok: true })
  }

  if (action === 'upsert_log') {
    upsert_(LOGS_SHEET, LOG_FIELDS, LOG_LABELS, body.log)
    return jsonOut_({ ok: true })
  }

  if (action === 'delete_log') {
    delete_(LOGS_SHEET, LOG_FIELDS, LOG_LABELS, body.id)
    return jsonOut_({ ok: true })
  }

  return jsonOut_({ error: 'unknown action' })
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
