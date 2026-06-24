import { useState } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  allTags: string[];
  onDeleteTag: (tag: string) => void;
  onAddTag: (tag: string) => void;
}

export default function TagManager({ isOpen, onClose, allTags, onDeleteTag, onAddTag }: TagManagerProps) {
  const [newTag, setNewTag] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTag.trim();
    if (tag && !allTags.includes(tag)) {
      onAddTag(tag);
      setNewTag('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal 容器 */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl flex flex-col gap-4 animate-slide-up z-10">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <TagIcon className="w-4 h-4 text-brand-500" />
            全域標籤管理
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 標籤輸入表單 */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="新增標籤名稱..."
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
          />
          <button
            type="submit"
            className="bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增
          </button>
        </form>

        {/* 標籤清單 */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            現有標籤 ({allTags.length})
          </label>
          {allTags.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">目前沒有建立任何標籤</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
              {allTags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => onDeleteTag(tag)}
                    className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                    title={`刪除標籤 ${tag}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
