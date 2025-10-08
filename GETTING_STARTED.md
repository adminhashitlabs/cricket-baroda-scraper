# 🚀 Getting Started with Cricket Baroda Scraper

Welcome to the Cricket Baroda Scraper! This comprehensive guide will help you set up and start using our cricket data extraction system. Whether you're a developer, data analyst, or agent looking to integrate cricket data, this guide covers everything you need to know.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Integration](#api-integration)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Chrome/Chromium** browser (for Puppeteer)

### System Requirements
- **Operating System**: macOS, Linux, or Windows
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 500MB free space
- **Internet**: Stable connection for web scraping

### Verify Installation
```bash
# Check Node.js version
node --version
# Should show: v18.x.x or higher

# Check npm version
npm --version
# Should show: 9.x.x or higher

# Check Git version
git --version
# Should show: 2.x.x or higher
```

## ⚡ Quick Start

Get up and running in 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/adminhashitlabs/cricket-baroda-scraper.git
cd cricket-baroda-scraper

# 2. Install dependencies
npm install

# 3. Run tests to verify setup
npm test

# 4. Extract player data
npm run extract:players

# 5. Start the API server
npm run api
```

That's it! Your cricket scraper is ready to use.

## 📦 Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/adminhashitlabs/cricket-baroda-scraper.git
cd cricket-baroda-scraper
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install all required dependencies including:
- **Puppeteer**: For browser automation
- **Express**: For API server
- **Jest**: For testing
- **ESLint**: For code quality

### Step 3: Verify Installation
```bash
# Run the test suite
npm test

# Check code quality
npm run lint
```

## ⚙️ Configuration

### Environment Variables
Create a `.env` file in the project root (optional):

```bash
# API Configuration
PORT=3000

# Logging
LOG_LEVEL=info

# Scraping Configuration
HEADLESS=true
TIMEOUT=30000
```

### Browser Setup
The scraper uses Puppeteer which requires Chrome/Chromium:

```bash
# On macOS (if not installed)
brew install --cask google-chrome

# On Ubuntu/Debian
sudo apt-get install google-chromium-browser

# On Windows: Chrome is usually pre-installed
```

## 🎯 Usage

### Command Line Interface (CLI)

The project includes a convenient CLI for common operations:

```bash
# Show all available commands
npm run cli

# Extract player data
npm run cli players

# Extract match data
npm run cli match

# Run tests
npm run cli test
```

### Direct Script Execution

#### Extract Player Data
```bash
# Extract players from cricket matches
npm run extract:players

# This will:
# - Launch a browser
# - Navigate to a sample match
# - Extract all player information
# - Save data to players-data.json
```

#### Extract Match Data
```bash
# Extract complete match information
npm run extract:match

# This will:
# - Launch a browser
# - Navigate to a sample match
# - Extract ball-by-ball commentary
# - Save structured data to JSON
```

### Advanced Scraping

#### Single Match Scraping
```bash
# Scrape a specific match
npm run build
MATCH_URL="https://www.cricketbaroda.com/match/YOUR_MATCH_ID" npm run scrape:single
```

#### Tournament Scraping
```bash
# Scrape all matches from a tournament
npm run build
TOURNAMENT_URL="https://www.cricketbaroda.com/tournament/YOUR_TOURNAMENT_ID" npm run scrape:tournament
```

#### Multiple Matches
```bash
# Scrape multiple specific matches
npm run build
URLS="https://match1.com,https://match2.com" npm run scrape:matches
```

## 🌐 API Integration

### Start the API Server
```bash
# Production mode
npm run api

# Development mode (auto-restart)
npm run api:dev
```

The API will be available at: `http://localhost:3000`

### API Endpoints

#### Health Check
```bash
curl http://localhost:3000/health
```

#### Extract Players
```bash
curl http://localhost:3000/api/players
```

#### Extract Match Data
```bash
curl -X POST http://localhost:3000/api/match \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.cricketbaroda.com/match/YOUR_MATCH_ID"}'
```

### Agent Integration Examples

#### Python Agent
```python
import requests

# Health check
response = requests.get('http://localhost:3000/health')
print(f"API Status: {response.json()}")

# Extract players
players_response = requests.get('http://localhost:3000/api/players')
players_data = players_response.json()

# Extract match
match_url = "https://www.cricketbaroda.com/match/YOUR_MATCH_ID"
match_response = requests.post('http://localhost:3000/api/match',
                              json={'url': match_url})
match_data = match_response.json()
```

