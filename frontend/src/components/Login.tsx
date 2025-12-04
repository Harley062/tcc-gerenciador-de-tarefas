import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

interface LoginProps {
  onSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, error, isLoading, clearError } = useAuthStore();

  useEffect(() => {
    clearError();
    setValidationError(null);
  }, [isLogin, clearError]);

  useEffect(() => {
    if (validationError) {
      setValidationError(null);
    }
  }, [email, password, fullName]);

  const validateForm = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Por favor, insira um email válido.');
      return false;
    }

    if (password.length < 6) {
      setValidationError('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }

    if (!isLogin) {
      if (!fullName || fullName.trim().length < 3) {
        setValidationError('O nome deve ter pelo menos 3 caracteres.');
        return false;
      }

      if (password.length < 8) {
        setValidationError('Para registro, a senha deve ter pelo menos 8 caracteres.');
        return false;
      }

      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);

      if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        setValidationError('A senha deve conter letras maiúsculas, minúsculas e números.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    clearError();
    setValidationError(null);

    if (!validateForm()) {
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
      onSuccess();
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  };

  const handleTabChange = (loginTab: boolean) => {
    setIsLogin(loginTab);
    setValidationError(null);
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/50 via-gray-900 to-black pointer-events-none"></div>
      
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/10 relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            SGTI
          </h1>
          <p className="text-gray-400">
            Sistema Gerenciador de Tarefas Inteligente
          </p>
        </div>

        <div className="flex mb-8 bg-black/20 rounded-xl p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => handleTabChange(true)}
            className={`flex-1 py-2.5 rounded-lg transition-all font-medium text-sm ${
              isLogin
                ? 'bg-white/10 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => handleTabChange(false)}
            className={`flex-1 py-2.5 rounded-lg transition-all font-medium text-sm ${
              !isLogin
                ? 'bg-white/10 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Registrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Nome Completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-gray-500 transition-all"
                placeholder="Seu nome"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-gray-500 transition-all"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-gray-500 transition-all"
                placeholder="••••••••"
                required
                minLength={isLogin ? 6 : 8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {!isLogin && password.length > 0 && password.length < 8 && (
              <p className="text-xs text-yellow-400 mt-1.5 flex items-center gap-1">
                <span>⚠️</span>
                <span>Senha muito curta. Use pelo menos 8 caracteres.</span>
              </p>
            )}
          </div>

          {(error || validationError) && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex items-start gap-2 animate-fade-in">
              <span className="text-lg mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="font-medium mb-1">Erro na autenticação</p>
                <p className="text-xs">{validationError || error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl shadow-lg shadow-primary-500/30 transform hover:-translate-y-0.5 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processando...
              </span>
            ) : (
              isLogin ? 'Entrar na Plataforma' : 'Criar Conta Gratuita'
            )}
          </button>
        </form>
        
        <p className="text-center text-gray-500 text-xs mt-6">
          © 2024 SGTI. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;
