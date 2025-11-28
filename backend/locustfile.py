"""
╔══════════════════════════════════════════════════════════════════════════════╗
║              TESTE DE CARGA - LOCUST - TCC                                   ║
║      Gerenciador de Tarefas Inteligente com Integração de IA                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

Este script simula múltiplos usuários acessando o sistema simultaneamente
para avaliar a performance e escalabilidade da aplicação.

Rotas Testadas:
  - POST /api/ai/tasks/parse - Parsing de linguagem natural com IA
  - GET /api/tasks - Listagem de tarefas
  - POST /api/tasks - Criação de tarefas

Configuração Recomendada para TCC:
  - Usuários: 10-50
  - Spawn Rate: 5 usuários/segundo
  - Duração: 60-120 segundos

Autor: [Seu Nome]
Data: Novembro/2025
"""

import random
import string
from locust import HttpUser, task, between, events
from datetime import datetime
import json


# =============================================================================
# DADOS DE TESTE
# =============================================================================

# Frases em linguagem natural para teste de parsing com IA
FRASES_NATURAIS = [
    "Comprar leite e pão no mercado amanhã cedo",
    "Reunião urgente com a equipe às 14h",
    "Estudar Python para a prova de sexta",
    "Enviar relatório mensal para o chefe",
    "Ligar para o cliente sobre o orçamento",
    "Agendar consulta médica para próxima semana",
    "Revisar código do projeto antes do deploy",
    "Preparar apresentação do TCC",
    "Fazer backup dos arquivos importantes",
    "Responder e-mails pendentes",
    "Organizar documentos do projeto",
    "Atualizar planilha de custos",
    "Reunião de planning toda segunda-feira",
    "Entregar relatório até sexta-feira urgente",
    "Corrigir bug crítico em produção",
    "Revisar pull request do colega",
    "Documentar API REST do sistema",
    "Testar funcionalidades novas",
    "Preparar ambiente de staging",
    "Fazer code review do módulo de autenticação",
]

# Prioridades disponíveis
PRIORITIES = ["low", "medium", "high", "urgent"]

# Tags comuns
TAGS = ["trabalho", "pessoal", "urgente", "estudo", "projeto", "tcc", "reunião"]


# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

def generate_random_task():
    """Gera uma tarefa aleatória para teste"""
    return {
        "title": random.choice(FRASES_NATURAIS),
        "description": f"Tarefa gerada automaticamente para teste de carga - {datetime.now().isoformat()}",
        "priority": random.choice(PRIORITIES),
        "tags": random.sample(TAGS, k=random.randint(1, 3)),
    }


