# Use official lightweight Python image
FROM python:3.10-slim

# Set environment variables for Python & logging
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies for FFmpeg, Pillow, and FAISS
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose port (Defaults to 7860 for Hugging Face Spaces; dynamically overridden by Cloud Run / Koyeb / Render via $PORT)
ENV PORT=7860
EXPOSE 7860

# Run FastAPI app with Uvicorn
CMD ["sh", "-c", "uvicorn cre8echo:app --host 0.0.0.0 --port ${PORT:-7860}"]
