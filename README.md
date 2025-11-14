# TaskMaster - Sistema de Gerenciamento de Tarefas Inteligente (SGTI)

Sistema completo de gerenciamento de tarefas com integração GPT-4 para criação de tarefas usando linguagem natural.

## 🚀 Funcionalidades

### Core Features
- ✅ **Criação de Tarefas via Linguagem Natural**: Use GPT-4 para interpretar comandos como "Reunião com cliente amanhã às 14h"
- ✅ **Autenticação JWT**: Sistema completo de registro, login e refresh tokens
- ✅ **CRUD Completo de Tarefas**: Criar, ler, atualizar e deletar tarefas
- ✅ **WebSocket em Tempo Real**: Atualizações instantâneas de tarefas
- ✅ **Cache Inteligente**: Redis para otimizar chamadas GPT e reduzir custos
- ✅ **Fallback Parser**: Sistema de backup quando GPT não está disponível
- ✅ **Rate Limiting**: Controle de requisições e tokens

### Visualizações Frontend
- 📋 **ListView**: Lista tradicional com filtros por status e busca
- 📊 **KanbanView**: Quadro drag-and-drop para gerenciamento visual
- 📅 **CalendarView**: Visualização de tarefas por data

## 🏗️ Arquitetura

O projeto segue **Clean Architecture** com separação clara de responsabilidades:

```
taskmaster/
├── backend/                    # Backend FastAPI
│   ├── domain/                # Entidades e regras de negócio
│   │   ├── entities/          # Task, User, Project
│   │   ├── value_objects/     # TaskStatus, Priority
│   │   └── repositories/      # Interfaces de repositórios
│   ├── application/           # Casos de uso e serviços
│   │   ├── use_cases/         # Lógica de aplicação
│   │   └── services/          # GPT, Auth, Notification
│   ├── infrastructure/        # Implementações técnicas
│   │   ├── database/          # PostgreSQL + SQLAlchemy
│   │   ├── gpt/              # OpenAI Adapter
│   │   └── cache/            # Redis Cache
│   └── presentation/          # API e WebSocket
│       ├── api/              # FastAPI routes
│       └── websocket/        # WebSocket handlers
├── frontend/                  # React + TypeScript
│   └── src/
│       ├── components/       # React components
│       ├── services/         # API e WebSocket clients
│       └── store/           # Zustand state management
└── docker/                   # Docker configuration
```

## 📋 Stack Tecnológica

### Backend
- **Python 3.11+** com FastAPI
- **PostgreSQL 15+** para persistência
- **Redis 7** para cache
- **OpenAI GPT-4** para parsing de linguagem natural
- **SQLAlchemy** (async) para ORM
- **JWT** para autenticação
- **WebSockets** para tempo real

### Frontend
- **React 18+** com TypeScript
- **Tailwind CSS** para estilização
- **Zustand** para gerenciamento de estado
- **Axios** para requisições HTTP
- **React Beautiful DnD** para drag-and-drop
- **React Calendar** para visualização de calendário

## 🚀 Setup e Instalação

### Pré-requisitos
- Docker e Docker Compose
- Python 3.11+
- Node.js 18+
- Poetry (para gerenciamento de dependências Python)

### 1. Clone o Repositório
```bash
git clone https://github.com/Harley062/tcc-gerenciador-de-tarefas.git
cd tcc-gerenciador-de-tarefas
```

### 2. Configuração de Variáveis de Ambiente

#### Backend
```bash
cd backend
cp .env.example .env
```

Edite `.env` e configure:
```env
DATABASE_URL=postgresql+asyncpg://taskmaster:taskmaster123@localhost/taskmaster
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sua_chave_openai_aqui
JWT_SECRET_KEY=gere_uma_chave_secreta_forte_aqui
```

#### Frontend
```bash
cd frontend
cp .env.example .env
```

### 3. Usando Docker Compose (Recomendado)

```bash
# Na raiz do projeto
docker-compose up -d
```

Isso iniciará:
- PostgreSQL na porta 5432
- Redis na porta 6379
- Backend na porta 8000
- Frontend na porta 3000

### 4. Setup Manual (Alternativa)

#### Backend
```bash
cd backend

# Instalar dependências
poetry install

# Iniciar PostgreSQL e Redis
docker-compose up -d postgres redis

# Executar migrações (as tabelas são criadas automaticamente)
# Iniciar servidor
poetry run uvicorn presentation.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start
```

## 📊 Banco de Dados

### Schema Principal

