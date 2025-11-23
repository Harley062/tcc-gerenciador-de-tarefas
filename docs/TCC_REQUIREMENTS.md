# Matriz de Rastreabilidade - Requisitos do TCC

## Requisitos Funcionais (RF)

| ID | Descrição | Fonte TCC | Status | Evidência | Observações |
|----|-----------|-----------|--------|-----------|-------------|
| RF-01 | Criação de tarefas via linguagem natural com GPT parsing | Parágrafo 38, 182 | ✅ Implementado | `backend/infrastructure/gpt/openai_adapter.py:parse_task()` | Endpoint `/api/ai/tasks/parse` precisa ser criado |
| RF-02 | Decomposição inteligente de tarefas em subtarefas via GPT | Parágrafo 38, 339 | ✅ Implementado | `backend/application/services/ai_insights_service.py:suggest_subtasks()` | Corrigido para GPT-only sem fallback |
| RF-03 | Agendamento inteligente de tarefas via GPT | Parágrafo 333 | ⚠️ Parcial | `backend/application/services/ai_insights_service.py:suggest_scheduling()` | Atualmente usa heurística, precisa implementar GPT |
| RF-04 | Entrada rápida de tarefas (quick add) | Parágrafo 640 | ⚠️ Parcial | `frontend/src/components/Navbar` | Input existe mas não chama GPT parse |
| RF-05 | Criação manual de tarefas com formulário completo | Implementado | ✅ Implementado | `frontend/src/components/TaskCreateModal.tsx` | Modal com todos os campos |
| RF-06 | Visualização de tarefas (Dashboard, Lista, Kanban, Calendário) | Implementado | ✅ Implementado | `frontend/src/components/*View.tsx` | Todas as views funcionando |
| RF-07 | Edição e exclusão de tarefas | Implementado | ✅ Implementado | `frontend/src/components/TaskEditModal.tsx` | Modal de edição funcionando |
| RF-08 | Sistema de notificações em tempo real | Parágrafo 150, 152 | ❌ Não implementado | N/A | WebSocket mencionado no TCC mas não implementado |
| RF-09 | Busca e filtros de tarefas | Implementado | ✅ Implementado | `frontend/src/components/ListView.tsx` | Busca e filtros por status |
| RF-10 | Insights de IA (prioridade, duração, dependências) | Implementado | ✅ Implementado | `backend/application/services/ai_insights_service.py` | Múltiplos métodos de análise |

## Requisitos Não-Funcionais (RNF)

| ID | Descrição | Fonte TCC | Status | Métrica Atual | Meta TCC | Observações |
|----|-----------|-----------|--------|---------------|----------|-------------|
| RNF-01 | Precisão do parsing de linguagem natural | Parágrafo 38 | ⚠️ Não medido | N/A | >95% | Precisa implementar métricas |
| RNF-02 | Tempo de resposta P95 | Parágrafo 38, 1899 | ⚠️ Não medido | N/A | <500ms | Precisa implementar observabilidade |
| RNF-03 | Taxa de erro | Parágrafo 38, 1899 | ⚠️ Não medido | N/A | <0.1% | Precisa implementar métricas |
| RNF-04 | Cache Redis para otimização | Parágrafo 38, 224, 1899 | ❌ Não implementado | N/A | 67% redução de chamadas | Precisa implementar cache |
| RNF-05 | Custo médio por requisição | Parágrafo 1899 | ⚠️ Não medido | N/A | $0.0018 | Precisa implementar tracking |
| RNF-06 | Throughput | Parágrafo 1899 | ⚠️ Não medido | N/A | >100 req/s | Precisa implementar métricas |
| RNF-07 | Cobertura de testes | Parágrafo 575, 1886 | ⚠️ Desconhecido | N/A | >80% | Precisa verificar cobertura |
| RNF-08 | Usabilidade (SUS Score) | Parágrafo 38 | ⚠️ Não medido | N/A | 76 pontos | Requer teste com usuários |
| RNF-09 | Segurança e privacidade (LGPD) | Parágrafo 160 | ⚠️ Parcial | Logs não expõem chaves | Conformidade LGPD | Revisar logging |

## Padrões de Design Aplicados

| Padrão | Problema | Status | Evidência |
|--------|----------|--------|-----------|
| Repository | Abstração da persistência | ✅ Implementado | `backend/domain/repositories/` |
| Strategy | Múltiplas implementações de IA | ✅ Implementado | `AIInsightsService` com providers |
| Builder | Construção de tarefas complexas | ⚠️ Parcial | Pode ser melhorado |
| Observer | Notificações e eventos | ❌ Não implementado | WebSocket não implementado |
| Proxy | Cache transparente | ❌ Não implementado | Redis cache não implementado |

## Gaps Identificados

### Alta Prioridade
1. **Implementar Redis Cache** - Crítico para RNF-04 (redução de 67% em chamadas GPT)
2. **Endpoint de Parse NLP** - Conectar quick add ao GPT parsing
3. **GPT Scheduling** - Substituir heurística por GPT no agendamento
4. **Observabilidade** - Métricas de performance (P95, throughput, taxa de erro)

### Média Prioridade
5. **WebSocket para notificações** - Sistema de tempo real mencionado no TCC
6. **Métricas de acurácia** - Tracking de precisão do parsing NLP
7. **Cost tracking** - Monitoramento de custos por requisição

### Baixa Prioridade
8. **Testes de cobertura** - Verificar se atinge >80%
9. **Testes de usabilidade** - SUS score com usuários reais
10. **Padrão Observer** - Implementação completa para eventos

## Próximos Passos

1. ✅ Corrigir JSON format do GPT (objeto com "subtasks" array)
2. ⏳ Implementar Redis cache para chamadas GPT
3. ⏳ Criar endpoint `/api/ai/tasks/parse` e conectar ao quick add
4. ⏳ Implementar `_suggest_scheduling_gpt()` para agendamento inteligente
5. ⏳ Adicionar middleware de observabilidade (timing, métricas)
6. ⏳ Testar todas as funcionalidades end-to-end
7. ⏳ Atualizar PR #9 com mudanças de alinhamento ao TCC
