import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional


class RegexParser:
    """Fallback parser using regex patterns for Portuguese task descriptions"""
    
    def __init__(self):
        self.recurrence_patterns = {
            r'(toda|todo|cada)\s+(semana|semanal|semanalmente)': {'frequency': 'weekly', 'interval': 1},
            r'(todo|cada)\s+(dia|diariamente|diário)': {'frequency': 'daily', 'interval': 1},
            r'(todo|cada)\s+(mês|mensal|mensalmente)': {'frequency': 'monthly', 'interval': 1},
            r'(toda|todo)\s+(segunda|terça|quarta|quinta|sexta)': {'frequency': 'weekly', 'interval': 1},
        }
        
        self.priority_patterns = {
            r'(urgente|crítico|emergência)': 'urgent',
            r'(importante|alta\s+prioridade|prioritário)': 'high',
            r'(baixa\s+prioridade|pode\s+esperar)': 'low',
        }
        
        self.time_patterns = {
            r'(\d{1,2}):(\d{2})': lambda m: f"T{m.group(1).zfill(2)}:{m.group(2)}:00",
            r'(\d{1,2})h': lambda m: f"T{m.group(1).zfill(2)}:00:00",
        }
        
        self.date_patterns = {
            r'(hoje)': lambda: datetime.now(timezone.utc),
            r'(amanhã)': lambda: datetime.now(timezone.utc) + timedelta(days=1),
            r'(depois\s+de\s+amanhã)': lambda: datetime.now(timezone.utc) + timedelta(days=2),
            r'(próxima|próximo)\s+(segunda|terça|quarta|quinta|sexta|sábado|domingo)': self._next_weekday,
        }

    def _next_weekday(self, match):
        weekdays = {
            'segunda': 0, 'terça': 1, 'quarta': 2, 'quinta': 3,
            'sexta': 4, 'sábado': 5, 'domingo': 6
        }
        target_day = weekdays.get(match.group(2).lower(), 0)
        today = datetime.now(timezone.utc)
        days_ahead = target_day - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return today + timedelta(days=days_ahead)

    async def parse_task(self, text: str) -> dict[str, Any]:
        """Parse task using regex patterns"""
        text_lower = text.lower()
        
        # Extract title (use first 50 chars or until punctuation)
        title = text.split('.')[0].split(',')[0][:50].strip()
        
        # Detect recurrence
        recurrence = None
        for pattern, rec_data in self.recurrence_patterns.items():
            if re.search(pattern, text_lower):
                recurrence = rec_data
                break
        
        # Detect priority
        priority = 'medium'
        for pattern, prio in self.priority_patterns.items():
            if re.search(pattern, text_lower):
                priority = prio
                break
        
        # Detect date
        due_date = None
        for pattern, date_func in self.date_patterns.items():
            match = re.search(pattern, text_lower)
            if match:
                if callable(date_func):
                    if pattern == r'(próxima|próximo)\s+(segunda|terça|quarta|quinta|sexta|sábado|domingo)':
                        base_date = date_func(match)
                    else:
                        base_date = date_func()
                else:
                    base_date = date_func
                
                # Look for time
                time_str = "T09:00:00"
                for time_pattern, time_func in self.time_patterns.items():
                    time_match = re.search(time_pattern, text)
                    if time_match:
                        time_str = time_func(time_match)
                        break
                
                due_date = base_date.strftime(f"%Y-%m-%d{time_str}+00:00")
                break
        
        # Extract tags
        tags = []
        common_tags = {
            'reunião': ['reunião', 'meeting'],
            'cliente': ['cliente', 'customer'],
            'planning': ['planning', 'planejamento'],
            'desenvolvimento': ['dev', 'desenvolvimento', 'código'],
            'bug': ['bug', 'erro', 'problema'],
        }
        for tag, keywords in common_tags.items():
            if any(kw in text_lower for kw in keywords):
                tags.append(tag)
        
        # Estimate duration
        estimated_duration = 60  # Default 1 hour
        if 'rápido' in text_lower or 'quick' in text_lower:
            estimated_duration = 30
        elif 'longo' in text_lower or 'demorado' in text_lower:
            estimated_duration = 120
        
        parsed_data = {
            'title': title,
            'description': text if len(text) > len(title) else None,
            'priority': priority,
            'due_date': due_date,
            'estimated_duration': estimated_duration,
            'tags': tags,
            'recurrence': recurrence,
        }
        
        return {
            'parsed_data': parsed_data,
            'tokens_used': 0,
            'model': 'regex',
            'cost': 0.0,
        }

    async def suggest_subtasks(self, task_title: str, task_description: Optional[str] = None) -> list[dict[str, Any]]:
        """Regex parser doesn't support subtask suggestions"""
        return []
