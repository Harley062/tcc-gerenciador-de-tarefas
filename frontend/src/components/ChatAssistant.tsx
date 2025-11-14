import React, { useState, useEffect, useRef } from 'react';
import { aiApi, ChatMessage } from '../services/aiApi';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: string | null;
  data?: any;
}

const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: '👋 Olá! Sou seu assistente de tarefas com IA. Como posso ajudar?\n\nVocê pode:\n• Listar suas tarefas\n• Criar novas tarefas\n• Verificar status\n• Pedir ajuda\n\nDigite "ajuda" para ver todos os comandos.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiApi.sendChatMessage(input);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        action: response.action,
        data: response.data,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error(error);
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
          content: '💬 Histórico limpo! Como posso ajudar?',
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
        className="fixed bottom-6 right-6 bg-blue-500 text-white rounded-full p-4 shadow-lg hover:bg-blue-600 transition-all z-50"
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
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-xl mr-2">🤖</span>
          <div>
            <h3 className="font-bold">Assistente de IA</h3>
            <p className="text-xs text-blue-100">Sempre pronto para ajudar</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearChat}
            className="text-white hover:text-blue-100"
            title="Limpar chat"
          >
            🗑️
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-blue-100"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 shadow'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.data && message.action === 'list' && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">
                    {message.data.length} tarefa(s) encontrada(s)
                  </p>
                </div>
              )}
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg p-3 shadow">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? '...' : '📤'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Pressione Enter para enviar • Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
};

export default ChatAssistant;