#### JavaScript Agent
```javascript
// Health check
const health = await fetch('http://localhost:3000/health');
const healthData = await health.json();

// Extract players
const players = await fetch('http://localhost:3000/api/players');
const playersData = await players.json();

// Extract match
const matchResponse = await fetch('http://localhost:3000/api/match', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.cricketbaroda.com/match/YOUR_MATCH_ID'
  })
});
const matchData = await matchResponse.json();
```

## 💻 Development

### Project Structure
```
cricket-baroda-scraper/
├── src/                    # Source code
│   ├── api.js             # REST API server
│   ├── scraper.ts         # Main scraper logic
│   └── logger.ts          # Logging utilities
├── extract-players.js     # Player extraction script
├── complete-match-structured.js  # Match extraction script
├── cli.js                 # Command line interface
├── __tests__/             # Test files
├── package.json           # Dependencies and scripts
└── docs/                  # Documentation
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   ```bash
   # Edit files
   # Add tests
   # Update documentation
   ```

3. **Run tests and linting**
   ```bash
   npm test
   npm run lint
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: Add your feature description"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

### Code Quality
```bash
# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format

# Run tests with coverage
npm run test:coverage
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Specific Tests
```bash
# Run tests for a specific file
npm test -- __tests__/scraper.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="player extraction"
```

### Test Coverage
```bash
npm run test:coverage
```

This generates a coverage report in the `coverage/` directory.

## 🔧 Troubleshooting

### Common Issues

#### 1. Browser Launch Failed
**Error:** `Browser launch failed`
**Solution:**
```bash
# Install Chrome/Chromium
# macOS
brew install --cask google-chrome

# Ubuntu
sudo apt-get install google-chromium-browser

# Or run in non-headless mode for debugging
HEADLESS=false npm run extract:players
```

#### 2. API Server Won't Start
**Error:** `Port already in use`
**Solution:**
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run api
```

#### 3. Timeout Errors
**Error:** `Navigation timeout`
**Solution:**
```bash
# Increase timeout
TIMEOUT=60000 npm run extract:players
```

#### 4. Permission Errors
**Error:** `Permission denied`
**Solution:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

#### 5. Module Not Found
**Error:** `Cannot find module`
**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode
Enable detailed logging for troubleshooting:

```bash
# Set log level to debug
LOG_LEVEL=debug npm run extract:players

# Run with verbose output
DEBUG=* npm run api
```

### Getting Help

1. **Check the logs** - Look for error messages in console output
2. **Run tests** - Ensure your environment is set up correctly
3. **Check documentation** - Review API.md and DEVELOPMENT_HISTORY.md
4. **Open an issue** - Report bugs on GitHub with detailed information

## 🚀 Next Steps

### For Data Analysts
- Explore the extracted JSON data structures
- Build data visualization dashboards
- Create cricket statistics reports
- Set up automated data pipelines

### For Developers
- Extend the scraper for additional cricket websites
- Add new API endpoints
- Implement data caching and storage
- Create web interfaces for data exploration

### For Teams
- Set up continuous integration
- Configure deployment pipelines
- Implement monitoring and alerting
- Create team documentation

### Advanced Usage
- **Batch Processing**: Process multiple tournaments automatically
- **Data Integration**: Connect with databases and analytics tools
- **Real-time Scraping**: Set up scheduled data collection
- **API Integration**: Build applications that consume cricket data

## 📚 Additional Resources

- **[README.md](README.md)** - Project overview and architecture
- **[API.md](API.md)** - Complete API documentation
- **[DEVELOPMENT_HISTORY.md](DEVELOPMENT_HISTORY.md)** - Project timeline and decisions
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

## 🎯 Success Metrics

After following this guide, you should be able to:

- ✅ Install and configure the scraper
- ✅ Extract player data from cricket matches
- ✅ Extract ball-by-ball commentary
- ✅ Run the API server for agent integration
- ✅ Write and run tests
- ✅ Debug common issues
- ✅ Contribute to the project

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/adminhashitlabs/cricket-baroda-scraper/issues)
- **Discussions**: [GitHub Discussions](https://github.com/adminhashitlabs/cricket-baroda-scraper/discussions)
- **Documentation**: Check the `docs/` folder for detailed guides

---

**Happy scraping! 🏏**

*Built with ❤️ for cricket data enthusiasts*</content>
<parameter name="filePath">/Users/shreyasraut/Downloads/Agent Sample/web-scraper-app/GETTING_STARTED.md
