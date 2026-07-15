/**
 * Spintax utility functions for detecting and parsing spintax patterns
 * Format: {{spin.Option1|Option2|Option3}}
 */

export interface SpintaxMatch {
  fullMatch: string;
  options: string[];
  startIndex: number;
  endIndex: number;
}

/**
 * Regex pattern to match spintax: {{spin.Option1|Option2|Option3}}
 */
export const SPINTAX_REGEX = /\{\{spin\.([^}]+)\}\}/g;

/**
 * Finds all spintax matches in a string
 */
export function findSpintaxMatches(text: string): SpintaxMatch[] {
  const matches: SpintaxMatch[] = [];
  let match;
  
  // Reset regex lastIndex to ensure we start from the beginning
  SPINTAX_REGEX.lastIndex = 0;
  
  while ((match = SPINTAX_REGEX.exec(text)) !== null) {
    const fullMatch = match[0];
    const optionsString = match[1];
    const options = optionsString.split('|').map(opt => opt.trim());
    
    matches.push({
      fullMatch,
      options,
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
    });
  }
  
  return matches;
}

/**
 * Checks if a string contains spintax
 */
export function hasSpintax(text: string): boolean {
  SPINTAX_REGEX.lastIndex = 0;
  return SPINTAX_REGEX.test(text);
}

/**
 * Formats spintax for display (shows all options separated by /)
 */
export function formatSpintaxForDisplay(options: string[]): string {
  return options.join(' / ');
}

