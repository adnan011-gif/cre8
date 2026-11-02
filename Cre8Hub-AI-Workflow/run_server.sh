#!/bin/bash

echo "🚀 Starting Cre8Hub AI Workflow - Persona Extraction API"
echo "=================================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Please create one with your API keys."
    echo "Example .env file:"
    echo "GOOGLE_API_KEY=your_google_api_key_here"
    echo ""
fi

# Start the server
echo "🌐 Starting server on http://localhost:8000"
echo "📚 API documentation available at http://localhost:8000/docs"
echo "🔍 Health check at http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Use project venv if it exists, otherwise fall back to system uvicorn
if [ -f "venv/bin/uvicorn" ]; then
  venv/bin/uvicorn cre8echo:app --host 0.0.0.0 --port 8000 --reload
else
  uvicorn cre8echo:app --host 0.0.0.0 --port 8000 --reload
fi
