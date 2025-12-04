FROM python:3.11-slim

WORKDIR /app

RUN pip install "poetry==1.8.5"

COPY pyproject.toml poetry.lock* ./

RUN poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi

COPY . .

EXPOSE 8000

CMD ["poetry", "run", "uvicorn", "presentation.main:app", "--host", "0.0.0.0", "--port", "8000"]
