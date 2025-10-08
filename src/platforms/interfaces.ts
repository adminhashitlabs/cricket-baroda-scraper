import { ScrapedData, Team, Player } from '../types';

/**
 * Configuration for a cricket platform
 */
export interface PlatformConfig {
  /** Name of the platform (e.g., 'cricketbaroda', 'espncricinfo') */
  name: string;
  /** Base URL of the platform */
  baseUrl: string;
  /** Platform-specific configuration options */
  options?: Record<string, any>;
}

/**
 * Represents a cricket match with basic information
 */
export interface MatchInfo {
  /** Unique identifier for the match */
  id: string;
  /** URL to the match page */
  url: string;
  /** Name/title of the match */
  title: string;
  /** Name of team 1 */
  team1: string;
  /** Name of team 2 */
  team2: string;
  /** Current status of the match */
  status: string;
  /** Tournament/series name */
  tournament?: string;
  /** Match date */
  date?: string;
  /** Venue information */
  venue?: string;
}

/**
 * Represents a cricket tournament with comprehensive metadata
 */
export interface TournamentInfo {
  /** Unique identifier for the tournament */
  id: string;
  /** Full name of the tournament */
  name: string;
  /** Tournament organizer/series name */
  organizer?: string;
  /** Tournament format (T20, ODI, Test, etc.) */
  format?: string;
  /** Tournament status */
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  /** Start date of the tournament */
  startDate?: string;
  /** End date of the tournament */
  endDate?: string;
  /** Venue/location information */
  venue?: string;
  /** Total number of teams participating */
  totalTeams?: number;
  /** Total number of matches */
  totalMatches?: number;
  /** Tournament URL */
  url: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Represents a team participating in a tournament
 */
export interface TournamentTeam {
  /** Unique identifier for the team */
  id: string;
  /** Full name of the team */
  name: string;
  /** Team URL for detailed information */
  url?: string;
  /** Team logo URL */
  logoUrl?: string;
  /** Team captain */
  captain?: string;
  /** Team coach */
  coach?: string;
  /** Team city/state */
  location?: string;
  /** Tournament-specific team statistics */
  stats?: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    points: number;
    netRunRate: number;
  };
  /** Team roster - players in the squad */
  players?: MatchPlayer[];
}

/**
 * Enhanced match information with tournament context
 */
export interface TournamentMatchInfo extends MatchInfo {
  /** Tournament this match belongs to */
  tournamentId: string;
  /** Match number in the tournament */
  matchNumber?: number;
  /** Round/stage of the tournament */
  round?: string;
  /** Match format */
  format?: string;
  /** Match venue */
  venue?: string;
  /** Match date and time */
  dateTime?: string;
  /** Match result/status */
  result?: string;
  /** Players who actually played in this match */
  playersInMatch?: MatchPlayer[];
}

/**
 * Player information for a specific match
 */
export interface MatchPlayer {
  /** Player ID */
  id: string;
  /** Player name */
  name: string;
  /** Team the player belongs to */
  teamId: string;
  /** Role in the match (batter, bowler, all-rounder, wicket-keeper) */
  role: string;
  /** Whether the player was captain */
  isCaptain?: boolean;
  /** Whether the player was wicket-keeper */
  isWicketKeeper?: boolean;
  /** Batting position (if applicable) */
  battingPosition?: number;
  /** Bowling style */
  bowlingStyle?: string;
  /** Batting style */
  battingStyle?: string;
}

/**
 * Interface for scraping individual match data
 */
export interface MatchScraper {
  /**
   * Scrape detailed data from a specific match URL
   * @param matchUrl - URL of the match to scrape
   * @returns Promise resolving to scraped match data
   */
  scrapeMatch(matchUrl: string): Promise<ScrapedData>;

  /**
   * Extract basic match information from a match URL
   * @param matchUrl - URL of the match
   * @returns Promise resolving to basic match info
   */
  getMatchInfo(matchUrl: string): Promise<MatchInfo>;
}

/**
 * Interface for scraping tournament/series pages to get match lists
 */
export interface TournamentScraper {
  /**
   * Initialize the tournament scraper
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;

  /**
   * Clean up tournament scraper resources
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup(): Promise<void>;

  /**
   * Scrape all matches from a tournament page
   * @param tournamentUrl - URL of the tournament page
   * @returns Promise resolving to list of matches
   */
  scrapeTournamentMatches(tournamentUrl: string): Promise<MatchInfo[]>;

  /**
   * Get tournament/series information
   * @param tournamentUrl - URL of the tournament
   * @returns Promise resolving to tournament info
   */
  getTournamentInfo(tournamentUrl: string): Promise<{
    name: string;
    matches: MatchInfo[];
    status: string;
  }>;

  /**
   * Get comprehensive tournament information including metadata, teams, and matches
   * @param tournamentUrl - URL of the tournament
   * @returns Promise resolving to comprehensive tournament data
   */
  getComprehensiveTournamentInfo(tournamentUrl: string): Promise<TournamentInfo>;

  /**
   * Extract participating teams from tournament page
   * @param tournamentUrl - URL of the tournament
   * @returns Promise resolving to list of teams
   */
  extractTournamentTeams(tournamentUrl: string): Promise<TournamentTeam[]>;

