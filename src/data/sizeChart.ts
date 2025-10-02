export interface SizeRange {
  size: string;
  shoulderMinCm: number;
  shoulderMaxCm: number;
  torsoMinCm: number;
  torsoMaxCm: number;
}

export const sizeChart: SizeRange[] = [
  { size: "XS", shoulderMinCm: 38.0, shoulderMaxCm: 40.0, torsoMinCm: 48.0, torsoMaxCm: 50.0 },
  { size: "S", shoulderMinCm: 40.0, shoulderMaxCm: 42.0, torsoMinCm: 50.0, torsoMaxCm: 52.0 },
  { size: "M", shoulderMinCm: 42.0, shoulderMaxCm: 44.0, torsoMinCm: 52.0, torsoMaxCm: 54.0 },
  { size: "L", shoulderMinCm: 44.0, shoulderMaxCm: 46.0, torsoMinCm: 54.0, torsoMaxCm: 56.0 },
  { size: "XL", shoulderMinCm: 46.0, shoulderMaxCm: 48.0, torsoMinCm: 56.0, torsoMaxCm: 58.0 },
  { size: "XXL", shoulderMinCm: 48.0, shoulderMaxCm: 50.0, torsoMinCm: 58.0, torsoMaxCm: 60.0 },
  { size: "XXXL", shoulderMinCm: 50.0, shoulderMaxCm: 52.0, torsoMinCm: 60.0, torsoMaxCm: 62.0 },
];

export const estimateSize = (shoulder: number, torso: number, tolerance: number = 4.0): string => {
  let bestMatch: string | null = null;
  let bestDistance = Infinity;
  const matches: Array<{ size: string; distance: number }> = [];

  for (const row of sizeChart) {
    const shoulderMid = (row.shoulderMinCm + row.shoulderMaxCm) / 2;
    const torsoMid = (row.torsoMinCm + row.torsoMaxCm) / 2;

    if (
      shoulder >= row.shoulderMinCm - tolerance &&
      shoulder <= row.shoulderMaxCm + tolerance &&
      torso >= row.torsoMinCm - tolerance &&
      torso <= row.torsoMaxCm + tolerance
    ) {
      const distance = Math.sqrt(
        Math.pow(shoulder - shoulderMid, 2) +
        Math.pow(torso - torsoMid, 2)
      );

      matches.push({ size: row.size, distance });

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = row.size;
      }
    }
  }

  if (matches.length === 0) {
    return "Unknown";
  }

  return bestMatch || "Unknown";
};
