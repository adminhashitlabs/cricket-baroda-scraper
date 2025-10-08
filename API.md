# Cricket Baroda Scraper API

A REST API for extracting cricket data from CricketBaroda.com, designed for agent integration and automated data collection.

## 🚀 Quick Start

```bash
# Start the API server
npm run api

# Server will be available at http://localhost:3000
```

## 📋 Endpoints

### GET /health
Health check endpoint to verify API status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/players
Extract player data from cricket matches.

**Response:**
```json
{
  "success": true,
  "data": {
    "teams": [
      {
        "name": "Advick Cricket Academy Women",
        "players": [
          {"name": "Surbhi Chauhan", "id": "2691385"},
          {"name": "Akshara Tiwari", "id": "15861855"}
        ]
      }
    ],
    "players": [...]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST /api/match
Extract complete match data including commentary.

**Request Body:**
```json
{
  "url": "https://www.cricketbaroda.com/match/17801317/Advick-Cricket-Academy-Women-vs-Y.S.C-Women"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "match": {
      "title": "Advick Cricket Academy Women vs Y.S.C Women",
      "url": "...",
      "result": "Advick Cricket Academy Women won by 20 runs"
    },
    "teams": [...],
    "commentary": [
      {
        "over": 0,
        "balls": [
          {
            "ball": 1,
            "bowler": {"name": "Maithili Ganjale", "id": "2532426"},
            "batsman": {"name": "Mesvi Pokar", "id": "9813467"},
            "runs": 4
          }
        ]
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🤖 Agent Integration

### Example: Python Agent

```python
import requests

# Health check
response = requests.get('http://localhost:3000/health')
print(response.json())

# Extract players
response = requests.get('http://localhost:3000/api/players')
players_data = response.json()

# Extract match data
match_url = "https://www.cricketbaroda.com/match/17801317/Advick-Cricket-Academy-Women-vs-Y.S.C-Women"
response = requests.post('http://localhost:3000/api/match', json={'url': match_url})
match_data = response.json()
```

### Example: JavaScript Agent

```javascript
// Health check
const health = await fetch('http://localhost:3000/health');
const healthData = await health.json();

// Extract players
const players = await fetch('http://localhost:3000/api/players');
const playersData = await players.json();

// Extract match data
const matchResponse = await fetch('http://localhost:3000/api/match', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.cricketbaroda.com/match/17801317/Advick-Cricket-Academy-Women-vs-Y.S.C-Women'
  })
});
const matchData = await matchResponse.json();
```

## 🔧 Configuration

The API server runs on port 3000 by default. You can change this with:

```bash
PORT=8080 npm run api
```

## 📊 Data Format

All responses follow a consistent format:

```json
{
  "success": boolean,
  "data": object | null,
  "error": string | null,
  "timestamp": string
}
```

## ⚠️ Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad request (missing required parameters)
- `500`: Internal server error (scraping failed)

Error responses include detailed error messages for debugging.

## 🔒 Security

- CORS enabled for cross-origin requests
- Helmet.js for security headers
- Input validation on all endpoints
- Structured logging for monitoring

## 📈 Performance

- Headless browser mode for faster scraping
- Connection pooling and reuse
- Automatic browser cleanup
- Request timeout handling

## 🐛 Troubleshooting

### Common Issues

1. **Browser Launch Failed**
   - Ensure Chrome/Chromium is installed
   - Check system permissions

2. **Timeout Errors**
   - Increase timeout in request headers
   - Check network connectivity

3. **Invalid Match URL**
   - Verify URL format matches CricketBaroda.com
   - Ensure match exists and is accessible

### Debug Mode

Enable detailed logging:

```bash
DEBUG=* npm run api
```
