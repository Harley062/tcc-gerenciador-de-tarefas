import React, { useState, useEffect, useRef } from 'react';
import { aiApi, ChatMessage, ChatActionRequest } from '../services/aiApi';

interface ActionButton {
  label: string;
  action: string;
  data: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: string | null;
  data?: any;
  requires_confirmation?: boolean;
  action_buttons?: ActionButton[];
}

const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [
    "📋 Listar minhas tarefas",
    "➕ Criar tarefa",
    "✅ Concluir tarefa",
    "⏰ Tarefas de hoje",
    "🚨 Tarefas atrasadas",
    "📊 Meu progresso"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    if (isOpen && !loading) {
      inputRef.current?.focus();
    }
  }, [messages, isOpen, loading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: '👋 Olá! Sou seu Agente de Tarefas com IA.\n\n🎯 O que posso fazer por você:\n\n• Criar tarefas - Ex: Criar reunião amanhã às 14h\n• Listar tarefas - Ex: Minhas tarefas de hoje\n• Concluir tarefas - Ex: Concluir tarefa de relatório\n• Deletar tarefas - Ex: Remover tarefa X\n• Ver progresso - Ex: Como está meu dia?\n\n💡 Dica: Use as sugestões rápidas abaixo!',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [isOpen]);

  const sendMessage = async (text: string = input) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiApi.sendChatMessage(text);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        action: response.action,
        data: response.data,
        requires_confirmation: response.requires_confirmation,
        action_buttons: response.action_buttons,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error details:', error);

      let errorText = 'Desculpe, ocorreu um erro ao processar sua mensagem.';

      if (error?.response?.data?.detail) {
        errorText = error.response.data.detail;
      } else if (error?.response?.status === 401) {
        errorText = 'Sessão expirada. Por favor, faça login novamente.';
      } else if (error?.response?.status === 400) {
        errorText = error?.response?.data?.detail || 'Requisição inválida. Verifique suas configurações.';
      } else if (error?.message) {
        errorText = `Erro: ${error.message}`;
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: errorText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (actionButton: ActionButton) => {
    if (actionButton.action === 'cancel') {
      setMessages((prev: Message[]) => [...prev, {
        role: 'assistant',
        content: '❌ Ação cancelada.',
        timestamp: new Date().toISOString(),
      }]);
      return;
    }

    setLoading(true);
    try {
      const request: ChatActionRequest = {
        action: actionButton.action,
        task_id: actionButton.data?.task_id,
        task_data: actionButton.data,
      };

      const response = await aiApi.executeChatAction(request);

      setMessages((prev: Message[]) => [...prev, {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      }]);

      window.dispatchEvent(new CustomEvent('tasksUpdated'));
    } catch (error: any) {
      console.error('Action error:', error);
      setMessages((prev: Message[]) => [...prev, {
        role: 'assistant',
        content: `❌ Erro ao executar ação: ${error?.response?.data?.detail || error.message}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    try {
      await aiApi.clearChatHistory();
      setMessages([
        {
          role: 'assistant',
          content: '🔄 Conversa reiniciada! Como posso ajudar agora?',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-full p-4 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-1 transition-all z-50 animate-fade-in"
        title="Abrir Assistente de IA"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col z-50 border border-white/20 dark:border-gray-700/50 animate-slide-up overflow-hidden">
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white p-4 flex justify-between items-center shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h3 className="font-bold text-lg">Agente de IA</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <p className="text-xs text-white/90">Pronto para executar</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={clearChat}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white/90 hover:text-white"
            title="Limpar chat"
          >
            🗑️
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white/90 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/50 dark:bg-gray-900/50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-tr-none'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              
              {message.action_buttons && message.action_buttons.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
                  {message.action_buttons.map((btn, btnIndex) => (
                    <button
                      key={btnIndex}
                      onClick={() => executeAction(btn)}
                      disabled={loading}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        btn.action === 'cancel'
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          : 'bg-primary-500 text-white hover:bg-primary-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
              
              {message.data && message.action === 'list' && (
                <div className="mt-3 pt-3 border-t border-white/20 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-xs opacity-90">
                    <span className="bg-white/20 px-2 py-1 rounded">
                      {message.data.length} tarefas
                    </span>
                  </div>
                </div>
              )}
              
              <p className={`text-[10px] mt-2 text-right ${
                message.role === 'user' ? 'text-white/70' : 'text-gray-400'
              }`}>
                {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex space-x-2 items-center h-5">
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length < 2 && !loading && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto custom-scrollbar">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => sendMessage(suggestion)}
              className="whitespace-nowrap px-3 py-1.5 bg-white dark:bg-gray-800 border border-primary-100 dark:border-gray-700 rounded-full text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl">
        <div className="flex gap-2 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ex: Criar tarefa para amanhã..."
            className="flex-1 bg-gray-100 dark:bg-gray-900 border-0 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[50px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span className="text-xl">📤</span>
            )}
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-2">
          Enter para enviar • Diga "ajuda" para comandos
        </p>
      </div>
    </div>
  );
};

export default ChatAssistant;
