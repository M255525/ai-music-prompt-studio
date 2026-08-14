# CLAUDE.md — ai-music-prompt-studio（音樂提示詞產生器）

「音樂提示詞產生器」——單檔前端工具，把曲風、情緒、歌詞方向的設定，組成適合 Suno 自訂模式使用的提示詞，或組成一句自然語言請求貼給 Gemini 協作寫詞／給製作建議。填一次曲風與歌詞設定，兩個分頁共用；可以純前端組成標籤與骨架，也可以串接使用者自己的語言模型取得中英對照的完整版本。

與 `行銷內容工具/ai-image-prompt-studio/`（圖片生成提示詞）、`ai-prompt-generator/`（影音框架＋TAG／APE／CO-STAR）是姊妹專案，同一套 BYOK 呼叫 LLM 的手法、同一種「模板組裝＋可選 AI 優化」兩段式互動，服務對象換成音樂生成提示詞。

## 架構

單一 `index.html`：內嵌 CSS/JS、無外部資源、無建置步驟。視覺主題是深色面板風格（`--bg #150f1e` + 圓點網格背景 + 紫色 `--accent #a855f7`），與 `ai-image-prompt-studio`（洋紅）、`ai-prompt-generator`（青色）、`Prompt`（琥珀色）刻意做出區隔；AI 優化面板用金色（`--gold #fbbf24`）區隔於主色（不像 `ai-image-prompt-studio` 用 teal，因為本專案沒有第三種需要區分的面板，紫＋金已足夠對比）。

