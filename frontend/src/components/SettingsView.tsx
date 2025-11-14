import React, { useEffect, useState } from 'react';
import { settingsApi, UpdateSettingsRequest } from '../services/settingsApi';
import { aiApi } from '../services/aiApi';
import { useToast } from './ToastContainer';

const SettingsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const { showSuccess, showError, showInfo } = useToast();

  const [formData, setFormData] = useState<UpdateSettingsRequest>({
    llm_provider: 'regex',
    openai_api_key: '',
    llama_endpoint: 'http://localhost:11434',
    default_task_duration: 60,
    enable_auto_subtasks: false,
    enable_auto_priority: true,
    enable_auto_tags: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsApi.getSettings();
      setFormData({
        llm_provider: data.llm_provider,
        openai_api_key: data.openai_api_key || '',
        llama_endpoint: data.llama_endpoint,
        default_task_duration: data.default_task_duration,
        enable_auto_subtasks: data.enable_auto_subtasks,
        enable_auto_priority: data.enable_auto_priority,
        enable_auto_tags: data.enable_auto_tags,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ type: 'error', text: 'Falha ao carregar configurações' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await settingsApi.updateSettings(formData);
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      showSuccess('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Falha ao salvar configurações' });
      showError('Falha ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async (provider: 'gpt4' | 'llama') => {
    setTestingProvider(provider);
    try {
      showInfo(`Testando ${provider === 'gpt4' ? 'OpenAI' : 'Llama'}...`);
      await aiApi.analyzeSentiment('teste');
      showSuccess(`${provider === 'gpt4' ? 'OpenAI' : 'Llama'} está funcionando corretamente!`);
    } catch (error: any) {
      console.error(`Failed to test ${provider}:`, error);
      const errorMessage = error.response?.data?.detail || error.message || 'Erro desconhecido';
      showError(`Falha ao testar ${provider === 'gpt4' ? 'OpenAI' : 'Llama'}: ${errorMessage}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const fallbackToRegex = async () => {
    try {
      await settingsApi.updateSettings({ ...formData, llm_provider: 'regex' });
      setFormData({ ...formData, llm_provider: 'regex' });
      showSuccess('Alterado para Regex Parser com sucesso!');
    } catch (error) {
      console.error('Failed to fallback to regex:', error);
      showError('Falha ao alterar para Regex Parser');
    }
  };

  if (loading) {
    return <div className="p-4">Carregando configurações...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>

      {message && (
        <div
          className={`mb-4 p-4 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* LLM Provider */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Provedor de IA</h2>
          
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="llm_provider"
                value="regex"
                checked={formData.llm_provider === 'regex'}
                onChange={(e) => setFormData({ ...formData, llm_provider: e.target.value as any })}
                className="form-radio"
              />
              <span>
                <strong>Regex Parser</strong> - Parsing simples e rápido (sempre disponível)
              </span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="llm_provider"
                value="llama"
                checked={formData.llm_provider === 'llama'}
                onChange={(e) => setFormData({ ...formData, llm_provider: e.target.value as any })}
                className="form-radio"
              />
              <span>
                <strong>Llama (Ollama)</strong> - IA local gratuita
              </span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="llm_provider"
                value="gpt4"
                checked={formData.llm_provider === 'gpt4'}
                onChange={(e) => setFormData({ ...formData, llm_provider: e.target.value as any })}
                className="form-radio"
              />
              <span>
                <strong>GPT-4</strong> - IA mais avançada (requer API key da OpenAI)
              </span>
            </label>
          </div>

          {formData.llm_provider === 'gpt4' && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={formData.openai_api_key}
                onChange={(e) => setFormData({ ...formData, openai_api_key: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2 border rounded-lg"
              />
              <p className="text-sm text-gray-600 mt-1">
                Obtenha sua chave em{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  platform.openai.com
                </a>
              </p>
              <button
                type="button"
                onClick={() => testProvider('gpt4')}
                disabled={testingProvider === 'gpt4' || !formData.openai_api_key}
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingProvider === 'gpt4' ? 'Testando...' : '🧪 Testar OpenAI'}
              </button>
            </div>
          )}

          {formData.llm_provider === 'llama' && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Llama Endpoint
              </label>
              <input
                type="text"
                value={formData.llama_endpoint}
                onChange={(e) => setFormData({ ...formData, llama_endpoint: e.target.value })}
                placeholder="http://localhost:11434"
                className="w-full px-3 py-2 border rounded-lg"
              />
              <button
                type="button"
                onClick={() => testProvider('llama')}
                disabled={testingProvider === 'llama'}
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingProvider === 'llama' ? 'Testando...' : '🧪 Testar Llama'}
              </button>
              {testingProvider === null && (
                <button
                  type="button"
                  onClick={fallbackToRegex}
                  className="mt-2 ml-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  ⚠️ Usar Regex como Fallback
                </button>
              )}
            </div>
          )}
        </div>

        {/* AI Features */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Funcionalidades de IA</h2>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.enable_auto_subtasks}
                onChange={(e) => setFormData({ ...formData, enable_auto_subtasks: e.target.checked })}
                className="form-checkbox"
              />
              <span>Sugerir subtarefas automaticamente</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.enable_auto_priority}
                onChange={(e) => setFormData({ ...formData, enable_auto_priority: e.target.checked })}
                className="form-checkbox"
              />
              <span>Detectar prioridade automaticamente</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.enable_auto_tags}
                onChange={(e) => setFormData({ ...formData, enable_auto_tags: e.target.checked })}
                className="form-checkbox"
              />
              <span>Sugerir tags automaticamente</span>
            </label>
          </div>
        </div>

        {/* Task Defaults */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Padrões de Tarefas</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Duração padrão (minutos)
            </label>
            <input
              type="number"
              value={formData.default_task_duration}
              onChange={(e) => setFormData({ ...formData, default_task_duration: parseInt(e.target.value) })}
              min="15"
              max="480"
              step="15"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">💡 Dica: Tarefas Recorrentes</h3>
        <p className="text-sm text-gray-700">
          O sistema agora detecta tarefas recorrentes automaticamente! Experimente:
        </p>
        <ul className="text-sm text-gray-700 mt-2 space-y-1">
          <li>• "planning toda semana" - Cria 8 tarefas semanais</li>
          <li>• "backup diário" - Cria 8 tarefas diárias</li>
          <li>• "reunião mensal" - Cria 8 tarefas mensais</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsView;
