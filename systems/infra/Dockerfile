FROM python:3.12-slim

ARG SYSTEM_NAME
ENV SYSTEM_NAME=${SYSTEM_NAME}

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

COPY systems/pyproject.toml /app/pyproject.toml
COPY systems/shared /app/shared
COPY systems/${SYSTEM_NAME} /app/${SYSTEM_NAME}

# pyproject.toml's [tool.setuptools.packages.find] include list must contain
# "<system_name>*" or this install won't pick up the new package — add one
# entry per new system.
RUN pip install --no-cache-dir -e .

ENV PYTHONUNBUFFERED=1
# `exec` replaces the shell with the python process (making it PID 1) so ECS's
# SIGTERM on scale-down reaches the worker's signal handler directly, instead
# of being swallowed by an intermediate shell process.
CMD ["sh", "-c", "exec python -m $SYSTEM_NAME"]