- **共用欄位 + 兩個分頁**：`state.fields` 是單一組共用欄位（歌名／歌曲主題／曲風／情緒氛圍／速度／人聲風格／語言／樂器編制／歌詞內容或主題／歌曲段落／排除風格勾選＋自由文字），搭配 `MODES`（`suno`/`gemini`）只改變「組裝格式」。使用者填一次欄位，兩個分頁共用，只有下方輸出區塊依分頁不同。
- 曲風／情緒／樂器／人聲／語言／排除風格的選項（`GENRE_OPTIONS`／`MOOD_OPTIONS`／`INSTRUMENT_OPTIONS`／`VOCAL_OPTIONS`／`LANGUAGE_OPTIONS`／`EXCLUDE_OPTIONS`／`EXCLUDE_STYLE_OPTIONS`）每個選項同時定義中文標籤（`zh`，UI 顯示）與英文提示詞片語（`en`，Suno 風格標籤組裝用）；新增選項時兩者都要補。`GENRE_OPTIONS` 特別涵蓋了 Mandopop／國風等華語市場選項，不是純西方曲風清單。**刻意不提供「模仿特定真實歌手／樂團音色」的選項**——這是產品設計決策，不是遺漏，理由是避免使用者被引導去做可能違反目標服務條款或衍生著作權疑慮的請求；未來若要加類似欄位，務必先跟使用者確認法律風險而不是預設加上去。
- **排除風格分兩組獨立勾選（2026-08-13 應使用者要求加入）**：`EXCLUDE_OPTIONS`（音樂品質面：過度重複、混音渾濁等，`excludeTags` 欄位）跟 `EXCLUDE_STYLE_OPTIONS`（曲風/元素面：重金屬、饒舌、電子舞曲等，`excludeStyles` 欄位）是兩個**不同維度**、各自獨立的 checkbox-group（`excludeGroup`／`excludeStyleGroup`），不要合併成一組——理由跟 `COLOR_TONE_OPTIONS` 之於 `STYLE_OPTIONS`（見 `ai-image-prompt-studio`）一樣：兩者可自由搭配，合併會稀釋分類意義。`buildExcludeBlock()`／`buildGeminiParagraph()` 的 `excZh`／`en` 組裝都要同時吃這兩個陣列＋`excludeFree` 自由文字，改動時記得三者都要涵蓋，不能只改一邊。
- **純音樂／無歌聲時自動跳過歌詞（2026-08-13 應使用者要求加入）**：`isInstrumental(v)` 定義為 `v.vocal === 'instrumental' || v.language === 'none'`（人聲風格選「純音樂無歌聲」或語言選「無歌詞（純音樂）」都算），全部歌詞相關邏輯都要先檢查這個旗標：`buildLyricsBlock()` 直接回傳一句說明文字（不產生骨架/歌詞）；`buildStyleBlock()` 跳過 `LANGUAGE_OPTIONS` 的 `en` 標籤（避免跟 `instrumental only, no vocals` 互相矛盾，例如「純音樂」卻同時標「Mandarin Chinese vocals」）；`buildGeminiParagraph()` 跳過人聲/語言/歌詞方向子句，改附上請 AI 給編曲建議的句子；`aiPromptForMode()` 的 Suno 分支這種情況下**只要求 2 段輸出（中文說明→Style Tags）**、Gemini 分支只要求製作建議雙語版，都不要求 Lyrics/歌詞內容。新增任何跟歌詞/人聲相關的邏輯時，都要先過一遍 `isInstrumental()` 這個判斷，不要假設一定有人聲。
- **輸出面板的結構性差異（與姊妹專案最大的不同）**：`ai-image-prompt-studio`／`ai-prompt-generator` 每個分頁只有單一輸出框，本專案的 `MODES[mode].outputBlocks` 是陣列（`suno: ['style','lyrics','exclude']`、`gemini: ['paragraph']`），`renderOutputBlocks()` 依這個陣列動態渲染 1～3 個各自可複製的區塊——因為 Suno 的自訂模式介面本來就是「Style of Music」「Lyrics」「Exclude styles」三個獨立輸入框，貼合真實使用情境比硬塞成一個輸出框更好用。`state.assembled[mode]` 因此存的是**物件**（`{style, lyrics, exclude}` 或 `{paragraph}`），不是字串——修改儲存/載入/複製全部等邏輯時要記得這一層，不能比照姊妹專案直接當字串處理。
- **歌詞骨架 vs 完整歌詞的判斷邏輯**：`lyricsLooksReal(text)` 用「≥2 個換行或 ≥40 字」這個簡單啟發式判斷使用者是貼了完整歌詞還是只填了一句主題方向。判斷為「像完整歌詞」時，`buildLyricsBlock()` 依空行分段、依序對應到勾選的段落標記；判斷為「只是主題」時，輸出帶提示文字的段落骨架並在結尾註明「請改用 Gemini 分頁或送給 AI 優化」。這個啟發式不追求完美判斷（沒有語意理解），只是避免把一句話硬塞當成完整歌詞硬拆，或把真的歌詞誤判成骨架——如果之後發現太多誤判案例，可以調整門檻值，但不建議改成呼叫 LLM 判斷（會讓「純前端組裝」這個不需金鑰的路徑變成依賴 API）。
- **歌曲段落固定順序**：`STRUCTURE_OPTIONS`（`intro`/`verse`/`prechorus`/`chorus`/`bridge`/`outro`）勾選只是決定「要不要納入」，實際輸出順序固定依這個陣列的定義順序排列，不是使用者勾選的先後順序——`buildLyricsBlock()`／`buildGeminiParagraph()` 都是 `STRUCTURE_OPTIONS.filter(...)`，不是照 `fields.structure` 陣列本身的順序。
- **BYOK AI 優化的雙語設計理由**：比姊妹專案更需要中英對照，因為 Suno／Gemini 的風格標籤與國際版功能通常吃英文效果較好，但使用者多半用中文構思。`aiPromptForMode()` 依分頁給不同指令：Suno 分頁請 LLM 潤飾風格標籤，並且**若偵測到目前是骨架歌詞（`!lyricsLooksReal`）就直接請 LLM 用使用者選擇的語言寫出完整歌詞**（不是骨架），輸出格式固定「中文說明 → --- → Style Tags → --- → Lyrics」；Gemini 分頁固定要求「中文版 → --- → English 版」雙語輸出，方便需要時直接把 English 版拿去用。
- **BYOK AI 串接**：與 `ai-image-prompt-studio/index.html`、`ai-prompt-generator/index.html`、`Prompt/index.html` 同一套 `callLLM()` 模式（改動時互相參照）——全部走瀏覽器直連 `fetch()`：Claude 需 `anthropic-dangerous-direct-browser-access: true` header；Gemini 金鑰放 `x-goog-api-key` header；OpenAI/OpenRouter 用 Bearer。設定（provider/model/apiKey）存 `localStorage`（key: `musicPromptApiConfig`）——**金鑰只落在使用者本機瀏覽器，絕不可寫進程式碼**。逾時 180 秒；429/500/503/529 自動重試最多 2 次（間隔 8、16 秒）。
- **已儲存的提示詞**：`localStorage`（key: `musicPromptSavedItems`），每筆 `{id, mode, name, savedAt, fieldValues, blocks, aiOutput}`——`blocks` 對應 `state.assembled[mode]` 那個物件，不是單一字串。載入時會同時還原共用欄位＋切換回對應的分頁。事件委派的單一 click listener（`#savedList`）處理載入／複製／下載／刪除。
- `manual.html` 操作手冊：Suno／Gemini 分頁介紹／操作步驟／「組成」與「AI優化」差異說明／已儲存的提示詞／AI 串接說明／授權序號說明／隱私說明／使用警語／創作者資料／授權限制。**創作者經歷內容與 `icap-generator/manual.html`、`sbir-generator/manual.html`、`phoenix-loan-generator/manual.html`、`Prompt/manual.html`、`ai-prompt-generator/manual.html`、`ai-image-prompt-studio/manual.html` 為同一份（本專案是第 7 個共用此內容的姊妹專案），更新其中一邊時同步其餘各邊。**

