# Prompt Tool (AI Virtual Influencer)

把導演的組合碼（`CAS-02_SCN-01_POS-04_EXP-01 T0 x4`）轉成 ComfyUI 可貼上的 zImageTurbo camera-first prompt。MVP 第一期單角色 `ACC-001`。

## 快速開始

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

開發伺服器預設在 `http://localhost:5173`。

## 主要流程

1. 在 `Orders` 區塊新增一筆或多筆工單
2. 在 text / form 模式下填入四碼 + Tier + count
3. 點 `Recommend COMPs`，系統推薦 3-5 個相容構圖
4. 在 `Composition Picker` 勾選要用的構圖
5. 點 `Assemble Prompts` 產出 prompt 卡片
6. 每張卡片可直接 `Copy`，或點 `Download all prompts.txt` 整批下載

## 資料層

所有風格庫資料都放在 `src/data/` 的 YAML 檔案，修改後在 `pnpm dev` 下會跟著重載。

- `src/data/characters/ACC-001.yaml`：角色參數卡
- `src/data/styles/outfits.yaml`：服裝分類
- `src/data/styles/scenes.yaml`：場景分類
- `src/data/styles/poses.yaml`：姿勢分類
- `src/data/styles/expressions.yaml`：表情分類
- `src/data/styles/compositions.yaml`：構圖資料
- `src/data/rules/comp_compatibility.yaml`：COMP 與四碼的相容規則
- `src/data/rules/tier_constraints.yaml`：Tier 約束語句
- `src/data/rules/forbidden_combinations.yaml`：四碼禁忌組合

## Prompt 範式

遵循 zImageTurbo 的 prompt 原則：

- Camera-first：構圖資訊放在 prompt 最前面
- 不使用 negative prompt
- 不使用權重語法，例如 `(word:1.3)`
- 把限制條件直接寫在正向 prompt 中
- 長度目標維持在 80-250 words

## 範圍外

第一期不處理：

- ComfyUI API 整合
- 自動生圖
- QC 與交付流程
- 檔案命名與批次輸出流程管理

## 開發指南

- 純函式放在 `src/lib/`，測試放在 `tests/lib/`
- UI 元件放在 `src/components/`，互動測試放在 `tests/components/`
- 全域狀態由 Zustand 管理，實作在 `src/store/`
- 測試採用 Given / When / Then 的 BDD 結構
- 開發節奏以 task-based commits 為主
