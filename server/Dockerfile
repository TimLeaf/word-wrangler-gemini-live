FROM ghcr.io/astral-sh/uv:python3.13-trixie-slim

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        libopenblas-dev \
        libresample1 \
        libresample-dev \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-dev

RUN uv run python -c "import nltk; nltk.download('punkt_tab', download_dir='/usr/share/nltk_data')"
ENV NLTK_DATA=/usr/share/nltk_data

COPY ./bot.py ./

EXPOSE 8080

CMD ["uv", "run", "--no-dev", "python", "bot.py", "-t", "daily", "--host", "0.0.0.0", "--port", "8080"]
