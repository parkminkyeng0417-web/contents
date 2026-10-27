const SHEET_NAME = '응답';
const HEADERS = ['timestamp','q1_age','q2_gender','q3_idol','q4_games','q4_games_other','q5_recent','q6_reasons','q6_reasons_other','q7_intent','q8_comeback','q9_album','q10_comment'];

function doPost(e) {
  try {
    const data = JSON.parse((e.postData && e.postData.contents) || '{}');
    normalizeSubmission_(data);
    validateSubmission_(data);
    const sheet = getSheet_();
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      ensureHeaders_(sheet);
      const record = Object.assign({timestamp: new Date()}, data);
      sheet.appendRow(HEADERS.map(key => serialize_(record[key])));
    } finally { lock.releaseLock(); }
    return json_({ok:true});
  } catch (error) { return json_({ok:false,error:error.message}); }
}

function doGet(e) {
  try {
    if (!e || !e.parameter || e.parameter.action !== 'results') return json_({ok:true,message:'Survey API is running.'});
    const sheet = getSheet_();
    ensureHeaders_(sheet);
    const values = sheet.getDataRange().getValues();
    const headers = values.shift() || HEADERS;
    const rows = values.filter(row => row.some(value => value !== '')).map(row => {
      const item = {};
      headers.forEach((key,index) => {
        const value = row[index];
        if (key === 'timestamp') item[key] = value instanceof Date ? value.toISOString() : String(value || '');
        else item[key] = ['q4_games','q5_recent','q6_reasons'].includes(key) ? (value ? String(value).split(' | ') : []) : String(value == null ? '' : value);
      });
      return item;
    });
    return respond_(e,{ok:true,rows:rows});
  } catch (error) { return respond_(e,{ok:false,error:error.message}); }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('이 스크립트를 Google Sheets에 연결해 주세요.');
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  const actual = sheet.getRange(1,1,1,HEADERS.length).getDisplayValues()[0];
  if (actual.join('\n') !== HEADERS.join('\n')) throw new Error('시트 첫 행의 열 이름이 Code.gs의 HEADERS와 일치하지 않습니다.');
}

function validateSubmission_(data) {
  const required = ['q1_age','q2_gender','q3_idol','q4_games','q5_recent'];
  required.forEach(key => {
    if (data[key] == null || data[key] === '' || (Array.isArray(data[key]) && !data[key].length)) throw new Error('필수 응답이 누락되었습니다: '+key);
  });
  if (String(data.q10_comment || '').length > 500) throw new Error('Q10은 500자 이하여야 합니다.');
}
function normalizeSubmission_(data) {
  if (Array.isArray(data.q4_games) && data.q4_games.includes('해본 적 없다')) data.q4_games = ['해본 적 없다'];
  if (Array.isArray(data.q5_recent) && data.q5_recent.includes('없다')) {
    data.q5_recent = ['없다'];
    data.q6_reasons = [];
    data.q6_reasons_other = '';
  }
}
function serialize_(value) { return Array.isArray(value) ? value.join(' | ') : (value == null ? '' : value); }
function respond_(e,payload) {
  const callback=e&&e.parameter&&e.parameter.callback;
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) return ContentService.createTextOutput(callback+'('+JSON.stringify(payload)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return json_(payload);
}
function json_(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
