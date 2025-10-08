# Cricket Commentary Scraper - Advanced Pipeline Architecture

A comprehensive TypeScript-based web scraping application that extracts detailed cricket match data from multiple sources. Features an extensible pipeline architecture supporting tournament processing, multi-match scraping, and automated data integration with external APIs.

## 🚀 Key Features

### Core Functionality
- **Ball-by-Ball Commentary Extraction**: Captures detailed match commentary with bowler/batter information and runs scored
- **Player ID Integration**: Cross-references player names with unique IDs for data consistency
- **Wicket Information Parsing**: Extracts comprehensive wicket details including dismissal type and fielder information
- **Multi-Innings Support**: Handles both innings of cricket matches with proper data structuring
- **Player Statistics**: Collects player performance data including runs, balls faced, and strike rates

### Advanced Architecture
- **Extensible Platform Support**: Modular design supporting multiple cricket websites (CricketBaroda, ESPNcricinfo, etc.)
- **Tournament Processing**: Automatically discover and process all matches from tournament pages
- **Batch Match Processing**: Handle multiple matches sequentially with progress tracking
- **Automated Data Pipeline**: Streamlined workflow from scraping to API integration
- **Configurable Processing**: Flexible options for validation, storage, and API integration

### Production-Ready Features
- **Structured Logging**: Configurable logging system with multiple output formats
- **Comprehensive Error Handling**: Custom error classes with retry mechanisms
- **Type Safety**: Full TypeScript implementation with strict type checking
- **Testing Suite**: Complete test coverage with Jest
- **Code Quality**: ESLint and Prettier integration
- **Performance Monitoring**: Built-in operation timing and progress tracking

## � Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation
```bash
git clone <repository-url>
cd web-scraper-app
npm install
```

### Basic Usage
```bash
# Extract player data from a match
npm run extract:players

# Extract complete match data with commentary
npm run extract:match

# Run tests
npm test

# Check code quality
npm run lint
```

### CLI Usage
The project includes a convenient CLI for common operations:

```bash
# Show available commands
npm run cli

# Extract players
npm run cli players

# Extract match data
npm run cli match

# Run tests
npm run cli test
```

### Example Output
The scraper generates structured JSON output like:
```json
{
  "match": {
    "title": "Baroda Cricket Association",
    "url": "https://www.cricketbaroda.com/match/...",
    "result": "Advick Cricket Academy Women won by 20 runs"
  },
  "teams": [
    {
      "name": "Advick Cricket Academy Women",
      "players": [
        {"name": "Surbhi Chauhan", "id": "2691385"},
        {"name": "Akshara Tiwari", "id": "15861855"}
      ]
    }
  ],
  "commentary": [
    {
      "over": 0,
      "balls": [
        {
          "ball": 1,
          "bowler": {"name": "Maithili Ganjale", "id": "2532426"},
          "batsman": {"name": "Mesvi Pokar", "id": "9813467"},
          "runs": 4,
          "description": "0.14MAITHILI GANJALE to Mesvi Pokar, FOUR"
        }
      ]
    }
  ]
}
```

```
web-scraper-app/
├── src/
│   ├── index.ts                    # Application entry point with mode selection
│   ├── scraper.ts                  # Legacy single-match WebScraper class
│   ├── commentary.ts               # CommentaryExtractor for data parsing
│   ├── config.ts                   # Centralized configuration management
│   ├── logger.ts                   # Structured logging system
│   ├── errors.ts                   # Custom error classes and utilities
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces and types
│   └── platforms/                  # Extensible platform architecture
│       ├── interfaces.ts           # Core platform interfaces
│       ├── data-pipeline.ts        # Main data pipeline orchestrator
│       ├── match-processor.ts      # Multi-match processing engine
│       ├── tournament-scraper.ts   # Tournament page scraper
│       └── cricket-baroda-platform.ts # CricketBaroda platform implementation
├── __tests__/                      # Test files
├── config-examples.ts              # Configuration examples and helpers
├── output/                         # Generated output files
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Chrome/Chromium browser (for Puppeteer)

### Quick Start

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd web-scraper-app
   npm install
   ```

2. **Build the project**
   ```bash
   npm run build
   ```

3. **Run a quick test**
   ```bash
   npm run scrape:single
   ```

## 🚀 Usage Modes

### 1. Single Match Mode (Legacy)
Process a single match URL:
```bash
npm run scrape:single
# or with custom URL:
MATCH_URL="https://www.cricketbaroda.com/match/12345" npm run scrape:single
```

### 2. Tournament Mode
Automatically discover and process all matches from a tournament:
```bash
TOURNAMENT_URL="https://www.cricketbaroda.com/tournament/12345" npm run scrape:tournament
```

