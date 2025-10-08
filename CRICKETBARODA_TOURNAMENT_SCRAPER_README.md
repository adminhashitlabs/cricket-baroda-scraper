# CricketBaroda Tourn### 🔍 **Team Extraction Strategy**
CricketBaroda tournament pages don't always have a dedicated "Teams" tab. The scraper uses a fallback strategy:
1. **Primary**: Look for teams tab and extract from team elements
2. **Fallback**: Extract teams from match URLs (format: `/match/123/Team1-vs-Team2`)
3. **URL Parsing**: Decode team names from URL slugs and convert to readable format

### 📄 **Pagination Support**
The scraper handles multi-page tournament listings:
- **Tab Navigation**: Automatically navigates to "MATCHES" tab to display match cards
- **Pagination Detection**: Identifies pagination controls and calculates total pages
- **Multi-Page Extraction**: Iterates through all pages to collect teams from every match
- **Duplicate Prevention**: Uses Set/Map to avoid duplicate team entries across pages
- **Robust Navigation**: Handles various pagination UI patterns (buttons, links, etc.)

**Current Implementation**: Successfully extracts teams from single-page tournaments and is ready for multi-page tournaments when they occur. Scraper

A specialized, comprehensive scraper for extracting cricket tournament data from the CricketBaroda website. This scraper handles the unique structure of CricketBaroda's tournament pages and provides modular, reusable components for tournament data extraction.

## Features

### 🏏 **Comprehensive Tournament Data Extraction**
- **Tournament Metadata**: Name, duration, format, organizer, venue, status
- **Participating Teams**: Complete list of teams with URLs and basic info
- **Team Rosters**: Player lists for each team with roles and IDs
- **Match Information**: All matches with teams, status, dates, and venues
- **Match Players**: Players who actually participated in specific matches

### 🎯 **Specialized CricketBaroda Handling**
- **Tournament List Page**: Extract tournaments with year filtering (2024-25, 2023-24, etc.)
- **Year Filtering**: Apply filters to get tournaments for specific seasons
- **Tab Navigation**: Automatic navigation to teams and matches tabs
- **Team Links**: Click team pills/buttons to access detailed team information
- **Player Identification**: Reuse existing team ID and player identification logic
- **Team Extraction from Matches**: When no dedicated teams tab exists, extracts teams from match URLs

### 🔍 **Team Extraction Strategy**
CricketBaroda tournament pages don't always have a dedicated "Teams" tab. The scraper uses a fallback strategy:
1. **Primary**: Look for teams tab and extract from team elements
2. **Fallback**: Extract teams from match card URLs (format: `/match/123/Team1-vs-Team2`)
3. **URL Parsing**: Decode team names from URL slugs and convert to readable format

This ensures comprehensive team discovery even when the page structure varies.

### 🔧 **Modular Architecture**
- **Independent Components**: Each extraction method is self-contained
- **Reusable Logic**: Components can be used independently or together
- **Plug and Play**: Easy integration with existing data pipelines
- **Error Handling**: Comprehensive error handling and logging

## Usage

### Basic Tournament Scraper

```typescript
import { CricketBarodaTournamentScraper } from './src/platforms/cricket-baroda-tournament-scraper';

const scraper = new CricketBarodaTournamentScraper();

// Initialize
await scraper.initialize();

// Extract tournament list for a specific year
const tournaments = await scraper.extractTournamentList('2024-25');

// Get comprehensive tournament information
const tournamentInfo = await scraper.getComprehensiveTournamentInfo(tournamentUrl);

// Extract participating teams
const teams = await scraper.extractTournamentTeams(tournamentUrl);

// Extract team roster
const roster = await scraper.extractTeamRoster(teamUrl, teamName);

// Extract matches
const matches = await scraper.scrapeTournamentMatches(tournamentUrl);

// Extract match players
const matchPlayers = await scraper.extractMatchPlayers(matchUrl, matchInfo);

// Clean up
await scraper.cleanup();
```

### Platform Integration

```typescript
import { CricketBarodaPlatform } from './src/platforms/cricket-baroda-platform';
import { DataPipeline } from './src/platforms/data-pipeline';

const platform = new CricketBarodaPlatform({
    name: 'cricketbaroda',
    baseUrl: 'https://www.cricketbaroda.com'
});

const pipelineConfig = {
    platform: 'cricketbaroda',
    mode: 'tournament',
    urls: ['https://www.cricketbaroda.com/tournament/1500003/...'],
    processing: {
        validate: true,
        transform: true,
        sendToApi: false,
        storeLocally: true,
        continueOnError: true
    },
    errorHandling: {
        continueOnError: true,
        maxRetries: 3,
        retryDelay: 1000
    },
    output: {
        directory: './output',
        filePattern: 'cricketbaroda-{type}-{id}-{timestamp}.json'
    }
};

const pipeline = new DataPipeline(platform, pipelineConfig);
const result = await pipeline.execute();
```

