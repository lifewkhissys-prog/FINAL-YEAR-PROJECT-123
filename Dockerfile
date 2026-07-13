FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for compiling certs, building some wheels, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast package installation
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin/:${PATH}"

# Copy pyproject.toml and install dependencies first for layer caching
COPY pyproject.toml ./
RUN uv pip install --system -r pyproject.toml

# Copy project files
COPY app ./app

# Expose port
EXPOSE 8000

# Set Python path
ENV PYTHONPATH=/app

# Command to run uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
