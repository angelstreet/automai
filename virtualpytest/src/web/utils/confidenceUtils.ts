// Utility functions for calculating confidence scores from execution results
// Used for pathfinding and reliability assessment

export interface ConfidenceData {
  last_run_result?: boolean[];
}

/**
 * Calculate confidence score from last run results
 * @param results Array of boolean results (true=success, false=failure)
 * @returns Confidence score between 0 and 1
 */
export const calculateConfidenceScore = (results?: boolean[]): number => {
  if (!results || results.length === 0) return 0.5; // Default confidence for new items
  const successCount = results.filter(result => result).length;
  return successCount / results.length;
};

/**
 * Update last run results array, keeping only the last 10 results
 * @param currentResults Current array of results
 * @param newResult New result to add
 * @returns Updated array with new result at front, max 10 items
 */
export const updateLastRunResults = (currentResults: boolean[], newResult: boolean): boolean[] => {
  const updatedResults = [newResult, ...currentResults];
  return updatedResults.slice(0, 10); // Keep only last 10 results
};

/**
 * Get confidence category based on score
 * @param confidence Score between 0 and 1
 * @returns Category string
 */
export const getConfidenceCategory = (confidence: number): 'high' | 'medium' | 'low' => {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
};

/**
 * Calculate path confidence score based on all verifications and actions
 * @param verifications Array of verifications with result history
 * @param actions Array of actions with result history
 * @returns Overall path confidence score
 */
export const calculatePathConfidence = (
  verifications: ConfidenceData[] = [],
  actions: ConfidenceData[] = []
): number => {
  const allItems = [...verifications, ...actions];
  
  if (allItems.length === 0) return 0.5; // Default for paths with no tracked items
  
  // Calculate weighted average of all confidence scores
  const scores = allItems.map(item => calculateConfidenceScore(item.last_run_result));
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  return averageScore;
};

/**
 * Get confidence display color based on score
 * @param confidence Score between 0 and 1
 * @returns Material-UI color string
 */
export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'success.main';
  if (confidence >= 0.6) return 'warning.main';
  return 'error.main';
};

/**
 * Format confidence score for display
 * @param confidence Score between 0 and 1
 * @param results Optional results array for additional context
 * @returns Formatted string for UI display
 */
export const formatConfidenceDisplay = (confidence: number, results?: boolean[]): string => {
  const percentage = (confidence * 100).toFixed(0);
  if (!results || results.length === 0) {
    return `${percentage}% (new)`;
  }
  const successCount = results.filter(r => r).length;
  return `${percentage}% (${successCount}/${results.length})`;
};

/**
 * Check if confidence data suggests reliability issues
 * @param results Array of recent results
 * @param threshold Minimum acceptable confidence (default 0.6)
 * @returns true if reliability is concerning
 */
export const hasReliabilityIssues = (results?: boolean[], threshold: number = 0.6): boolean => {
  if (!results || results.length < 3) return false; // Need at least 3 runs to assess
  const confidence = calculateConfidenceScore(results);
  return confidence < threshold;
}; 