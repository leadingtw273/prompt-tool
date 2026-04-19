import { CharacterPicker } from '@/components/CharacterPicker';

interface Props {
  onOpenDataManager: () => void;
  onOpenSettings: () => void;
}

export function AppHeader({ onOpenDataManager, onOpenSettings }: Props) {
  return (
    <header className="relative rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/30">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        Prompt Tool
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-100">AI 虛擬網紅提示詞產生器</h1>
      <div className="mt-3"><CharacterPicker /></div>
      <button
        type="button"
        aria-label="資料管理"
        onClick={onOpenDataManager}
        className="absolute right-16 top-6 rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14a9 3 0 0 0 18 0V5" />
          <path d="M3 12a9 3 0 0 0 18 0" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="設定"
        onClick={onOpenSettings}
        className="absolute right-6 top-6 rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </header>
  );
}
