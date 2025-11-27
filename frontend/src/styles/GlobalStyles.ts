import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  /* Import Google Fonts - Inter */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #f8fafc;
    color: #1e293b;
    line-height: 1.6;
    min-height: 100vh;
  }

  code {
    font-family: 'Fira Code', source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideInUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideInRight {
    from {
      transform: translateX(-20px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-in-out;
  }

  .animate-slide-up {
    animation: slideInUp 0.4s ease-out;
  }

  .animate-slide-right {
    animation: slideInRight 0.4s ease-out;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  ::selection {
    background-color: #bfdbfe;
    color: #1e40af;
  }

  a, button, input, select, textarea {
    transition: all 0.2s ease-in-out;
  }

  a {
    color: #3b82f6;
    text-decoration: none;
  }

  a:hover {
    color: #2563eb;
    text-decoration: underline;
  }

  .container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .card {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    padding: 1.5rem;
    transition: all 0.2s ease-in-out;
  }

  .card:hover {
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    transform: translateY(-2px);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 9999px;
  }

  .badge-primary {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .badge-success {
    background-color: #dcfce7;
    color: #166534;
  }

  .badge-warning {
    background-color: #fef3c7;
    color: #92400e;
  }

  .badge-error {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .badge-gray {
    background-color: #f3f4f6;
    color: #374151;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 0.5rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    gap: 0.5rem;
  }

  .btn-primary {
    background-color: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background-color: #2563eb;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  .btn-secondary {
    background-color: #f3f4f6;
    color: #374151;
  }

  .btn-secondary:hover {
    background-color: #e5e7eb;
  }

  .btn-success {
    background-color: #22c55e;
    color: white;
  }

  .btn-success:hover {
    background-color: #16a34a;
  }

  .btn-danger {
    background-color: #ef4444;
    color: white;
  }

  .btn-danger:hover {
    background-color: #dc2626;
  }

  .input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background-color: white;
    transition: all 0.2s ease-in-out;
  }

  .input:hover {
    border-color: #d1d5db;
  }

  .input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .spinner {
    border: 2px solid #f3f4f6;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .grid {
    display: grid;
    gap: 1.5rem;
  }

  .grid-cols-1 {
    grid-template-columns: repeat(1, 1fr);
  }

  .grid-cols-2 {
    grid-template-columns: repeat(2, 1fr);
  }

  .grid-cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    .grid-cols-2,
    .grid-cols-3 {
      grid-template-columns: repeat(1, 1fr);
    }
  }

  @media (max-width: 640px) {
    .card {
      padding: 1rem;
    }

    .container {
      padding: 0 0.75rem;
    }
  }
`;
