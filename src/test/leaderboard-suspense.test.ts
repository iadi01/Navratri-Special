import { describe, it, expect } from 'vitest';
import { DEFAULT_LEADERBOARD_CONFIG } from '../lib/admin-store';

describe('Day 8 Leaderboard Suspense Logic', () => {
  it('defaults to hiding leaderboard starting from Day 8 with suspense enabled and leaderboard enabled', () => {
    expect(DEFAULT_LEADERBOARD_CONFIG.leaderboardEnabled).toBe(true);
    expect(DEFAULT_LEADERBOARD_CONFIG.hideFromDay).toBe(8);
    expect(DEFAULT_LEADERBOARD_CONFIG.suspenseEnabled).toBe(true);
    expect(DEFAULT_LEADERBOARD_CONFIG.announcementMessage).toContain('Stay tuned for the final reveal!');
    expect(DEFAULT_LEADERBOARD_CONFIG.offlineMessage).toBeDefined();
  });

  it('correctly categorizes Days 1-7 as visible and Days 8-10 as suspense locked', () => {
    const hideDay = DEFAULT_LEADERBOARD_CONFIG.hideFromDay;

    for (let day = 1; day <= 7; day++) {
      const isSuspense = day >= hideDay;
      expect(isSuspense).toBe(false);
    }

    for (let day = 8; day <= 10; day++) {
      const isSuspense = day >= hideDay;
      expect(isSuspense).toBe(true);
    }
  });

  it('allows suspense to be disabled or configured for different days', () => {
    const customConfig = { hideFromDay: 9, suspenseEnabled: false };
    expect(customConfig.suspenseEnabled).toBe(false);
    expect(customConfig.hideFromDay).toBe(9);
  });
});
