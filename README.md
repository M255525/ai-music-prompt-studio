# 音樂提示詞產生器

輸入曲風、情緒與歌詞方向，組成適合 Suno 自訂模式，或用來請 Gemini 協作寫詞／給製作建議的音樂提示詞。

🔗 **線上使用**：<https://m255525.github.io/ai-music-prompt-studio/>

⚠️ **需要授權序號才能使用**（見下方「授權序號」一節）。

## 這是什麼

- **共用一組曲風與歌詞欄位**：歌名、歌曲主題、曲風、情緒氛圍、速度、人聲風格、語言、樂器編制、歌詞內容或主題、歌曲段落、排除風格，Suno／Gemini 兩個分頁共用，只需填一次。
- **兩個分頁，格式不同**：
  - **Suno（自訂模式）**：產生三段可直接貼上的內容——Style of Music（風格標籤）、Lyrics（含 `[Verse]`／`[Chorus]` 等段落標記的歌詞）、Exclude Styles（排除風格）。
  - **Gemini（作詞／製作建議協作）**：組成一句自然語言請求，貼進 Gemini 對話框請它幫你寫歌詞草稿或給製作建議。
- **兩段式輸出**：「🔧 組成提示詞」是純前端關鍵字組裝，不需金鑰、不連網（歌詞若只填主題方向會產生段落骨架）；「🚀 送給 AI 優化」選用，串接你自己的 LLM API，Suno 分頁潤飾標籤並視情況直接寫出完整歌詞，Gemini 分頁產出中英對照的歌詞草稿與製作建議。

## 功能

- **曲風／情緒／樂器可複選**：20 種曲風（含 Mandopop、國風等華語市場選項）、12 種情緒、15 種樂器，各自附中文標籤與對應英文 Suno 標籤
- **刻意不提供「模仿特定真實歌手」選項**：避免著作權／商標疑慮
- **內建範例**：5 組完全虛構的情境範例，涵蓋 City Pop／抒情慢歌／EDM／Mandopop對唱／Lo-fi，一鍵套用快速上手
- **BYOK**：支援 Claude／OpenAI／Gemini／OpenRouter 四選一，API 金鑰只存在瀏覽器 localStorage，不經過任何後端伺服器
- **已儲存的提示詞**：可將組成的提示詞（連同 AI 優化結果）存成有名字的紀錄，之後載入、複製、下載 .txt 或刪除
- **授權序號閘門**：整個工具需輸入有效序號才能使用，效期 12 個月
- 響應式版面，桌機／平板／手機皆可使用

## 怎麼用

1. 開啟 <https://m255525.github.io/ai-music-prompt-studio/>，輸入授權序號
2. 填「歌曲主題」，視需要套用範例或勾選曲風／情緒／速度／人聲／語言／樂器／段落／排除風格
3. 選一個分頁（Suno／Gemini），按「🔧 組成提示詞」取得可複製的內容；或展開「API 連線設定」貼上你自己的金鑰，按「🚀 送給 AI 優化」取得潤飾或完整補上歌詞的版本
4. 滿意的結果可在「已儲存的提示詞」取名儲存

詳細操作說明見 [manual.html](https://m255525.github.io/ai-music-prompt-studio/manual.html)。

### API 金鑰申請網址

| 服務商 | 申請網址 |
|---|---|
| Claude（Anthropic） | <https://console.anthropic.com/> |
| OpenAI | <https://platform.openai.com/api-keys> |
| Gemini（Google AI Studio） | <https://aistudio.google.com/apikey> |
| OpenRouter | <https://openrouter.ai/keys> |

## 授權序號

本工具需先輸入授權序號並驗證通過，才能使用整個工具，效期自第一次驗證起算 12 個月。序號請向工具提供者索取；沒有序號請透過 [manual.html](https://m255525.github.io/ai-music-prompt-studio/manual.html) 上的聯絡方式洽詢。

## 技術架構

純前端單檔工具，**沒有任何建置流程、框架、npm 依賴**：

| 項目 | 做法 |
|---|---|
| 提示詞組裝 | 純前端字串模板，不連網 |
| AI 優化 | 瀏覽器直接 `fetch` 你選擇的 LLM 服務商官方 API（無後端代理） |
| 金鑰儲存 | `localStorage`，只在使用者自己的瀏覽器裡 |
| 授權序號驗證 | Google Sheet + Google Apps Script（免費輕量後端），只做序號驗證，不經手提示詞內容 |
| 頂部跑馬燈 | 與工作區其他工具共用同一個公告來源（可選、失敗不影響主功能） |

## 本機開發

不需要任何建置工具或安裝依賴，純靜態檔案：

```bash
git clone https://github.com/M255525/ai-music-prompt-studio.git
cd ai-music-prompt-studio
python -m http.server 8000
```

開啟 `http://localhost:8000`（本機測試序號閘門需先部署自己的 Apps Script 後端，見 `SETUP-授權伺服器設定.md`）。

## 檔案結構

```
index.html                     主程式（跑馬燈 + 序號閘門 + 共用欄位 + Suno/Gemini 分頁 + AI優化 + 儲存清單）
manual.html                    操作手冊
Code.gs                        授權序號驗證用 Apps Script 後端原始碼
SETUP-授權伺服器設定.md         授權後端部署步驟
launcher.py                    可攜式桌面版啟動器（PyInstaller 打包用，本次未打包 exe）
CLAUDE.md                      開發筆記／架構決策紀錄
```

## 隱私與資料

本 repo 公開的只有程式碼。你填寫的曲風與歌詞設定、組成的提示詞、AI 優化結果只存在自己瀏覽器的 localStorage；按下「送給 AI 優化」時，這些內容會直接連線送到你選擇的 AI 服務商，不經過本工具作者或任何第三方伺服器。授權序號驗證只會傳送序號本身給驗證伺服器，不會傳送任何提示詞內容。

## 授權/用途

僅供教學與個人使用，禁止未經授權公開發布、販售或商業化使用。
