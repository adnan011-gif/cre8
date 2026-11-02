# Cre8Hub AI Workflow - Persona Extraction API

This API extracts content creator personas from video transcripts using AI analysis.

## Features

- **Dynamic Transcript Processing**: Accepts JSON input with multiple video transcripts
- **AI-Powered Analysis**: Uses LangChain and LLM models to analyze content patterns
- **Structured Persona Output**: Returns detailed persona profiles in JSON format
- **Real-time Processing**: No need to pre-load data - processes transcripts on-demand

## API Endpoints

### POST `/persona`

Extracts a persona profile from provided video transcripts.

**Request Body:**
```json
{
  "transcripts": [
    {
      "videoId": "abcde12345",
      "transcript": "Hello everyone! Welcome to my channel..."
    },
    {
      "videoId": "fghij67890",
      "transcript": "Today we're going to talk about AI..."
    }
  ]
}
```

**Response:**
```json
{
  "persona": {
    "creator_name": "string",
    "tone": "string",
    "style": "string",
    "catchphrases": ["string", "string", ...],
    "topics_of_interest": ["string", "string", ...],
    "characters": [
      {
        "name": "string",
        "role": "string",
        "speech_style": "string",
        "catchphrases": ["string", "string", ...]
      }
    ],
    "video_format_preferences": {
      "opening_style": "string",
      "mid_section": "string",
      "ending": "string"
    },
    "quirks": ["string", "string", ...]
  }
}
```

### GET `/health`

Health check endpoint to verify the service is running.

## Setup and Installation

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Variables:**
   Create a `.env` file with your API keys:
   ```env
   GOOGLE_API_KEY=your_google_api_key_here
   ```

3. **Run the Server:**
   ```bash
   uvicorn script:app --host 0.0.0.0 --port 8000 --reload
   ```

## Usage Examples

### Python Client

```python
import requests

# Sample data
data = {
    "transcripts": [
        {
            "videoId": "abcde12345",
            "transcript": "Hello everyone! Welcome to my channel..."
        }
    ]
}

# Make API request
response = requests.post("http://localhost:8000/persona", json=data)
persona = response.json()
print(persona)
```

### cURL

```bash
curl -X POST "http://localhost:8000/persona" \
  -H "Content-Type: application/json" \
  -d '{
    "transcripts": [
      {
        "videoId": "abcde12345",
        "transcript": "Hello everyone! Welcome to my channel..."
      }
    ]
  }'
```

### Testing

Run the test script to verify the API:

```bash
python test_api.py
```

## How It Works

1. **Input Processing**: The API receives JSON with video transcripts
2. **Dynamic Vectorization**: Creates embeddings for the provided transcripts
3. **AI Analysis**: Uses LangChain with LLM models to analyze content patterns
4. **Persona Extraction**: Identifies tone, style, catchphrases, and other persona elements
5. **Structured Output**: Returns a comprehensive persona profile in JSON format

## Technical Details

- **Framework**: FastAPI with CORS support
- **AI Models**: LangChain with HuggingFace embeddings and LLM integration
- **Vector Database**: FAISS for similarity search (created dynamically)
- **Input Validation**: Pydantic models for request/response validation
- **Error Handling**: Comprehensive error handling with HTTP status codes

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `500`: Internal server error
- `422`: Validation error (invalid input format)

## Development

- **Logging**: Comprehensive logging for debugging
- **Modular Design**: Separate services for chain management, LLM integration, and data processing
- **Extensible**: Easy to add new analysis features or modify persona extraction logic

## License

This project is part of the Cre8Hub AI Workflow system.
