/**
 * Certification level from percentage score (GreenCo Scoreband / View Certificate).
 * Ranges: Certified ≥35–45%, Bronze 45–55%, Silver 55–65%, Gold 65–75%, Platinum 75–85%, Platinum+ ≥85%.
 * Matches Laravel app/helpers/helpers.php getCertificationType().
 */
export function getCertificationType(percentage: number): string {
  if (percentage >= 85) return 'Platinum+';
  if (percentage >= 75) return 'Platinum';
  if (percentage >= 65) return 'Gold';
  if (percentage >= 55) return 'Silver';
  if (percentage >= 45) return 'Bronze';
  if (percentage >= 35) return 'Certified';
  return 'Below Certified';
}

/** Certification bands for UI (LEVEL vs percentage range). */
export const CERTIFICATION_BANDS = [
  { level: 'Certified', range: '≥35–45%', min: 35, max: 45 },
  { level: 'Bronze', range: '45–55%', min: 45, max: 55 },
  { level: 'Silver', range: '55–65%', min: 55, max: 65 },
  { level: 'Gold', range: '65–75%', min: 65, max: 75 },
  { level: 'Platinum', range: '75–85%', min: 75, max: 85 },
  { level: 'Platinum+', range: '≥85%', min: 85, max: 100 },
] as const;
