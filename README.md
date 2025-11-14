# TaskMaster - Sistema de Gerenciamento de Tarefas Inteligente (SGTI)

Sistema completo de gerenciamento de tarefas com IA integrada, suportando múltiplos provedores de LLM (GPT-4, Llama, Regex) e criação automática de tarefas recorrentes.

## 🚀 Funcionalidades

### IA e Parsing Inteligente
- **Multi-LLM Support**: Escolha entre GPT-4, Llama (via Ollama), ou Regex parser
- **Tarefas Recorrentes**: Detecção automática de padrões como "toda semana", "diariamente", "mensalmente"
- **Parsing em Português**: Suporte completo para linguagem natural em português
- **Sugestão Automática**: Tags, prioridades e estimativas de duração

### Gerenciamento de Tarefas
- **Múltiplas Visualizações**: Lista, Kanban (drag-and-drop), Calendário
- **Projetos**: Organize tarefas em projetos
- **Subtarefas**: Hierarquia de tarefas
- **WebSocket**: Atualizações em tempo real
- **Filtros e Busca**: Paginação server-side, ordenação, busca full-text

### Configurações de Usuário
- **API Keys**: Configure sua chave GPT-4 pela aplicação
- **Provedor de IA**: Escolha qual LLM usar
- **Preferências**: Duração padrão, funcionalidades de IA

## 🛠️ Stack Tecnológica

**Backend:**
- Python 3.11+ com FastAPI
- PostgreSQL 15 (banco de dados)
- Redis 7 (cache)
- SQLAlchemy (ORM async)
- Ollama (Llama local)

**Frontend:**
- React 18 com TypeScript
- Zustand (state management)
- Axios (HTTP client)
- React Beautiful DND (drag-and-drop)
- TailwindCSS (styling)

**IA:**
- OpenAI GPT-4 (opcional)
- Ollama/Llama2 (incluído)
- Regex Parser (fallback)

## 📦 Instalação e Uso

### Pré-requisitos
- Docker e Docker Compose
- Git

### Instalação Rápida

```bash
# Clone o repositório
git clone https://github.com/Harley062/tcc-gerenciador-de-tarefas.git
cd tcc-gerenciador-de-tarefas

# Inicie todos os serviços (inclui Ollama/Llama automático)
docker compose up -d --build

# Aguarde ~3-5 minutos para:
# - PostgreSQL inicializar (✅ automático)
# - Redis inicializar (✅ automático)
# - Ollama inicializar (✅ automático)
# - Llama2 model baixar (~4GB) (✅ automático)
# - Backend inicializar (✅ automático)
# - Frontend compilar (✅ automático)

# Acompanhe o progresso do download do Llama2:
docker compose logs ollama-init -f
```

### Acesso

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Ollama**: http://localhost:11434

### Primeiro Uso

1. Acesse http://localhost:3000
2. Clique em "Registrar" e crie uma conta
3. Faça login
4. Clique em "⚙️ Configurações" para configurar a IA
5. Escolha seu provedor:
   - **Regex**: Já funciona (padrão)
   - **Llama**: Já funciona (incluído no Docker)
   - **GPT-4**: Insira sua API key da OpenAI

### Testando Tarefas Recorrentes

```
# Exemplos de entrada em linguagem natural:

"planning toda semana"
→ Cria 8 tarefas semanais (próximas segundas-feiras às 9h)

"backup diário às 22h"
→ Cria 8 tarefas diárias (22h)

"reunião mensal dia 10"
→ Cria 8 tarefas mensais (dia 10 de cada mês)

"reunião com cliente amanhã às 14h"
→ Cria 1 tarefa para amanhã às 14h
```

## 🏗️ Arquitetura

### Clean Architecture (Backend)

```
backend/
├── domain/              # Entidades e regras de negócio
│   ├── entities/
│   ├── value_objects/
│   └── repositories/
├── application/         # Casos de uso e serviços
│   ├── use_cases/
│   └── services/
├── infrastructure/      # Implementações técnicas
│   ├── database/
│   ├── gpt/
│   ├── llm/
│   └── cache/
└── presentation/        # API e WebSocket
    ├── api/
    └── websocket/
```

### Componentes Principais

**Multi-LLM System:**
- `EnhancedGPTService`: Orquestra múltiplos provedores
- `OpenAIAdapter`: Integração GPT-4
- `LlamaAdapter`: Integração Ollama/Llama
- `RegexParser`: Fallback pattern matching