### 3. Multiple Matches Mode
Process specific match URLs:
```bash
URLS="url1,url2,url3" npm run scrape:matches
```

### 4. Custom Pipeline Configuration
Full control over processing options:
```bash
PLATFORM=cricketbaroda \
PIPELINE_MODE=tournament \
TOURNAMENT_URL="https://www.cricketbaroda.com/tournament/12345" \
VALIDATE_DATA=true \
SEND_TO_API=true \
STORE_LOCALLY=true \
CONTINUE_ON_ERROR=true \
MAX_RETRIES=3 \
npm run scrape:pipeline
```

## 📊 Data Pipeline Architecture

### Core Components

#### 1. CricketPlatform Interface
Abstract interface for different cricket websites:
```typescript
interface CricketPlatform {
  readonly config: PlatformConfig;
  readonly matchScraper: MatchScraper;
  readonly tournamentScraper: TournamentScraper;
  readonly dataProcessor: DataProcessor;
  readonly dataStorage: DataStorage;
  readonly apiClient: ApiClient;
}
```

#### 2. Data Pipeline
Orchestrates the entire scraping workflow:
```typescript
class DataPipeline {
  execute(): Promise<PipelineResult> {
    // 1. Initialize platform
    // 2. Discover matches (tournament mode)
    // 3. Process matches in batches
    // 4. Validate and transform data
    // 5. Store locally and/or send to API
    // 6. Generate progress reports
  }
}
```

#### 3. Match Processor
Handles batch processing of multiple matches:
```typescript
class MatchProcessor {
  processMatches(matches, options): Promise<ProcessingResult> {
    // Parallel/sequential processing
    // Error handling and retries
    // Progress tracking
  }
}
```

### Data Flow

```
Tournament URL / Match URLs
           │
           ▼
    ┌─────────────┐
    │ Tournament  │ (Optional)
    │ Scraper     │
    └─────────────┘
           │
           ▼
    ┌─────────────┐     ┌─────────────┐
    │ Match       │────▶│ Data        │
    │ Processor   │     │ Processor  │
    └─────────────┘     └─────────────┘
           │                    │
           ▼                    ▼
    ┌─────────────┐     ┌─────────────┐
    │ Local       │     │ External    │
    │ Storage     │     │ API         │
    └─────────────┘     └─────────────┘
```

## 📋 Configuration Examples

### Tournament Processing
```bash
# Process all matches from a tournament
TOURNAMENT_URL="https://www.cricketbaroda.com/tournament/12345" \
VALIDATE_DATA=true \
SEND_TO_API=true \
npm run scrape:tournament
```

### API-Only Mode
```bash
# Only send to API, don't store locally
TOURNAMENT_URL="https://www.cricketbaroda.com/tournament/12345" \
STORE_LOCALLY=false \
SEND_TO_API=true \
API_BASE_URL="https://your-api.com/api" \
npm run scrape:tournament
```

### Fast Processing Mode
```bash
# Minimal validation, maximum speed
TOURNAMENT_URL="https://www.cricketbaroda.com/tournament/12345" \
VALIDATE_DATA=false \
MAX_RETRIES=1 \
CONTINUE_ON_ERROR=true \
npm run scrape:tournament
```

### Debug Mode
```bash
# Detailed logging for troubleshooting
URLS="https://www.cricketbaroda.com/match/12345" \
LOG_LEVEL=debug \
CONTINUE_ON_ERROR=false \
npm run scrape:matches
```

## � Configuration Options

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PLATFORM` | `cricketbaroda` | Target cricket platform |
| `PIPELINE_MODE` | `tournament` | `tournament` or `matches` |
| `TOURNAMENT_URL` | - | Tournament page URL |
| `URLS` | - | Comma-separated match URLs |
| `VALIDATE_DATA` | `true` | Enable data validation |
| `SEND_TO_API` | `true` | Send data to external API |
| `STORE_LOCALLY` | `true` | Store data locally |
| `CONTINUE_ON_ERROR` | `true` | Continue processing on errors |
| `MAX_RETRIES` | `3` | Maximum retry attempts |
| `API_BASE_URL` | `http://localhost:3000/api` | External API base URL |

## 📊 Data Structures

### Enhanced Ball Data
```typescript
interface BallData {
  over: number;           // Over number (0-based)
  ball: number;           // Ball number within over (1-6)
  runs: number;           // Runs scored
  bowler: string;         // Bowler name
  batter: string;         // Batter name
  bowlerId?: string;      // Unique bowler ID
  batterId?: string;      // Unique batter ID
  description: string;    // Ball description
  teamId: string;         // Batting team ID
  wicketInfo?: WicketInfo;// Wicket details
}
```

