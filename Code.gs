/**
 * 音樂提示詞產生器 —— 授權伺服器。
 * 貼到 Google Sheet 的「擴充功能 > Apps Script」，部署為 Web App 後，
 * 把取得的網址填進 index.html 的 LICENSE_CHECK_URL
 * （序號授權閘門 <script> 開頭的 var LICENSE_CHECK_URL = "";）。
 * 完整部署步驟見 SETUP-授權伺服器設定.md。
 *
 * 這是一份全新建立、專屬本工具的 Google Sheet（不與工作區其他工具共用序號池）。
 * 需有這三個表頭欄位（欄位順序不拘，程式是用表頭文字比對欄位、不是靠欄位順序）：
 * 序號 / 開始日期 / 結束日期。
 * 開一個新的授權對象時：在表格新增一列，填「序號」欄，
 * 「開始日期」「結束日期」留空——序號第一次被驗證時會自動寫入
 * （開始日期＝當下時間，結束日期＝開始日期 + 12 個月）。
 *
 * 表頭列不需要在第 1 列——程式會掃描整份工作表，找出「同一列同時包含
 * 序號／開始日期／結束日期」三個表頭文字的那一列當作表頭（例如同一個分頁裡
 * 上方還疊放其他不相干的表格時也能正確運作），再從下一列開始比對序號。
 *
 * 這支後端只負責序號驗證，不代理任何付費 API（本工具的 LLM 串接走使用者自備金鑰 BYOK，
 * 前端直連服務商官方 API），也不處理跑馬燈——跑馬燈內容抓自工作區既有的共用授權伺服器，
 * 跟這支獨立的序號驗證後端是兩個不相干的系統。
 */

const VALID_AMOUNT = 12;
const COL_SERIAL = "序號";
const COL_START = "開始日期";
const COL_END = "結束日期";
// 若序號資料不在第一個工作表，把分頁名稱填在這裡；留空則自動用第一個工作表
const SHEET_NAME = "";

function doPost(e) {
  let result;
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const serial = String(payload.serial || "").trim();
    result = serial ? checkOrActivate(serial) : { valid: false, reason: "missing_serial" };
  } catch (err) {
    result = { valid: false, reason: "server_error", message: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// 方便部署後用瀏覽器直接開網址測試是否部署成功（doGet 用 curl -sL 或直接貼網址開都沒問題，
// 但 doPost 不要用 curl 測，會被 Google 的轉址機制誤導成失敗）
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    message: "授權伺服器運作中。請用 POST 傳送 JSON body，例如 {\"serial\":\"your-serial-here\"}"
  })).setMimeType(ContentService.MimeType.JSON);
}

function getLicenseSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return (SHEET_NAME && ss.getSheetByName(SHEET_NAME)) || ss.getSheets()[0];
}

function findHeaderRow_(values) {
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (row.indexOf(COL_SERIAL) >= 0 && row.indexOf(COL_START) >= 0 && row.indexOf(COL_END) >= 0) {
      return i;
    }
  }
  return -1;
}

function checkOrActivate(serial) {
  // LockService 避免多人同時第一次驗證同一組序號時，開卡時間被寫兩次、算出不同的到期日
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getLicenseSheet_();
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return { valid: false, reason: "serial_not_found" };

    const headerRowIdx = findHeaderRow_(values);
    if (headerRowIdx < 0) {
      return { valid: false, reason: "server_error", message: "整份工作表找不到同時包含「" + COL_SERIAL + "」「" + COL_START + "」「" + COL_END + "」的表頭列" };
    }
    const header = values[headerRowIdx];
    const colSerial = header.indexOf(COL_SERIAL);
    const colStart = header.indexOf(COL_START);
    const colEnd = header.indexOf(COL_END);

    let rowIdx = -1;
    for (let i = headerRowIdx + 1; i < values.length; i++) {
      if (String(values[i][colSerial]).trim() === serial) { rowIdx = i; break; }
    }
    if (rowIdx === -1) return { valid: false, reason: "serial_not_found" };

    const sheetRow = rowIdx + 1; // 轉成 1-indexed 的實際列號
    let startVal = values[rowIdx][colStart];
    let endVal = values[rowIdx][colEnd];
    const now = new Date();

    // 第一次有人驗證這組序號：開始計時
    if (!startVal) {
      startVal = now;
      sheet.getRange(sheetRow, colStart + 1).setValue(startVal);
    }
    // 若結束日期還沒算過（或開始日期是這次才補的），依開始日期 + 12 個月算出
    if (!endVal) {
      endVal = new Date(startVal);
      endVal.setMonth(endVal.getMonth() + VALID_AMOUNT);
      sheet.getRange(sheetRow, colEnd + 1).setValue(endVal);
    }

    const endDate = new Date(endVal);
    endDate.setHours(23, 59, 59, 999); // 結束日當天結束前都算有效
    const valid = now.getTime() <= endDate.getTime();

    return {
      valid: valid,
      reason: valid ? "ok" : "expired",
      activatedAt: new Date(startVal).toISOString(),
      expiresAt: new Date(endVal).toISOString()
    };
  } finally {
    lock.releaseLock();
  }
}
