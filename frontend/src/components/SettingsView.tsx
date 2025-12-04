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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 dark:from-primary-400 dark:to-primary-200">
          Configurações
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Gerencie suas preferências e integrações de IA
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl backdrop-blur-sm border ${
            message.type === 'success' 
              ? 'bg-green-100/80 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' 
              : 'bg-red-100/80 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
            {message.text}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Integração OpenAI</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure sua chave de API para recursos de IA</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                API Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.openai_api_key}
                  onChange={(e) => setFormData({ ...formData, openai_api_key: e.target.value })}
                  placeholder={hasApiKey ? "••••••••••••••••" : "sk-..."}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                />
                {hasApiKey && !formData.openai_api_key && (
                  <div className="absolute right-3 top-3 text-green-500 flex items-center gap-1 text-sm font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Ativa
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Sua chave é armazenada de forma segura. Obtenha em{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 hover:underline"
                >
                  platform.openai.com
                </a>
              </p>
            </div>

            <button
              type="button"
              onClick={testProvider}
              disabled={testingProvider === 'gpt4' || (!hasApiKey && !formData.openai_api_key)}
              className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {testingProvider === 'gpt4' ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Testando Conexão...
                </>
              ) : (
                <>⚡ Testar Conexão</>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <span className="text-2xl">✨</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Automação</h2>
            </div>

            <div className="space-y-4">
              {[
                { key: 'enable_auto_subtasks', label: 'Sugerir subtarefas', desc: 'Quebra tarefas complexas automaticamente' },
                { key: 'enable_auto_priority', label: 'Detectar prioridade', desc: 'Define urgência baseada no contexto' },
                { key: 'enable_auto_tags', label: 'Sugerir tags', desc: 'Categoriza tarefas automaticamente' },
              ].map((item) => (
                <label key={item.key} className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group">
                  <div className="relative flex items-center mt-1">
                    <input
                      type="checkbox"
                      checked={formData[item.key as keyof UpdateSettingsRequest] as boolean}
                      onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </div>
                  <div>
                    <span className="block font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 transition-colors">
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <span className="text-2xl">⏱️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Padrões</h2>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Duração Padrão (minutos)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.default_task_duration}
                  onChange={(e) => setFormData({ ...formData, default_task_duration: parseInt(e.target.value) })}
                  min="15"
                  max="480"
                  step="15"
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                />
                <div className="absolute right-4 top-3 text-gray-400 pointer-events-none">
                  min
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tempo sugerido para novas tarefas sem duração definida
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Salvando Alterações...
              </span>
            ) : (
              'Salvar Configurações'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsView;
