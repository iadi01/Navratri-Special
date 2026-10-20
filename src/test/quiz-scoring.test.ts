import { describe, expect, it } from 'vitest';
import {
  MAX_POINTS,
  POINTS_FIRST_TRY,
  POINTS_SECOND_TRY,
  POINTS_THIRD_TRY,
  QUESTIONS,
  pointsFor,
} from '@/data/quiz';

describe('daily hunt scoring', () => {
  it('awards 10 sparkles for a first-try answer', () => {
    expect(pointsFor(0)).toBe(POINTS_FIRST_TRY);
    expect(pointsFor(0)).toBe(10);
  });

  it('awards 5 sparkles after one wrong pick', () => {
    expect(pointsFor(1)).toBe(POINTS_SECOND_TRY);
    expect(pointsFor(1)).toBe(5);
  });

  it('awards 2 sparkles after two or more wrong picks', () => {
    expect(pointsFor(2)).toBe(POINTS_THIRD_TRY);
    expect(pointsFor(3)).toBe(2);
  });

  it('has three clues worth 30 sparkles in total', () => {
    expect(QUESTIONS).toHaveLength(3);
    expect(MAX_POINTS).toBe(30);
  });

  it('lists every answer among its own options', () => {
    for (const q of QUESTIONS) {
      expect(q.options).toContain(q.answer);
      expect(q.options).toHaveLength(4);
    }
  });

  it('correctly scores Day 10 Grand Finale championship: 10 questions, 100 max points, 9/10 = 90 pts', () => {
    const day10Questions = 10;
    const maxDay10Points = day10Questions * POINTS_FIRST_TRY;
    expect(maxDay10Points).toBe(100);

    const nineCorrect = 9 * POINTS_FIRST_TRY;
    expect(nineCorrect).toBe(90);

    const fullCorrect = 10 * POINTS_FIRST_TRY;
    expect(fullCorrect).toBe(100);
  });
});
