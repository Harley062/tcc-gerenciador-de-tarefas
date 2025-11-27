import React from 'react';

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ onClose }) => {
  const shortcuts = [
    { category: 'Geral', items: [
      { keys: ['Ctrl', 'N'], description: 'Criar nova tarefa' },
      { keys: ['Ctrl', 'F'], description: 'Focar na busca' },
      { keys: ['/'], description: 'Focar na busca (alternativa)' },
      { keys: ['Ctrl', 'R'], description: 'Recarregar tarefas' },
      { keys: ['?'], description: 'Mostrar esta ajuda' },
      { keys: ['Esc'], description: 'Fechar modais/Cancelar' },
    ]},
    { category: 'Navegação', items: [
      { keys: ['↑', '↓'], description: 'Navegar entre tarefas' },
      { keys: ['Enter'], description: 'Abrir tarefa selecionada' },
      { keys: ['Tab'], description: 'Próximo campo' },
      { keys: ['Shift', 'Tab'], description: 'Campo anterior' },
    ]},
    { category: 'Produtividade', items: [
      { keys: ['Ctrl', 'M'], description: 'Ativar Modo Foco' },
      { keys: ['Ctrl', 'T'], description: 'Abrir Templates' },
      { keys: ['Ctrl', 'Shift', 'A'], description: 'Selecionar todas' },
      { keys: ['Space'], description: 'Selecionar tarefa' },
    ]},
    { category: 'Modo Foco', items: [
      { keys: ['Space'], description: 'Pausar/Iniciar Pomodoro' },
      { keys: ['Enter'], description: 'Concluir tarefa atual' },
      { keys: ['→'], description: 'Próxima tarefa' },
      { keys: ['←'], description: 'Tarefa anterior' },
      { keys: ['Esc'], description: 'Sair do Modo Foco' },
    ]},
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in border border-white/20 dark:border-gray-700/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-700/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-2xl">⌨️</span>
              Atalhos de Teclado
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-14">
              Domine os atalhos e aumente sua produtividade
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            aria-label="Fechar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {shortcuts.map((category) => (
              <div key={category.category} className="space-y-4">
                <h3 className="text-sm font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.items.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all group shadow-sm hover:shadow-md"
                    >
                      <span className="text-gray-600 dark:text-gray-300 text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="px-2.5 py-1 bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold font-mono text-gray-700 dark:text-gray-200 shadow-sm min-w-[2rem] text-center group-hover:border-primary-200 dark:group-hover:border-primary-700 transition-colors">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-gray-300 dark:text-gray-600 text-xs font-bold">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-5 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span>Dica: Pressione <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs font-bold font-mono mx-1">?</kbd> a qualquer momento</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-bold shadow-lg shadow-gray-900/20 dark:shadow-white/20"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