**users**
- id (UUID)
- email (VARCHAR, UNIQUE)
- hashed_password (VARCHAR)
- full_name (VARCHAR)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)

**tasks**
- id (UUID)
- user_id (UUID, FK)
- project_id (UUID, FK, nullable)
- parent_task_id (UUID, FK, nullable)
- title (VARCHAR)
- description (TEXT)
- status (ENUM: todo, in_progress, done, cancelled)
- priority (ENUM: low, medium, high, urgent)
- due_date (TIMESTAMP)
- estimated_duration (INTEGER)
- tags (TEXT[])
- metadata (JSONB)
- natural_language_input (TEXT)
- gpt_response (JSONB)
- created_at, updated_at (TIMESTAMP)

**projects**
- id (UUID)
- user_id (UUID, FK)
- name (VARCHAR)
- description (TEXT)
- color (VARCHAR)
- icon (VARCHAR)
- created_at, updated_at (TIMESTAMP)

**gpt_cache**
- id (UUID)
- input_hash (VARCHAR, UNIQUE)
- input_text (TEXT)
- output (JSONB)
- model (VARCHAR)
- tokens_used (INTEGER)
- cost (DECIMAL)
- created_at, last_accessed (TIMESTAMP)
- access_count (INTEGER)

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/me` - Obter usuário atual

### Tarefas
- `POST /api/tasks` - Criar tarefa (linguagem natural ou estruturada)
- `GET /api/tasks` - Listar tarefas (com filtros)
- `GET /api/tasks/{id}` - Obter tarefa específica
- `PUT /api/tasks/{id}` - Atualizar tarefa
- `DELETE /api/tasks/{id}` - Deletar tarefa
- `POST /api/tasks/{id}/subtasks` - Criar subtarefa
- `GET /api/tasks/{id}/subtasks` - Listar subtarefas

### WebSocket
- `WS /ws?token={jwt_token}` - Conexão WebSocket para atualizações em tempo real

## 🧪 Testes

### Backend
```bash
cd backend
poetry run pytest
poetry run pytest --cov=. --cov-report=html
```

### Frontend
```bash
cd frontend
npm test
npm run test:coverage
```

## 📝 Exemplos de Uso

### Criar Tarefa com Linguagem Natural

```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "natural_language_input": "Reunião com cliente amanhã às 14h"
  }'
```

Resposta:
```json
{
  "id": "uuid",
  "title": "Reunião com cliente",
  "description": "Reunião agendada com cliente",
  "priority": "medium",
  "due_date": "2025-11-15T14:00:00",
  "status": "todo",
  "tags": ["reunião", "cliente"],
  "gpt_response": {
    "tokens_used": 95,
    "model": "gpt-4",
    "cost": 0.00285
  }
}
```

### Criar Tarefa Estruturada

```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implementar feature X",
    "description": "Desenvolver nova funcionalidade",
    "priority": "high",
    "status": "todo",
    "tags": ["desenvolvimento", "feature"]
  }'
```

## 🎯 Métricas de Performance

- **Tempo de resposta P95**: < 500ms
- **Taxa de erro**: < 0.1%
- **Precisão do parser GPT**: > 95%
- **Custo médio por requisição GPT**: < $0.002
- **Taxa de cache hit**: > 60%

## 🔒 Segurança

- JWT com expiração de 30 minutos (access token)
- Refresh tokens com expiração de 7 dias
- Senhas hasheadas com bcrypt
- Rate limiting: 60 requisições/minuto
- CORS configurado
- Validação de entrada com Pydantic

## 🚀 Deploy

### Backend (FastAPI)
```bash
cd backend
docker build -t taskmaster-backend .
docker run -p 8000:8000 taskmaster-backend
```

### Frontend (React)
```bash
cd frontend
npm run build
# Servir pasta build/ com servidor web (nginx, etc)
```

## 📚 Documentação da API

Acesse a documentação interativa Swagger:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto foi desenvolvido como parte do TCC (Trabalho de Conclusão de Curso).

## 👤 Autor

**Harley Gonçalves**
- Email: harleygteixeira@gmail.com
- GitHub: [@Harley062](https://github.com/Harley062)

## 🙏 Agradecimentos

- OpenAI pela API GPT-4
- Comunidade FastAPI
- Comunidade React
- Todos os contribuidores de bibliotecas open-source utilizadas

## 📞 Suporte

Para questões e suporte, abra uma issue no GitHub ou entre em contato via email.

---

**Desenvolvido com ❤️ usando Clean Architecture e as melhores práticas de desenvolvimento**