## 序號授權（鎖定整個工具，12 個月）

比照 `ai-image-prompt-studio/index.html`（2026-08-12 最新模式）「單一工具、整個鎖住」的做法：`#licenseGate` 全螢幕遮罩預設鎖定，驗證通過才加上 `.hidden`；載入時一律對後端即時重驗（不只信任 localStorage 快取），背景每 20 分鐘重驗一次，過期會自動重新鎖住整個頁面。`localStorage` key：`musicPromptSerial`。

- `Code.gs` — 部署到 Google Sheet 的 Apps Script 原始碼：`doPost` 只做序號驗證＋首次自動啟用，`doGet` 供部署後測試。`VALID_AMOUNT = 12`（月）。這不是這個資料夾裡的檔案在跑，是使用者手動貼到 Google Sheet 的「擴充功能 → Apps Script」編輯器裡（實際部署走 `clasp push`，見下）部署成 Web App，取得網址後回填到 `index.html` 的 `LICENSE_CHECK_URL`。部署步驟見 `SETUP-授權伺服器設定.md`。
- **這支後端只做序號驗證，不代理任何付費 API**（本工具的 LLM 串接是 BYOK，前端直連使用者自己的服務商 API，跟序號系統無關），也**不處理跑馬燈**（見下）。
- **綁定的 Google Sheet 是全新建立、專屬本工具的表**（跟 `ai-image-prompt-studio` 沿用既有任務追蹤表不同，這次使用者確認要新建乾淨的一份）：<https://docs.google.com/spreadsheets/d/1ZfinIvYmOpZG0yN62sl9xBDKRiY2K7ZvBEb4MWp-hJQ/edit>（已建立，2026-08-12）。**這份試算表有好幾個分頁，序號／開始日期／結束日期欄位不在第一個分頁**（用 Google Drive 內容讀取工具一次看到的「多個表格」其實是分頁各自的內容被串接顯示，不是同一分頁疊table；`getDataRange()` 只會抓「當前那一個分頁」）——`Code.gs` 的 `findLicenseSheet_()` 因此改成**掃描試算表裡的每一個分頁**（`ss.getSheets()`，不是只看 `getSheets()[0]`），每個分頁再用 `findHeaderRow_()` 找出含「序號／開始日期／結束日期」三個表頭文字的那一列，找到第一個符合的分頁就用它。改動 `checkOrActivate()` 時務必保留這個「掃全部分頁＋掃表頭列」的兩層邏輯，不要簡化回「固定第一分頁、表頭固定在 `values[0]`」的寫法——這是實際部署時真的踩到、且會讓 `doPost` 回傳看似合理但其實是「找不到表頭」的 `server_error` 訊息（不是明顯的崩潰，容易被忽略）。
- **已完成部署（2026-08-13）**。實際部署走 `clasp`：複製貼上到 Apps Script 網頁編輯器出現語法錯誤（已知的剪貼簿踩坑，`node --check` 確認本機檔案語法正確），改用 `npm install -g @google/clasp` → 使用者自己在對話框用 `! clasp login` 完成 OAuth → 使用者從 Apps Script 編輯器「專案設定」複製 Script ID → `clasp clone <scriptId>` 到暫用資料夾 `_clasp-deploy/`（事後已刪除）→ `clasp push --force` 推送 → 使用者手動完成「部署 → 新增部署作業 → 網頁應用程式」＋ OAuth 同意畫面。`index.html` 的 `LICENSE_CHECK_URL` 已填入實際部署網址：`https://script.google.com/macros/s/AKfycbyrC_Pmy8GqSI3LsEeXQOyGrwMikhTX1k_3_u8UJXgEog1nKirm63NHbw2ZWMavl6x4/exec`。`doGet`／`doPost` 皆已用瀏覽器／Node `fetch()` 驗證正常（真序號 `mark0131` 回傳 `valid:true`＋到期日 2026/9/30；假序號回傳 `serial_not_found`；實際透過閘門 UI 解鎖也驗證過）。
- **踩坑記錄**：每次「管理部署作業 → 編輯 → 新版本 → 部署」完成後，緊接著的第一次請求有機率短暫回傳 Google Drive 的「找不到網頁」錯誤頁（HTTP 404），不是部署失敗，等幾秒重試就恢復正常——這是部署更新的傳播延遲，不要誤判成部署壞掉就重新走一次部署流程。

## 序號剩餘天數持續顯示（2026-08-13）

