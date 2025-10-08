#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const commands = {
    'players': 'extract-players.js',
    'match': 'complete-match-structured.js',
    'test': 'npm test',
    'lint': 'npm run lint',
    'build': 'npm run build'
};

function showHelp() {
    console.log(`
🏏 Cricket Baroda Web Scraper CLI

Usage: node cli.js <command>

Commands:
  players    Extract player data from teams tab
  match      Extract complete match data with commentary
  test       Run test suite
  lint       Run ESLint
  build      Build TypeScript to JavaScript

Examples:
  node cli.js players    # Extract all players
  node cli.js match      # Extract complete match data
  node cli.js test       # Run tests
  node cli.js lint       # Check code quality

For more advanced usage, see the individual scripts:
- extract-players.js
- complete-match-structured.js
`);
}

function runCommand(command) {
    const script = commands[command];
    if (!script) {
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }

    try {
        console.log(`🚀 Running: ${script}`);
        if (script.startsWith('npm')) {
            execSync(script, { stdio: 'inherit', cwd: process.cwd() });
        } else {
            execSync(`node ${script}`, { stdio: 'inherit', cwd: process.cwd() });
        }
        console.log(`✅ ${command} completed successfully`);
    } catch (error) {
        console.error(`❌ ${command} failed:`, error.message);
        process.exit(1);
    }
}

const command = process.argv[2];

if (!command) {
    showHelp();
    process.exit(0);
}

runCommand(command);
