// All rating maths lives here. Keeping the numbers in one file means tuning
// the economy later is a single edit rather than a hunt through actions.

export const WIN_POINTS = {
  EASY: 7,
  MEDIUM: 10,
  HARD: 15,
} as const;

export const LOSS_POINTS = {
  EASY: 3,
  MEDIUM: 5,
  HARD: 10,
} as const;

export const STARTING_RATING = 1000;

// Nobody drops below this. Without a floor, a bad week could put someone
// deep in the negatives and make the number feel punishing rather than
// informative.
export const RATING_FLOOR = 0;

export type Difficulty = keyof typeof WIN_POINTS;

export function winDelta(difficulty: Difficulty) {
  return WIN_POINTS[difficulty];
}

export function lossDelta(difficulty: Difficulty) {
  return -LOSS_POINTS[difficulty];
}

export function applyDelta(current: number, delta: number) {
  return Math.max(RATING_FLOOR, current + delta);
}
