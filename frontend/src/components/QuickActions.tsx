import React, { useState, useEffect, useRef } from 'react';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  category: string;
}

interface QuickActionsProps {
  onClose: () => void;
  actions: QuickAction[];
}

const QuickActions: React.FC<QuickActionsProps> = ({ onClose, actions }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredActions = actions.filter(action =>
    action.label.toLowerCase().includes(search.toLowerCase()) ||
    action.category.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupar ações por categoria
  const groupedActions = filteredActions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredActions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredActions[selectedIndex]) {
      e.preventDefault();
      filteredActions[selectedIndex].action();
      onClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleActionClick = (action: QuickAction) => {
    action.action();
    onClose();
  };

  let currentIndex = 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-slide-down border border-white/20 dark:border-gray-700/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700/50">
          <div className="relative">
            <svg className="w-6 h-6 text-primary-500 absolute left-4 top-3.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="O que você gostaria de fazer?"
              className="w-full pl-12 pr-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 border-2 border-transparent focus:border-primary-500/50 focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-0 rounded-xl text-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
            />
            <div className="absolute right-4 top-3.5 flex gap-2">
              <kbd className="hidden sm:inline-block px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-500 dark:text-gray-400 shadow-sm">
                ESC
              </kbd>
            </div>
          </div>
        </div>

        {/* Actions List */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {Object.keys(groupedActions).length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium">Nenhuma ação encontrada</p>
              <p className="text-sm mt-1">Tente buscar por outro termo</p>
            </div>
          ) : (
            Object.entries(groupedActions).map(([category, categoryActions]) => (
              <div key={category} className="py-2">
                <div className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  {category}
                </div>
                {categoryActions.map((action) => {
                  const actionIndex = currentIndex++;
                  const isSelected = actionIndex === selectedIndex;

                  return (
                    <button
                      key={action.id}
                      onClick={() => handleActionClick(action)}
                      onMouseEnter={() => setSelectedIndex(actionIndex)}
                      className={`w-full px-4 py-3 flex items-center justify-between transition-all duration-200 group ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500 pl-3'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 border-l-4 border-transparent pl-4'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`text-2xl transition-transform duration-200 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                          {action.icon}
                        </span>
                        <div className="text-left">
                          <span className={`font-medium block ${
                            isSelected
                              ? 'text-primary-700 dark:text-primary-300'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {action.label}
                          </span>
                          {isSelected && (
                            <span className="text-xs text-primary-600/70 dark:text-primary-400/70 animate-fade-in">
                              Pressione Enter para selecionar
                            </span>
                          )}
                        </div>
                      </div>
                      {action.shortcut && (
                        <kbd className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                          isSelected
                            ? 'bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                        }`}>
                          {action.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm font-mono">↑↓</kbd>
              <span>Navegar</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm font-mono">↵</kbd>
              <span>Selecionar</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm font-mono">Esc</kbd>
              <span>Fechar</span>
            </span>
          </div>
          <span className="font-medium">{filteredActions.length} {filteredActions.length === 1 ? 'ação encontrada' : 'ações encontradas'}</span>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
