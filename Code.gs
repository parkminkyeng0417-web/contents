const SHEET_NAME = '응답';
const DASHBOARD_SHEET_NAME = '대시보드';
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
      try { refreshDashboard_(); } catch (dashboardError) { console.error(dashboardError); }
    } finally { lock.releaseLock(); }
    return json_({ok:true});
  } catch (error) { return json_({ok:false,error:error.message}); }
}

function doGet(e) {
  return json_({ok:false,error:'설문 결과는 공개되지 않습니다.'});
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

function onOpen() {
  SpreadsheetApp.getUi().createMenu('설문 관리')
    .addItem('대시보드 새로고침', 'setupDashboard')
    .addToUi();
}

function setupDashboard() {
  refreshDashboard_();
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DASHBOARD_SHEET_NAME)
  );
}

function refreshDashboard_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const responseSheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  ensureHeaders_(responseSheet);
  const values = responseSheet.getDataRange().getValues();
  const headers = values.shift();
  const rows = values.filter(row => row.some(value => value !== '')).map(row => {
    const item = {};
    headers.forEach((key, index) => item[key] = row[index]);
    return item;
  });
  const dashboard = spreadsheet.getSheetByName(DASHBOARD_SHEET_NAME) || spreadsheet.insertSheet(DASHBOARD_SHEET_NAME);
  dashboard.clear();
  dashboard.getCharts().forEach(chart => dashboard.removeChart(chart));
  dashboard.setHiddenGridlines(true);
  for (let column = 1; column <= 12; column++) dashboard.setColumnWidth(column, 115);

  dashboard.getRange('A1:L1').merge().setValue('육성·꾸미기 게임 설문 대시보드')
    .setFontSize(20).setFontWeight('bold').setFontColor('#191F28').setBackground('#F2F4F6')
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  dashboard.setRowHeight(1, 54);
  dashboard.getRange('A2:L2').merge().setValue('응답 원본은 ‘응답’ 탭에서 확인할 수 있습니다. 새 응답이 들어오면 자동으로 갱신됩니다.')
    .setFontColor('#6B7684').setFontSize(10);

  const scores = rows.map(row => Number(row.q7_intent)).filter(score => score >= 1 && score <= 5);
  const albumAnswers = rows.filter(row => row.q9_album);
  const metrics = [
    ['전체 응답', rows.length + '명'],
    ['Q7 평균 이용 의향', scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) + ' / 5' : '-'],
    ['Q7 이용 긍정(4~5)', scores.length ? Math.round(scores.filter(score => score >= 4).length / scores.length * 100) + '%' : '-'],
    ['앨범 구매 긍정', albumAnswers.length ? Math.round(albumAnswers.filter(row => row.q9_album === '구매할 이유가 늘어난다').length / albumAnswers.length * 100) + '%' : '-']
  ];
  metrics.forEach((metric, index) => {
    const column = 1 + index * 3;
    dashboard.getRange(4, column, 1, 2).merge().setValue(metric[0]).setFontColor('#6B7684').setFontWeight('bold').setBackground('#F7F8FA');
    dashboard.getRange(5, column, 1, 2).merge().setValue(metric[1]).setFontSize(18).setFontWeight('bold').setFontColor('#3182F6').setBackground('#F7F8FA');
  });

  const sections = [
    [8, 1, 'Q1 연령대', countValues_(rows, 'q1_age', false), ['20대 초반','20대 후반','30대 초반','30대 후반','기타']],
    [8, 5, 'Q2 성별', countValues_(rows, 'q2_gender', false), ['여성','남성','기타','응답하지 않음']],
    [8, 9, 'Q3 아이돌 선호', countValues_(rows, 'q3_idol', false), ['있다','예전엔 있었다','없다']],
    [18, 1, 'Q4 어릴 때 해본 게임', countValues_(rows, 'q4_games', true), null],
    [18, 5, 'Q5 최근 1년 활동', countValues_(rows, 'q5_recent', true), null],
    [18, 9, 'Q6 다시 하거나 끌린 이유', countValues_(rows, 'q6_reasons', true), null],
    [30, 1, 'Q7 게임 이용 의향', countValues_(rows, 'q7_intent', false), ['1','2','3','4','5']],
    [30, 5, 'Q8 컴백 무대 연동 반응', countValues_(rows, 'q8_comeback', false), ['더 열심히 하고 싶다','상관없다','부담스럽다']],
    [30, 9, 'Q9 앨범 구매 영향', countValues_(rows, 'q9_album', false), ['구매할 이유가 늘어난다','영향 없다','오히려 거부감이 든다']]
  ];
  const tableInfo = sections.map(section => writeDistribution_(dashboard, section[0], section[1], section[2], section[3], rows.length, section[4]));

  [tableInfo[0], tableInfo[6], tableInfo[8]].forEach((info, index) => {
    if (!info.count) return;
    const chart = dashboard.newChart().setChartType(Charts.ChartType.BAR)
      .addRange(dashboard.getRange(info.dataRow, info.column, info.count, 2))
      .setPosition(42, 1 + index * 4, 0, 0)
      .setOption('title', info.title).setOption('legend', {position:'none'})
      .setOption('colors', ['#3182F6']).setOption('width', 420).setOption('height', 260)
      .build();
    dashboard.insertChart(chart);
  });

  const comments = rows.filter(row => String(row.q10_comment || '').trim()).slice(-20).reverse();
  dashboard.getRange('A61:L61').merge().setValue('Q10 원하는 기능·특징 원문').setFontSize(14).setFontWeight('bold').setFontColor('#191F28').setBackground('#E8F3FF');
  if (comments.length) {
    const commentRows = comments.map(row => [row.q10_comment, row.q1_age, row.q2_gender, row.q3_idol]);
    dashboard.getRange(62, 1, commentRows.length, 4).setValues(commentRows).setWrap(true).setVerticalAlignment('top');
    dashboard.getRange(62, 1, commentRows.length, 1).setBackground('#F7F8FA');
  } else {
    dashboard.getRange('A62').setValue('아직 작성된 의견이 없습니다.').setFontColor('#6B7684');
  }
  dashboard.setFrozenRows(2);
}

