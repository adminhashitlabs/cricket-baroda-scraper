# Contributing to Cricket Baroda Scraper

Thank you for your interest in contributing to the Cricket Baroda Scraper project! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/cricket-baroda-scraper.git
   cd cricket-baroda-scraper
   ```
3. **Set up the development environment**:
   ```bash
   npm install
   npm test  # Run tests
   npm run lint  # Check code quality
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📋 Development Workflow

### 1. Choose an Issue
- Check the [Issues](https://github.com/adminhashitlabs/cricket-baroda-scraper/issues) page
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it

### 2. Create a Feature Branch
```bash
git checkout -b feature/descriptive-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Your Changes
- Write clear, concise commit messages
- Follow the existing code style
- Add tests for new features
- Update documentation as needed

### 4. Test Your Changes
```bash
npm test                    # Run all tests
npm run lint               # Check code quality
npm run build              # Ensure TypeScript compiles
npm run cli players        # Test player extraction
npm run cli match          # Test match extraction
```

### 5. Submit a Pull Request
- Push your branch to your fork
- Create a Pull Request from your branch to `main`
- Fill out the PR template with details about your changes
- Link to any related issues

## 🛠️ Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Testing
- Write unit tests for new features
- Ensure all tests pass before submitting PR
- Test with real data when possible
- Mock external dependencies appropriately

### Documentation
- Update README.md for significant changes
- Add JSDoc comments for new functions
- Update CLI help text if adding new commands

## 📁 Project Structure

```
cricket-baroda-scraper/
├── src/                    # TypeScript source code
│   ├── platforms/         # Platform-specific scrapers
│   ├── types/            # TypeScript type definitions
│   └── *.ts              # Core modules
├── __tests__/            # Test files
├── cli.js                # Command-line interface
├── complete-match-structured.js  # Main match scraper
├── extract-players.js    # Player extraction script
└── package.json          # Project configuration
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run test suite |
| `npm run lint` | Check code quality |
| `npm run build` | Compile TypeScript |
| `npm run cli players` | Extract player data |
| `npm run cli match` | Extract match data |
| `npm run cli test` | Run tests via CLI |

## 🐛 Reporting Issues

- Use GitHub Issues to report bugs
- Include detailed steps to reproduce
- Provide sample URLs when reporting scraping issues
- Include error messages and stack traces

## 💡 Feature Requests

- Open an issue with the `enhancement` label
- Describe the feature and its use case
- Consider if the feature fits the project scope

## 📝 Commit Message Guidelines

Use clear, descriptive commit messages:

```
feat: add support for tournament scraping
fix: resolve ball numbering bug in commentary
docs: update README with new CLI commands
test: add unit tests for player extraction
```

## 🤝 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers learn and contribute
- Maintain professional communication

## 📞 Getting Help

- Check existing issues and documentation first
- Ask questions in GitHub Discussions
- Reach out to maintainers for guidance

Thank you for contributing to the Cricket Baroda Scraper! 🏏