同 `ai-image-prompt-studio`／`ai-prompt-generator` 的修法（同一套序號授權骨架，系統性缺口一併補上）：`.topbar` 內 `nav` 前新增常駐徽章 `#licenseBadge`（🔑 剩餘 N 天，hover 顯示到期日；`.license-badge.warn` 用本檔既有的 `--gold`/`--gold-soft`），`unlock()`/`lock()` 同步更新／隱藏，剩餘 ≤7 天變色。語法已用 `node --check` 驗證通過，實際解鎖流程沿用與 `ai-image-prompt-studio` 相同的程式碼、已在該專案端對端驗證過。

## 頂部共用跑馬燈

`#marqueeBar` 內容抓自工作區既有的共用授權伺服器（`https://script.google.com/macros/s/AKfycbwKX0.../exec`，與 `Prompt/index.html`、`ai-prompt-generator`、`ai-image-prompt-studio`、`ai-video-studio` 系列共用同一個 Google Sheet），做法完全比照這些姊妹專案的獨立跑馬燈邏輯——**跟本工具自己的序號授權後端是兩個互不相干的系統**：頁面載入時直接 POST 一個空序號給共用端點，`localStorage` key `musicPromptMarquee`，每 20 分鐘背景重抓一次。改跑馬燈內容直接編輯共用 Sheet 即可，不需要重新部署任何 Apps Script。

## Port 分配

本機/桌面版固定用 **8790**（工作區目前已用 8765-8792，8790/8791 為建置時確認的空號；見根目錄 `CLAUDE.md`／`Prompt/CLAUDE.md` 的埠號分配表）。`launcher.py` 已建立備用，但**本次未打包 exe**（使用者明確表示這次只要網頁版），要打包時比照 `ai-image-prompt-studio` 的 PyInstaller 指令模式即可。

## 隱私與警語

無伺服器端經手使用者資料；欄位內容、組成結果、AI 優化結果、已儲存清單皆只存在使用者瀏覽器的 localStorage。序號驗證只會傳送序號本身給授權伺服器，不會傳送任何曲風或歌詞內容。首頁與手冊皆明列使用警語：不提供模仿真實歌手選項、AI 優化結果需自行查核、請勿輸入真實個資或機密資料、僅供教學與個人使用禁止商業化。修改功能時這些警語需一併檢視是否仍準確。

## 指令

無建置/測試指令。修改 `index.html` 或 `manual.html` 後直接用瀏覽器開啟驗證，或暫起 `python -m http.server <port>` 測完關閉。修改內嵌 `<script>` 後可用以下方式快速檢查語法（把 `<script>...</script>` 內容抽出存成 `.js` 再跑 `node --check`）：

```bash
python -c "
import re
html = open('index.html', encoding='utf-8').read()
open('_check.js','w',encoding='utf-8').write(re.findall(r'<script>(.*?)</script>', html, re.S)[0])
"
node --check _check.js
```

**測試序號授權邏輯前，需先照 `SETUP-授權伺服器設定.md` 部署好 Apps Script 並回填 `LICENSE_CHECK_URL`**，否則會顯示「尚未設定授權伺服器網址」的 fail-closed 錯誤訊息並停留在鎖定畫面；開發階段要測試欄位/分頁/AI/儲存清單等其他功能，可在瀏覽器 devtools 手動對 `#licenseGate` 加上 `hidden` class 暫時繞過。

## GitHub 與線上部署

公開 repo：<https://github.com/M255525/ai-music-prompt-studio>（與 `ai-image-prompt-studio`／`ai-prompt-generator` 同樣模式，已建立並 push）。`.github/workflows/deploy-pages.yml` 已備妥（觸發分支 `master`），GitHub Pages 已啟用（`gh api repos/.../pages -X POST -f build_type=workflow`），線上網址：<https://m255525.github.io/ai-music-prompt-studio/>。

## 加入主畫面（PWA，2026-08-14 新增）

比照 `expense-tracker-pwa`／`ai-prompt-generator`／`ai-image-prompt-studio`（同一次一併加上）的做法：`manifest.json`＋`icons/`（紫色 `#a855f7` 背景「樂」字圖示）＋`service-worker.js`（network-first＋同源快取備援，跨網域請求略過，不需要每次改動升版 `CACHE_NAME`）。頁尾 `.footer-meta` 新增「📲 加入主畫面」按鈕（`#installBtn`），獨立 IIFE，跟序號授權閘門互不相依。已用 Playwright 實測 Chromium 觸發 `beforeinstallprompt`、SW 成功註冊。

## 本次未做（後續視需要再處理）

- 桌面版 exe 未打包（`launcher.py` 已就緒，PORT 8790，之後要打包比照 `ai-image-prompt-studio` 的 PyInstaller 指令）。
- 根目錄 `專案目錄.docx` 尚未加入本專案的列。