function countValues_(rows, key, multiple) {
  return rows.reduce((counts, row) => {
    const raw = row[key];
    const values = multiple ? (raw ? String(raw).split(' | ') : []) : (raw === '' || raw == null ? [] : [String(raw)]);
    values.forEach(value => counts[value] = (counts[value] || 0) + 1);
    return counts;
  }, {});
}

function writeDistribution_(sheet, row, column, title, counts, denominator, order) {
  sheet.getRange(row, column, 1, 3).merge().setValue(title).setFontWeight('bold').setFontColor('#191F28').setBackground('#E8F3FF');
  sheet.getRange(row + 1, column, 1, 3).setValues([['응답','인원','비율']]).setFontWeight('bold').setFontColor('#6B7684');
  let entries = Object.keys(counts).map(label => [label, counts[label]]);
  entries = order ? order.filter(label => counts[label]).map(label => [label, counts[label]]) : entries.sort((a, b) => b[1] - a[1]);
  if (entries.length) {
    const table = entries.map(entry => [entry[0], entry[1], denominator ? entry[1] / denominator : 0]);
    sheet.getRange(row + 2, column, table.length, 3).setValues(table);
    sheet.getRange(row + 2, column + 2, table.length, 1).setNumberFormat('0%');
  } else {
    sheet.getRange(row + 2, column).setValue('응답 없음').setFontColor('#6B7684');
  }
  return {title:title,column:column,dataRow:row + 2,count:entries.length};
}
function serialize_(value) { return Array.isArray(value) ? value.join(' | ') : (value == null ? '' : value); }
function json_(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