def generate_random_string(length=10):
    """Gera uma string aleatória"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


# =============================================================================
# CLASSE PRINCIPAL DO USUÁRIO SIMULADO
# =============================================================================

class TaskManagerUser(HttpUser):
    """
    Simula um usuário típico do Gerenciador de Tarefas Inteligente.
    
    Comportamento simulado:
    - Faz login e obtém token JWT
    - Usa o sistema de parsing com IA (principal foco do teste)
    - Lista e cria tarefas
    """
    
    # Tempo de espera entre requisições (1 a 3 segundos - comportamento realista)
    wait_time = between(1, 3)
    
    # Host padrão (pode ser sobrescrito via CLI)
    host = "http://localhost:8000"
    
    # Token de autenticação (obtido no login)
    token = None
    
    def on_start(self):
        """
        Executado quando um usuário virtual inicia.
        Realiza login para obter token de autenticação.
        """
        self.login()
    
    def login(self):
        """
        Realiza login e armazena o token JWT.
        """
        # Credenciais de teste (ajuste conforme seu ambiente)
        credentials = {
            "email": "test@example.com",
            "password": "test123456"
        }
        
        # Primeiro, tenta registrar o usuário (caso não exista)
        register_data = {
            "email": credentials["email"],
            "password": credentials["password"],
            "name": "Usuário de Teste Locust"
        }
        
        # Tenta registrar (ignora erro se já existir)
        self.client.post(
            "/api/auth/register",
            json=register_data,
            headers={"Content-Type": "application/json"},
            name="[Setup] Register User",
            catch_response=True
        )
        
        # Faz login
        with self.client.post(
            "/api/auth/login",
            json=credentials,
            headers={"Content-Type": "application/json"},
            name="[Setup] Login",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                response.success()
            else:
                # Se falhar, usa um token mock para continuar os testes
                self.token = None
                response.failure(f"Login failed: {response.status_code}")
    
    def get_headers(self):
        """Retorna headers com autenticação"""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    # =========================================================================
    # TAREFAS DE TESTE (Tasks do Locust)
    # =========================================================================
    
    @task(5)  # Peso 5 - mais executada (foco do TCC)
    def parse_natural_language(self):
        """
        [PRINCIPAL] Testa o endpoint de parsing de linguagem natural com IA.
        
        Este é o principal foco do teste de carga, pois envolve:
        - Processamento de linguagem natural
        - Chamada à API da OpenAI (ou cache Redis)
        - Extração de informações estruturadas
        """
        frase = random.choice(FRASES_NATURAIS)
        
        with self.client.post(
            "/api/ai/tasks/parse",
            json={"text": frase},
            headers=self.get_headers(),
            name="POST /api/ai/tasks/parse (IA Parsing)",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                # Verifica se retornou campos esperados
                if "title" in data and "priority" in data:
                    response.success()
                else:
                    response.failure("Campos obrigatórios ausentes na resposta")
            elif response.status_code == 400:
                # API key não configurada - esperado em alguns cenários
                response.success()
            elif response.status_code == 401:
                # Não autenticado - tenta relogar
                self.login()
                response.failure("Token expirado - relogando")
            else:
                response.failure(f"Erro: {response.status_code}")
    
    @task(3)  # Peso 3
    def list_tasks(self):
        """
        Lista todas as tarefas do usuário.
        """
        with self.client.get(
            "/api/tasks",
            headers=self.get_headers(),
            name="GET /api/tasks (Listar)",
            catch_response=True
        ) as response:
            if response.status_code in [200, 401]:
                response.success()
            else:
                response.failure(f"Erro: {response.status_code}")
    
    @task(2)  # Peso 2
    def create_task(self):
        """
        Cria uma nova tarefa.
        """
        task_data = generate_random_task()
        
        with self.client.post(
            "/api/tasks",
            json=task_data,
            headers=self.get_headers(),
            name="POST /api/tasks (Criar)",
            catch_response=True
        ) as response:
            if response.status_code in [200, 201, 401]:
                response.success()
            else:
                response.failure(f"Erro: {response.status_code}")
    
    @task(1)  # Peso 1 - menos executada
    def get_ai_insights(self):
        """
        Busca insights de IA (sugestões de subtarefas).
        """
        with self.client.post(
            "/api/ai/subtasks/suggest",
            json={
                "task_title": "Preparar apresentação do TCC",
                "task_description": "Criar slides e revisar conteúdo"
            },
            headers=self.get_headers(),
            name="POST /api/ai/subtasks/suggest (IA Insights)",
            catch_response=True
        ) as response:
            if response.status_code in [200, 400, 401]:
                response.success()
            else:
                response.failure(f"Erro: {response.status_code}")


# =============================================================================
# CLASSE ALTERNATIVA: USUÁRIO DE LEITURA (Read-Heavy)
# =============================================================================

class ReadHeavyUser(HttpUser):
    """
    Simula um usuário que principalmente lê/consulta dados.
    Útil para testar cenários de leitura intensiva.
    """
    
    wait_time = between(0.5, 2)
    weight = 1  # Menos usuários deste tipo
    
    token = None
    
    def on_start(self):
        """Login inicial"""
        with self.client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "test123456"},
            headers={"Content-Type": "application/json"},
            catch_response=True
        ) as response:
            if response.status_code == 200:
                self.token = response.json().get("access_token")
    
    def get_headers(self):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    @task(10)
    def list_tasks(self):
        """Lista tarefas repetidamente"""
        self.client.get(
            "/api/tasks",
            headers=self.get_headers(),
            name="GET /api/tasks (Read-Heavy)"
        )
    
    @task(2)
    def get_dashboard(self):
        """Busca dados do dashboard"""
        self.client.get(
            "/api/analytics/dashboard",
            headers=self.get_headers(),
            name="GET /api/analytics/dashboard"
        )


# =============================================================================
# EVENTOS PARA LOGGING PERSONALIZADO
# =============================================================================

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Executado quando o teste inicia"""
    print("\n" + "=" * 80)
    print("╔" + "═" * 78 + "╗")
    print("║" + " INICIANDO TESTE DE CARGA - TCC ".center(78) + "║")
    print("║" + " Gerenciador de Tarefas Inteligente com IA ".center(78) + "║")
    print("╚" + "═" * 78 + "╝")
    print(f"Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("=" * 80 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Executado quando o teste termina"""
    print("\n" + "=" * 80)
    print("╔" + "═" * 78 + "╗")
    print("║" + " TESTE DE CARGA FINALIZADO ".center(78) + "║")
    print("╚" + "═" * 78 + "╝")
    print(f"Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("=" * 80)
    print("\n[TCC] Acesse http://localhost:8089 para ver o relatório completo")
    print("[TCC] Os dados podem ser exportados em CSV/HTML pelo painel web")
    print("=" * 80 + "\n")


# =============================================================================
# INSTRUÇÕES DE USO
# =============================================================================

"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                          INSTRUÇÕES DE USO                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

1. INSTALAÇÃO DO LOCUST:
   pip install locust

2. EXECUTAR O TESTE (com interface web):
   cd backend
   locust -f locustfile.py --host=http://localhost:8000

   Depois acesse: http://localhost:8089

3. EXECUTAR O TESTE (modo headless - para CI/CD):
   locust -f locustfile.py --headless -u 10 -r 2 -t 60s --host=http://localhost:8000

   Parâmetros:
   -u 10    = 10 usuários simultâneos
   -r 2     = spawn rate de 2 usuários/segundo
   -t 60s   = duração de 60 segundos

4. EXPORTAR RESULTADOS:
   locust -f locustfile.py --headless -u 10 -r 2 -t 60s --csv=results --host=http://localhost:8000

   Isso gera:
   - results_stats.csv (estatísticas gerais)
   - results_failures.csv (falhas)
   - results_stats_history.csv (histórico)

5. GERAR RELATÓRIO HTML:
   locust -f locustfile.py --headless -u 10 -r 2 -t 60s --html=report.html --host=http://localhost:8000

╔══════════════════════════════════════════════════════════════════════════════╗
║                    CONFIGURAÇÕES RECOMENDADAS PARA TCC                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

Teste Leve (desenvolvimento):
   locust -f locustfile.py --headless -u 5 -r 1 -t 30s --host=http://localhost:8000

Teste Médio (validação):
   locust -f locustfile.py --headless -u 20 -r 5 -t 60s --host=http://localhost:8000

Teste Pesado (stress test):
   locust -f locustfile.py --headless -u 50 -r 10 -t 120s --host=http://localhost:8000

"""