## API Reference

### CricketBarodaTournamentScraper

#### Methods

- `initialize()`: Initialize the scraper with browser setup
- `cleanup()`: Clean up browser resources
- `extractTournamentList(year?)`: Extract tournament list with optional year filtering
- `getComprehensiveTournamentInfo(url)`: Get complete tournament metadata
- `extractTournamentTeams(url)`: Extract participating teams
- `extractTeamRoster(teamUrl, teamName)`: Extract team player roster
- `scrapeTournamentMatches(url)`: Extract all tournament matches
- `extractMatchPlayers(matchUrl, matchInfo)`: Extract players from specific match
- `getTournamentInfo(url)`: Get basic tournament information

### Data Structures

#### TournamentInfo
```typescript
interface TournamentInfo {
    id: string;
    name: string;
    organizer?: string;
    format?: string;
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
    startDate?: string;
    endDate?: string;
    venue?: string;
    totalTeams?: number;
    totalMatches?: number;
    url: string;
    metadata?: Record<string, any>;
}
```

#### TournamentTeam
```typescript
interface TournamentTeam {
    id: string;
    name: string;
    url?: string;
    logoUrl?: string;
    captain?: string;
    coach?: string;
    location?: string;
    stats?: TeamStats;
    players?: MatchPlayer[];
}
```

#### MatchPlayer
```typescript
interface MatchPlayer {
    id: string;
    name: string;
    teamId: string;
    role: string;
    isCaptain?: boolean;
    isWicketKeeper?: boolean;
    battingPosition?: number;
    bowlingStyle?: string;
}
```

## Examples

### Complete Workflow Example

```bash
# Run tournament scraper example
npm run ts-node cricket-baroda-examples.ts -- --tournament

# Run platform integration example
npm run ts-node cricket-baroda-examples.ts -- --platform

# Run complete workflow
npm run ts-node cricket-baroda-examples.ts -- --workflow
```

### Test the Implementation

```bash
# Run CricketBaroda scraper tests
npm run ts-node test-cricket-baroda-scraper.ts
```

## CricketBaroda Page Structure

The scraper is designed to handle CricketBaroda's specific page structure:

### Tournament List Page
- URL: `https://www.cricketbaroda.com/match-center/tournaments`
- Features year selector dropdown
- Tournament cards with links to individual tournaments

### Individual Tournament Page
- URL: `https://www.cricketbaroda.com/tournament/{id}/{name}`
- Tabs: Matches, Statistics, Teams
- Tournament metadata in header
- Duration/format information

### Teams Tab
- Team pills/buttons for each participating team
- Clickable team links leading to team detail pages
- Scrollable list for large tournaments

### Team Detail Page
- Player roster with roles
- Team information and statistics
- Player IDs and identification data

### Matches Tab
- Match cards with team information
- Match status and dates
- Links to individual match pages
- Player of the match information

## Error Handling

The scraper includes comprehensive error handling:

- **Network Errors**: Automatic retry with configurable attempts
- **Page Load Failures**: Fallback selectors and alternative approaches
- **Missing Elements**: Graceful degradation with partial data extraction
- **Browser Issues**: Proper cleanup and resource management
- **Data Validation**: Integrity checks and error reporting

## Logging

Comprehensive logging throughout the scraping process:

- **Operation Tracking**: Start/end of each major operation
- **Progress Updates**: Extraction progress and counts
- **Error Details**: Specific error information with context
- **Performance Metrics**: Timing and resource usage

## Dependencies

- **Puppeteer**: Browser automation for web scraping
- **TypeScript**: Type-safe development
- **Custom Logger**: Structured logging system
- **Error Handling**: Comprehensive error management

## Contributing

The scraper is designed with modularity in mind:

1. **Add New Selectors**: Update selector arrays for new page structures
2. **Extend Data Extraction**: Add new fields to interfaces and extraction methods
3. **Improve Error Handling**: Enhance retry logic and fallback mechanisms
4. **Add New Features**: Implement additional extraction capabilities

## Testing

Run the test suite to validate functionality:

```bash
npm run ts-node test-cricket-baroda-scraper.ts
```

Tests cover:
- Tournament list extraction
- Comprehensive tournament info
- Team extraction and roster
- Match extraction and player data
- Platform integration
- Error handling scenarios

## License

This scraper is part of the cricket data extraction system and follows the project's licensing terms.
