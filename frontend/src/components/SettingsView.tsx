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
    openai_api_key: '',
    default_task_duration: 60,
    enable_auto_subtasks: false,
    enable_auto_priority: true,
    enable_auto_tags: true,
  });
  
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsApi.getSettings();
      setHasApiKey(data.has_openai_api_key);
      setFormData({
        openai_api_key: '',
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

  const testProvider = async () => {
    setTestingProvider('gpt4');
    try {
      showInfo('Testando OpenAI GPT-4...');
      await aiApi.analyzeSentiment('teste');
      showSuccess('OpenAI GPT-4 está funcionando corretamente!');
    } catch (error: any) {
      console.error('Failed to test GPT-4:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Erro desconhecido';
      showError(`Falha ao testar OpenAI GPT-4: ${errorMessage}`);
    } finally {
      setTestingProvider(null);
    }
  };

  

  if (loading) {
    return <div className="p-4 text-gray-600 dark:text-gray-400">Carregando configurações...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Configurações</h1>

      {message && (
        <div
          className={`mb-4 p-4 rounded ${
            message.type === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* OpenAI Configuration */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Configuração OpenAI GPT-4</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              OpenAI API Key
            </label>
            {hasApiKey && !formData.openai_api_key && (
              <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-300">
                ✓ Chave configurada
              </div>
            )}
            <input
              type="password"
              value={formData.openai_api_key}
              onChange={(e) => setFormData({ ...formData, openai_api_key: e.target.value })}
              placeholder={hasApiKey ? "Digite uma nova chave para atualizar" : "sk-..."}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Obtenha sua chave em{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                platform.openai.com
              </a>
            </p>
          </div>

          <button
            type="button"
            onClick={testProvider}
            disabled={testingProvider === 'gpt4' || (!hasApiKey && !formData.openai_api_key)}
            className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testingProvider === 'gpt4' ? 'Testando...' : '🧪 Testar GPT-4'}
          </button>
        </div>

        {/* AI Features */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Funcionalidades de IA</h2>

          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enable_auto_subtasks}
                onChange={(e) => setFormData({ ...formData, enable_auto_subtasks: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">Sugerir subtarefas automaticamente</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enable_auto_priority}
                onChange={(e) => setFormData({ ...formData, enable_auto_priority: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">Detectar prioridade automaticamente</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enable_auto_tags}
                onChange={(e) => setFormData({ ...formData, enable_auto_tags: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">Sugerir tags automaticamente</span>
            </label>
          </div>
        </div>

        {/* Task Defaults */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Padrões de Tarefas</h2>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Duração padrão (minutos)
            </label>
            <input
              type="number"
              value={formData.default_task_duration}
              onChange={(e) => setFormData({ ...formData, default_task_duration: parseInt(e.target.value) })}
              min="15"
              max="480"
              step="15"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 dark:bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </form>

      {/* Info Box */}
      {/* <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">💡 Dica: Tarefas Recorrentes</h3>
        <p className="text-sm text-gray-700">
          O sistema agora detecta tarefas recorrentes automaticamente! Experimente:
        </p>
        <ul className="text-sm text-gray-700 mt-2 space-y-1">
          <li>• "planning toda semana" - Cria 8 tarefas semanais</li>
          <li>• "backup diário" - Cria 8 tarefas diárias</li>
          <li>• "reunião mensal" - Cria 8 tarefas mensais</li>
        </ul>
      </div> */}
    </div>
  );
};

export default SettingsView;
