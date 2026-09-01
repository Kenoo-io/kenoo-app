FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

COPY systems/pyproject.toml /app/pyproject.toml
COPY systems/shared /app/shared
COPY systems/people_enrichment /app/people_enrichment

RUN pip install --no-cache-dir -e .

ENV PYTHONUNBUFFERED=1
CMD ["python", "-m", "people_enrichment"]
