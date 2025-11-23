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
      { keys: ['Ctrl', 'K'], description: 'Ações rápidas' },
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              ⌨️ Atalhos de Teclado
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Domine os atalhos e seja mais produtivo
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded"
            aria-label="Fechar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcuts.map((category) => (
              <div key={category.category} className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.items.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                    >
                      <span className="text-gray-700 dark:text-gray-300 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono text-gray-800 dark:text-gray-200 shadow-sm min-w-[2rem] text-center">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-gray-400 dark:text-gray-500 text-xs">+</span>
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

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <span>Pressione <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">?</kbd> a qualquer momento para abrir esta ajuda</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              Entendi!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