### Match Information
```typescript
interface MatchInfo {
  id: string;             // Unique match identifier
  url: string;            // Match page URL
  title: string;          // Match title
  team1: string;          // First team name
  team2: string;          // Second team name
  status: string;         // Match status
  tournament?: string;    // Tournament name
  date?: string;          // Match date
  venue?: string;         // Venue information
}
```

### Pipeline Progress
```typescript
interface PipelineProgress {
  total: number;          // Total items to process
  completed: number;      // Items completed
  failed: number;         // Items failed
  current?: string;       // Current item being processed
  startTime: Date;        // Processing start time
  stats: {                // Processing statistics
    matchesProcessed: number;
    ballsExtracted: number;
    playersFound: number;
    errors: string[];
  };
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🔧 Development

### Available Scripts
- `npm start` - Run with compiled JavaScript
- `npm run dev` - Run TypeScript directly (development)
- `npm run build` - Compile TypeScript to JavaScript
- `npm run scrape:single` - Single match scraping
- `npm run scrape:tournament` - Tournament processing
- `npm run scrape:matches` - Multiple matches processing
- `npm run scrape:pipeline` - Custom pipeline configuration

### Code Quality
```bash
# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 🏗️ Extending for New Platforms

### 1. Implement Platform Interface
```typescript
import { CricketPlatform, PlatformConfig } from './interfaces';

export class EspnCricinfoPlatform implements CricketPlatform {
  readonly config: PlatformConfig;
  readonly matchScraper: MatchScraper;
  readonly tournamentScraper: TournamentScraper;
  readonly dataProcessor: DataProcessor;
  readonly dataStorage: DataStorage;
  readonly apiClient: ApiClient;

  constructor(config: PlatformConfig) {
    this.config = { ...config, name: 'espncricinfo' };
    // Initialize components...
  }
}
```

### 2. Implement Scrapers
```typescript
export class EspnCricinfoMatchScraper implements MatchScraper {
  async scrapeMatch(matchUrl: string): Promise<ScrapedData> {
    // Platform-specific scraping logic
  }
}
```

### 3. Update Configuration
```typescript
// Use the new platform
PLATFORM=espncricinfo npm run scrape:pipeline
```

## 📝 Error Handling

The application includes comprehensive error handling:

- **BrowserError**: Browser operation failures
- **ScraperError**: General scraping failures
- **ValidationError**: Data validation failures
- **NetworkError**: Network-related issues
- **TimeoutError**: Operation timeouts

## 📖 Documentation

- **[Getting Started](GETTING_STARTED.md)** - Complete setup and usage guide
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Development History](DEVELOPMENT_HISTORY.md)** - Project timeline and architectural decisions
- **[Changelog](CHANGELOG.md)** - Version history and release notes
- **[API Documentation](API.md)** - Technical API reference for agent integration

## 👥 Team Collaboration

This project is designed for team development with:

- **GitHub Issues** for bug tracking and feature requests
- **Pull Request reviews** for code quality assurance
- **CI/CD pipeline** for automated testing
- **Development history** documentation for context
- **Contributing guidelines** for consistent development practices

### Getting Started for Team Members

1. **Clone the repository:**
   ```bash
   git clone git@github.com:adminhashitlabs/cricket-baroda-scraper.git
   cd cricket-baroda-scraper
   ```

2. **Set up development environment:**
   ```bash
   npm install
   npm test  # Verify everything works
   ```

3. **Read the development context:**
   ```bash
   cat DEVELOPMENT_HISTORY.md  # Understand project history
   cat CONTRIBUTING.md         # Learn contribution guidelines
   ```

4. **Start developing:**
   ```bash
   npm run cli players  # Test player extraction
   npm run cli match    # Test match scraping
   ```

## 🌐 API for Agent Integration

The project includes a REST API for seamless agent integration:

```bash
# Start the API server
npm run api

# API will be available at http://localhost:3000
```

### API Endpoints
- `GET /health` - Health check
- `GET /api/players` - Extract player data
- `POST /api/match` - Extract match data with commentary

See **[API Documentation](API.md)** for complete integration guide and examples.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Update documentation
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Browser Launch Failed**
   - Ensure Chrome/Chromium is installed
   - Check system permissions
   - Try `headless: false` for debugging

2. **Tournament Not Found**
   - Verify tournament URL is correct
   - Check if tournament page structure changed
   - Update selectors in platform implementation

3. **API Connection Failed**
   - Verify API_BASE_URL is correct
   - Check network connectivity
   - Review API authentication

### Debug Mode
Enable detailed logging:
```bash
LOG_LEVEL=debug npm run scrape:pipeline
```

## 📞 Support

- Open GitHub issues for bugs/features
- Check troubleshooting section
- Review configuration examples
- Examine test cases for usage patterns