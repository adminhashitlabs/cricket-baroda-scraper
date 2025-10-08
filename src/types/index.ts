/**
 * Main data structure for scraped cricket match information
 *
 * Contains all extracted data from a cricket match including match details,
 * team information, player data, and ball-by-ball commentary.
 */
export interface ScrapedData {
  /** Page title from the scraped website */
  title: string;
  /** Official match title/name */
  matchTitle: string;
  /** Name of the first team */
  team1: string;
  /** Name of the second team */
  team2: string;
  /** Current score of team 1 */
  score1: string;
  /** Current score of team 2 */
  score2: string;
  /** Current match status (e.g., "in progress", "completed") */
  status: string;
  /** Venue where the match is being played */
  venue: string;
  /** Match date */
  date: string;
  /** List of player names involved in the match */
  players: string[];
  /** Detailed data for each innings */
  innings: InningData[];
  /** Team information with IDs and metadata */
  teams: Team[];
  /** Detailed player statistics and information */
  playersData: Player[];
  /** Ball-by-ball commentary data */
  commentary: BallData[];
}

/**
 * Represents a cricket team in the match
 */
export interface Team {
  /** Full name of the team */
  name: string;
  /** Unique identifier for the team */
  id: string;
  /** Internal identifier used by the website */
  pillId: string;
}

/**
 * Represents a cricket player
 */
export interface Player {
  /** Full name of the player */
  name: string;
  /** Unique identifier for the player */
  id: string;
  /** ID of the team this player belongs to */
  teamId: string;
}

/**
 * Detailed information about a single ball in cricket commentary
 *
 * Contains all relevant data for a single delivery including runs scored,
 * players involved, and any wicket information.
 */
export interface BallData {
  /** Over number (0-based) */
  over: number;
  /** Ball number within the over (1-6) */
  ball: number;
  /** Runs scored on this ball */
  runs: number;
  /** Name of the bowler */
  bowler: string;
  /** Name of the batter facing the ball */
  batter: string;
  /** Unique ID of the bowler (optional) */
  bowlerId?: string;
  /** Unique ID of the batter (optional) */
  batterId?: string;
  /** Text description of the ball/event */
  description: string;
  /** ID of the team that was batting */
  teamId: string;
  /** Wicket information if a wicket fell on this ball */
  wicketInfo?: WicketInfo;
}

/**
 * Detailed information about a wicket that fell
 *
 * Contains comprehensive data about how a batsman got out including
 * the type of dismissal and players involved.
 */
export interface WicketInfo {
  /** Type of wicket (bowled, caught, lbw, stumped, run out, etc.) */
  wicketType: string;
  /** Name of the player who got out */
  playerName: string;
  /** Name of the bowler who took the wicket (for applicable dismissals) */
  bowler?: string;
  /** Name of the fielder who caught/took the wicket (for applicable dismissals) */
  fielder?: string;
  /** Batting statistics of the player who got out */
  battingStats: {
    /** Total runs scored by the player */
    runs: number;
    /** Number of balls faced */
    balls: number;
    /** Number of fours hit */
    fours: number;
    /** Number of sixes hit */
    sixes: number;
    /** Batting strike rate */
    strikeRate: number;
  };
}

export interface OverSummary {
  /** Over number (0-based) */
  over: number;
  /** Name of the bowler for this over */
  bowler: string;
  /** Unique ID of the bowler (optional) */
  bowlerId?: string;
  /** Total runs scored in this over */
  runs: number;
  /** Number of wickets taken in this over */
  wickets: number;
  /** Number of balls bowled in this over */
  balls: number;
  /** Number of maiden overs (overs with 0 runs) */
  maidens: number;
  /** Bowler's economy rate */
  economy: number;
  /** Text summary of the over */
  summary: string;
  /** ID of the team that was bowling */
  teamId: string;
}

export interface InningData {
  /** Unique identifier of the team batting in this innings */
  teamId: string;
  /** Name of the team batting in this innings */
  teamName: string;
  /** Summary data for each over in this innings */
  overs: OverSummary[];
  /** Ball-by-ball data for this innings */
  balls: BallData[];
  /** Total runs scored in this innings */
  totalRuns: number;
  /** Total wickets fallen in this innings */
  totalWickets: number;
  /** Total overs completed in this innings */
  totalOvers: number;
}

export interface ApiResponse<T> {
  /** Whether the API request was successful */
  success: boolean;
  /** The response data */
  data: T;
  /** Optional message providing additional information */
  message?: string;
}