  /**
   * Extract team roster from team page or tournament context
   * @param teamUrl - URL of the team page
   * @param teamName - Name of the team
   * @returns Promise resolving to team roster
   */
  extractTeamRoster(teamUrl: string, teamName: string): Promise<TournamentTeam>;

  /**
   * Extract players who actually played in a specific match
   * @param matchUrl - URL of the match
   * @param matchInfo - Basic match information
   * @returns Promise resolving to match players
   */
  extractMatchPlayers(matchUrl: string, matchInfo: MatchInfo): Promise<MatchPlayer[]>;
}

/**
 * Interface for processing and transforming scraped data
 */
export interface DataProcessor {
  /**
   * Process scraped match data before storage
   * @param data - Raw scraped data
   * @param matchInfo - Basic match information
   * @returns Promise resolving to processed data
   */
  processMatchData(data: ScrapedData, matchInfo: MatchInfo): Promise<ScrapedData>;

  /**
   * Validate scraped data integrity
   * @param data - Data to validate
   * @returns Promise resolving to validation result
   */
  validateData(data: ScrapedData): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * Transform data for external API consumption
   * @param data - Data to transform
   * @param format - Target format (e.g., 'api', 'database')
   * @returns Promise resolving to transformed data
   */
  transformForApi(data: ScrapedData, format: string): Promise<any>;
}

/**
 * Interface for storing processed data
 */
export interface DataStorage {
  /**
   * Store match data
   * @param data - Data to store
   * @param matchInfo - Match information
   * @returns Promise resolving when data is stored
   */
  storeMatchData(data: ScrapedData, matchInfo: MatchInfo): Promise<void>;

  /**
   * Store player data
   * @param players - Player data to store
   * @param matchInfo - Associated match information
   * @returns Promise resolving when data is stored
   */
  storePlayerData(players: Player[], matchInfo: MatchInfo): Promise<void>;

  /**
   * Store team data
   * @param teams - Team data to store
   * @param matchInfo - Associated match information
   * @returns Promise resolving when data is stored
   */
  storeTeamData(teams: Team[], matchInfo: MatchInfo): Promise<void>;

  /**
   * Check if match data already exists
   * @param matchId - Match identifier
   * @returns Promise resolving to existence check result
   */
  matchExists(matchId: string): Promise<boolean>;
}

/**
 * Interface for external API integration
 */
export interface ApiClient {
  /**
   * Send match data to external API
   * @param data - Processed match data
   * @param matchInfo - Match information
   * @returns Promise resolving to API response
   */
  sendMatchData(data: ScrapedData, matchInfo: MatchInfo): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }>;

  /**
   * Send player data to external API
   * @param players - Player data
   * @param matchInfo - Match information
   * @returns Promise resolving to API response
   */
  sendPlayerData(players: Player[], matchInfo: MatchInfo): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }>;

  /**
   * Send team data to external API
   * @param teams - Team data
   * @param matchInfo - Match information
   * @returns Promise resolving to API response
   */
  sendTeamData(teams: Team[], matchInfo: MatchInfo): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }>;
}

/**
 * Main interface for a cricket platform implementation
 */
export interface CricketPlatform {
  /** Platform configuration */
  readonly config: PlatformConfig;

  /** Match scraper instance */
  readonly matchScraper: MatchScraper;

  /** Tournament scraper instance */
  readonly tournamentScraper: TournamentScraper;

  /** Data processor instance */
  readonly dataProcessor: DataProcessor;

  /** Data storage instance */
  readonly dataStorage: DataStorage;

  /** API client instance */
  readonly apiClient: ApiClient;

  /**
   * Initialize the platform
   * @returns Promise resolving when platform is ready
   */
  initialize(): Promise<void>;

  /**
   * Clean up platform resources
   * @returns Promise resolving when cleanup is complete
   */
  cleanup(): Promise<void>;

  /**
   * Check if the platform is ready for use
   * @returns Promise resolving to readiness status
   */
  isReady(): Promise<boolean>;
}

/**
 * Configuration for the data pipeline
 */
export interface PipelineConfig {
  /** Platform to use for scraping */
  platform: string;
  /** Whether to process tournaments or individual matches */
  mode: 'tournament' | 'matches';
  /** URLs to process */
  urls: string[];
  /** Data processing options */
  processing: {
    /** Whether to validate data */
    validate: boolean;
    /** Whether to transform data for API */
    transform: boolean;
    /** Whether to send data to external API */
    sendToApi: boolean;
    /** Whether to store data locally */
    storeLocally: boolean;
  };
  /** Error handling options */
  errorHandling: {
    /** Whether to continue on individual match errors */
    continueOnError: boolean;
    /** Maximum retry attempts */
    maxRetries: number;
    /** Delay between retries in milliseconds */
    retryDelay: number;
  };
  /** Output configuration */
  output: {
    /** Directory for local storage */
    directory: string;
    /** File naming pattern */
    filePattern: string;
  };
}

/**
 * Progress tracking for pipeline execution
 */
export interface PipelineProgress {
  /** Total number of items to process */
  total: number;
  /** Number of items completed */
  completed: number;
  /** Number of items failed */
  failed: number;
  /** Current item being processed */
  current?: string;
  /** Start time */
  startTime: Date;
  /** Estimated completion time */
  estimatedCompletion?: Date;
  /** Processing statistics */
  stats: {
    matchesProcessed: number;
    ballsExtracted: number;
    playersFound: number;
    errors: string[];
  };
}
