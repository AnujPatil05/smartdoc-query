FROM python:3.11

# Don't write .pyc files, always flush stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Railway uses dynamic PORT
ENV PORT=8000

# Start FastAPI with Uvicorn using shell form to expand $PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
