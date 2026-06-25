/**
 * Campus Desk — Cloud Sync backend
 * --------------------------------
 * Deploy this as a Google Apps Script Web App. It stores each "room"
 * (one row per college/dataset key) as a JSON blob in a Google Sheet,
 * so every device (student phones + staff/admin dashboards) reads and
 * writes the same shared data.
 *
 * SETUP
 * 1. Go to https://script.google.com -> New project.
 * 2. Delete the placeholder code and paste this whole file in.
 * 3. Click the clock icon (Project Settings) -> nothing else needed;
 *    a Sheet is created automatically on first run, OR:
 *    optionally create a blank Google Sheet first and put its ID below
 *    in SHEET_ID for a fixed, easy-to-find spreadsheet.
 * 4. Click Deploy -> New deployment -> select type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Click Deploy, authorize the permissions Google asks for.
 * 6. Copy the Web app URL (ends in /exec). That is your "Sync endpoint URL".
 * 7. In Campus Desk -> Settings -> Cloud sync, paste that URL, set a
 *    Room name (e.g. your college name, same value on every device),
 *    tick "Enable live sync", and Save.
 *
 * That's it — student phones applying for entrance, and every staff/
 * admin dashboard, now read & write the same shared dataset.
 */

// Optional: paste a specific Spreadsheet ID here to pin the storage sheet.
// Leave blank ('') to auto-create/reuse a sheet named "CampusDeskSync".
var SHEET_ID = '';
var SHEET_NAME = 'rooms';

function getSheet_() {
  var ss;
  if (SHEET_ID) {
    ss = SpreadsheetApp.openById(SHEET_ID);
  } else {
    var files = DriveApp.getFilesByName('CampusDeskSync');
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create('CampusDeskSync');
    }
  }
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['room', 'updatedAt', 'json']);
  }
  return sheet;
}

function findRow_(sheet, room) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === room) return i + 1; // 1-indexed row number
  }
  return -1;
}

function roomFromPath_(e) {
  // Supports /exec/ROOMNAME (path info) or ?room=ROOMNAME query param.
  if (e.parameter && e.parameter.room) return String(e.parameter.room);
  if (e.pathInfo) return String(e.pathInfo).replace(/^\/+/, '');
  return '';
}

function doGet(e) {
  var room = roomFromPath_(e);
  if (!room) return jsonOut_({ error: 'missing room' }, 400);
  var sheet = getSheet_();
  var row = findRow_(sheet, room);
  if (row < 0) return jsonOut_({ data: null });
  var json = sheet.getRange(row, 3).getValue();
  var parsed;
  try { parsed = JSON.parse(json); } catch (err) { parsed = null; }
  return jsonOut_(parsed || { data: null });
}

function doPost(e) {
  var room = roomFromPath_(e);
  if (!room) return jsonOut_({ error: 'missing room' }, 400);
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return jsonOut_({ error: 'bad json' }, 400); }
  var sheet = getSheet_();
  var row = findRow_(sheet, room);
  var json = JSON.stringify(body);
  if (row < 0) {
    sheet.appendRow([room, new Date().toISOString(), json]);
  } else {
    sheet.getRange(row, 2).setValue(new Date().toISOString());
    sheet.getRange(row, 3).setValue(json);
  }
  return jsonOut_({ ok: true });
}

function jsonOut_(obj, code) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
