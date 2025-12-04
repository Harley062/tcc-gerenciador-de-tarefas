import React, { useState } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

interface OnboardingStep {
  title: string;
  description: string;
  image?: string;
  icon: string;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      title: 'Bem-vindo(a) ao SGTI!',
      description: 'Organize suas tarefas de forma inteligente com IA integrada. Vamos começar um tour rápido pelas principais funcionalidades.',
      icon: '👋',
    },
    {
      title: 'Crie Tarefas com IA',
      description: 'Digite suas tarefas em linguagem natural e nossa IA irá estruturá-las automaticamente com título, descrição, prioridade e muito mais!',
      icon: '🤖',
    },
    {
      title: 'Filtros Inteligentes',
      description: 'Use os filtros avançados para encontrar rapidamente tarefas por status, prioridade, data de vencimento ou tags. Seus filtros são salvos automaticamente!',
      icon: '🔍',
    },
    {
      title: 'Modo Foco',
      description: 'Ative o Modo Foco (Ctrl+M) para trabalhar em uma tarefa por vez com timer Pomodoro integrado. Perfeito para maximizar sua produtividade!',
      icon: '🎯',
    },
    {
      title: 'Atalhos de Teclado',
      description: 'Seja mais produtivo! Use Ctrl+N para criar, Ctrl+F para buscar, Ctrl+M para Modo Foco e muito mais. Pressione ? para ver todos os atalhos.',
      icon: '⌨️',
    },
    {
      title: 'Insights de IA',
      description: 'Clique no botão IA em qualquer tarefa para receber sugestões de subtarefas, estimativas de tempo e dicas personalizadas.',
      icon: '💡',
    },
    {
      title: 'Tudo Pronto!',
      description: 'Você está pronto para começar! Crie sua primeira tarefa e experimente todas as funcionalidades. Boa produtividade!',
      icon: '🚀',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-white/20 dark:border-gray-700/50 animate-slide-up">
        <div className="h-1.5 bg-gray-200/50 dark:bg-gray-700/50">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-primary-100 to-white dark:from-primary-900/30 dark:to-gray-800 rounded-3xl shadow-lg shadow-primary-500/10 text-7xl mb-4 animate-bounce-soft border border-white/50 dark:border-white/10">
              {step.icon}
            </div>
          </div>

          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            {step.title}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 text-center leading-relaxed max-w-lg mx-auto">
            {step.description}
          </p>

          <div className="flex justify-center gap-3 mb-10">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-primary-500'
                    : index < currentStep
                    ? 'w-2 bg-primary-300 dark:bg-primary-700'
                    : 'w-2 bg-gray-300 dark:bg-gray-600'
                }`}
                aria-label={`Ir para passo ${index + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleSkip}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              Pular Tutorial
            </button>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Anterior
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl hover:from-primary-500 hover:to-primary-400 transition-all font-bold shadow-lg shadow-primary-500/30 transform hover:-translate-y-0.5"
              >
                {currentStep === steps.length - 1 ? 'Começar!' : 'Próximo'}
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-4 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-200/50 dark:border-gray-700/50 text-center text-sm text-gray-500 dark:text-gray-400 backdrop-blur-sm">
          <div className="flex justify-center gap-6">
            <span className="flex items-center gap-2"><kbd className="bg-white/50 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-xs">←</kbd> <kbd className="bg-white/50 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-xs">→</kbd> Navegar</span>
            <span className="flex items-center gap-2"><kbd className="bg-white/50 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-xs">Esc</kbd> Pular</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
