// 本草針義 — Google Apps Script 後端
// 部署後，將 Web App 網址填入前端 .env 的 VITE_SHEETS_WEBAPP_URL

var ENTRIES_SHEET = '條目'
var LOGS_SHEET = '心得記錄'

var ENTRY_HEADERS = ['id', 'category', 'name', 'aliases', 'key_info', 'core', 'indications', 'tags', 'related', 'created_at', 'updated_at']
var LOG_HEADERS = ['id', 'entry_id', 'date', 'scenario', 'effect', 'note', 'created_at']

function getSS_() {
  return SpreadsheetApp.getActiveSpreadsheet()
}

function getOrCreateSheet_(name, headers) {
  var ss = getSS_()
  var sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
    sheet.appendRow(headers)
    sheet.setFrozenRows(1)
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers)
    sheet.setFrozenRows(1)
  }
  return sheet
}

function rowToObj_(headers, row) {
  var obj = {}
  headers.forEach(function (h, i) {
    if (h === 'tags') {
      obj[h] = row[i] ? String(row[i]).split(',').map(function (s) { return s.trim() }).filter(Boolean) : []
    } else {
      obj[h] = row[i] === undefined || row[i] === null ? '' : row[i]
    }
  })
  return obj
}

function objToRow_(headers, obj) {
  return headers.map(function (h) {
    if (h === 'tags') return Array.isArray(obj.tags) ? obj.tags.join(',') : (obj.tags || '')
    return obj[h] !== undefined ? obj[h] : ''
  })
}

function readAll_(sheetName, headers) {
  var sheet = getOrCreateSheet_(sheetName, headers)
  var data = sheet.getDataRange().getValues()
  var actualHeaders = data[0]
  var rows = data.slice(1)
  return rows.filter(function (r) { return r[0] }).map(function (r) { return rowToObj_(actualHeaders, r) })
}

function doGet(e) {
  var action = (e.parameter.action || 'list')
  if (action === 'list') {
    var entries = readAll_(ENTRIES_SHEET, ENTRY_HEADERS)
    var logs = readAll_(LOGS_SHEET, LOG_HEADERS)
    return jsonOut_({ entries: entries, logs: logs })
  }
  return jsonOut_({ error: 'unknown action' })
}

function upsert_(sheetName, headers, obj) {
  var sheet = getOrCreateSheet_(sheetName, headers)
  var data = sheet.getDataRange().getValues()
  var actualHeaders = data[0]
  var idCol = actualHeaders.indexOf('id')
  var targetRow = -1
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === obj.id) { targetRow = i + 1; break }
  }
  var rowValues = objToRow_(actualHeaders, obj)
  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, actualHeaders.length).setValues([rowValues])
  } else {
    sheet.appendRow(rowValues)
  }
}

function delete_(sheetName, headers, id) {
  var sheet = getOrCreateSheet_(sheetName, headers)
  var data = sheet.getDataRange().getValues()
  var actualHeaders = data[0]
  var idCol = actualHeaders.indexOf('id')
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][idCol] === id) {
      sheet.deleteRow(i + 1)
    }
  }
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents)
  var action = body.action

  if (action === 'upsert_entry') {
    upsert_(ENTRIES_SHEET, ENTRY_HEADERS, body.entry)
    return jsonOut_({ ok: true })
  }

  if (action === 'delete_entry') {
    delete_(ENTRIES_SHEET, ENTRY_HEADERS, body.id)
    // 連動刪除該條目底下的心得記錄
    var sheet = getOrCreateSheet_(LOGS_SHEET, LOG_HEADERS)
    var data = sheet.getDataRange().getValues()
    var headers = data[0]
    var entryCol = headers.indexOf('entry_id')
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][entryCol] === body.id) sheet.deleteRow(i + 1)
    }
    return jsonOut_({ ok: true })
  }

  if (action === 'upsert_log') {
    upsert_(LOGS_SHEET, LOG_HEADERS, body.log)
    return jsonOut_({ ok: true })
  }

  if (action === 'delete_log') {
    delete_(LOGS_SHEET, LOG_HEADERS, body.id)
    return jsonOut_({ ok: true })
  }

  return jsonOut_({ error: 'unknown action' })
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
