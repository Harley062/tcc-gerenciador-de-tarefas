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
      title: 'Bem-vindo ao TaskMaster!',
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
      description: 'Seja mais produtivo! Use Ctrl+N para criar, Ctrl+F para buscar, Ctrl+K para ações rápidas e muito mais. Pressione ? para ver todos os atalhos.',
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-in">
        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 md:p-12">
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-full text-6xl mb-4 animate-bounce-soft">
              {step.icon}
            </div>
          </div>

          {/* Title & Description */}
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {step.title}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 text-center leading-relaxed">
            {step.description}
          </p>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-primary-500'
                    : index < currentStep
                    ? 'bg-primary-300 dark:bg-primary-700'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-label={`Ir para passo ${index + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleSkip}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors font-medium"
            >
              Pular Tutorial
            </button>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Anterior
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                {currentStep === steps.length - 1 ? 'Começar!' : 'Próximo'}
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Hint */}
        <div className="px-8 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400">
          <span className="mr-4">← → para navegar</span>
          <span>Esc para pular</span>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
