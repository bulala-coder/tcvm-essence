# 本草針義 — 中藥・方劑・針灸 本質手記

跟「醫案」同一套架構：React + Vite + Tailwind，透過 Google Apps Script 跟 Google Sheets 聯動，離線時資料先存在瀏覽器本機（localStorage），恢復連線後自動補送同步。

這個 app 同時是**筆記本**和**查詢庫**：
- 「條目」＝你對某一味中藥／某一張方劑／某一個穴位的本質理解（性味歸經或組成或定位、主治、以及最重要的「本質探討」長文欄位）
- 「心得記錄」＝每次臨床實際用上它之後，回來補記的一筆：什麼情境用的、效果如何（顯效／好轉／無效／惡化／待觀察）、心得是什麼

兩者是一對多關係：一個條目底下可以累積很多筆臨床心得，讓你的理論理解跟臨床驗證持續互相修正。

## 資料欄位設計

**條目（entries）**：id、分類（中藥／方劑／針灸）、名稱、別名／出處、關鍵資訊（依分類顯示為性味歸經／組成／定位）、主治／適應症、本質探討（長文）、相關條目、標籤、建立時間、更新時間

**心得記錄（logs）**：id、所屬條目 id、日期、應用情境、效果、心得文字

## 本機執行

```bash
npm install
npm run dev
```

## 連接 Google Sheets（讓資料真正跟雲端同步、換裝置也看得到）

1. 開一份新的 Google Sheet（建議命名「本草針義資料庫」）。
2. 上方選單「擴充功能 → Apps Script」，把 `google-apps-script/Code.gs` 的內容整個貼進去，取代原本內容。
3. 存檔後點「部署 → 新增部署作業」，類型選「網頁應用程式」，執行身分選「我」，誰可以存取選「所有人」。
4. 部署後複製網頁應用程式網址（結尾是 `/exec`）。
5. 在專案根目錄新增 `.env` 檔（可從 `.env.example` 複製），把網址貼進 `VITE_SHEETS_WEBAPP_URL=`。
6. 重新 `npm run dev` 或重新部署（Vercel 的話在專案設定的 Environment Variables 加同一組），即可跟 Google Sheets 即時同步。

第一次執行 `doGet`／`doPost` 時，Apps Script 會自動建立「條目」和「心得記錄」兩個工作表並補上標題列，不用手動建表。

## 部署到 Vercel

跟其他專案流程一樣：GitHub push → Vercel import → Environment Variables 加上 `VITE_SHEETS_WEBAPP_URL` → Deploy。