**Recurring Tasks:**
- Detecção automática de padrões de recorrência
- Expansão em múltiplas tarefas (default: 8 ocorrências)
- Agrupamento por `series_id` no metadata
- Suporte a frequências: daily, weekly, monthly

## 🔧 Configuração Avançada

### Variáveis de Ambiente

Crie um arquivo `.env` no diretório `backend/`:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://taskmaster:taskmaster123@postgres/taskmaster

# Redis
REDIS_URL=redis://redis:6379

# OpenAI (opcional)
OPENAI_API_KEY=sk-...

# Ollama
OLLAMA_ENDPOINT=http://ollama:11434

# JWT
JWT_SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=http://localhost:3000

# Logging
LOG_LEVEL=INFO
```

### Configurar Ollama

O Ollama é **instalado automaticamente** no Docker Compose com o modelo Llama2. 

**Verificar instalação:**
```bash
# Ver status do Ollama
docker compose ps ollama

# Ver logs da inicialização (download do modelo)
docker compose logs ollama-init

# Verificar modelos instalados
docker compose exec ollama ollama list

# Testar Ollama
curl http://localhost:11434/api/tags
```

**Instalar modelos adicionais:**
```bash
# Entrar no container Ollama
docker compose exec ollama bash

# Baixar outro modelo (ex: llama3, mistral, codellama)
ollama pull llama3

# Sair
exit
```

**Nota:** O primeiro `docker compose up` pode demorar 3-5 minutos enquanto o modelo Llama2 (~4GB) é baixado automaticamente. Acompanhe o progresso com `docker compose logs ollama-init -f`.

## 📊 Banco de Dados

### Tabelas Principais

- `users`: Usuários do sistema
- `user_settings`: Configurações e preferências de IA
- `projects`: Projetos para organização
- `tasks`: Tarefas com metadata de recorrência
- `gpt_cache`: Cache de respostas de IA

### Migrações

As tabelas são criadas automaticamente na inicialização. Para aplicar migrações manualmente:

```bash
docker compose exec postgres psql -U taskmaster -d taskmaster -f /path/to/migration.sql
```

## 🧪 Testes

```bash
# Backend
cd backend
poetry install
poetry run pytest

# Frontend
cd frontend
npm install
npm test
```

## 📝 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Dados do usuário

### Tarefas
- `GET /api/tasks` - Listar tarefas (com paginação, filtros, busca)
- `POST /api/tasks` - Criar tarefa (linguagem natural ou estruturada)
- `GET /api/tasks/{id}` - Detalhes da tarefa
- `PUT /api/tasks/{id}` - Atualizar tarefa
- `DELETE /api/tasks/{id}` - Deletar tarefa
- `POST /api/tasks/{id}/subtasks` - Criar subtarefa

### Projetos
- `GET /api/projects` - Listar projetos
- `POST /api/projects` - Criar projeto
- `PUT /api/projects/{id}` - Atualizar projeto
- `DELETE /api/projects/{id}` - Deletar projeto

### Configurações
- `GET /api/settings` - Obter configurações do usuário
- `PUT /api/settings` - Atualizar configurações

### WebSocket
- `WS /ws?token={jwt_token}` - Conexão WebSocket para atualizações em tempo real

## 🐛 Troubleshooting

### Backend não inicia
```bash
# Ver logs
docker compose logs backend

# Reconstruir
docker compose down
docker compose up -d --build backend
```

### Ollama não responde
```bash
# Verificar status
docker compose ps ollama

# Ver logs
docker compose logs ollama

# Reiniciar
docker compose restart ollama

# Verificar se o modelo foi baixado
docker compose exec ollama ollama list
```

### Frontend não compila
```bash
# Limpar e reconstruir
docker compose down
docker compose up -d --build frontend
```

### Erro de conexão com banco
```bash
# Verificar se PostgreSQL está rodando
docker compose ps postgres

# Recriar banco
docker compose down -v
docker compose up -d
```

## 📚 Documentação Adicional

- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **ReDoc**: http://localhost:8000/redoc
- **Ollama Docs**: https://ollama.ai/docs

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto foi desenvolvido como TCC (Trabalho de Conclusão de Curso).

## 👤 Autor

**Harley Gonçalves**
- Email: harleygteixeira@gmail.com
- GitHub: [@Harley062](https://github.com/Harley062)

## 🙏 Agradecimentos

- OpenAI pela API GPT-4
- Ollama pelo runtime de LLM local
- FastAPI e React pelas excelentes frameworks
