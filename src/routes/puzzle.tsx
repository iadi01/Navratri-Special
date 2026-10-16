import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Trophy,
  Timer,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  Lock,
  Flame,
  Award,
  Zap,
  ShieldAlert,
  Info,
  Calendar,
  Layers,
  Shuffle,
  Star,
  Users,
  Sparkles,
  Share2,
  Lightbulb,
  Eye,
  Hash,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getSavedUserProfile,
  saveUserProfile,
  type UserProfile
} from '@/lib/leaderboard-store';
import { PuzzleShareModal } from '@/components/puzzle-share-modal';

export const Route = createFileRoute('/puzzle')({
  head: () => ({
    meta: [
      { title: 'Navratri Sliding Puzzle — पहचानो कौन?' },
      {
        name: 'description',
        content: 'Solve the festive Navratri sliding puzzle! Complete Easy, Medium & Hard levels in record time.',
      },
      { property: 'og:title', content: 'Navratri Sliding Puzzle Challenge — पहचानो कौन?' },
      { property: 'og:description', content: 'Can you solve the puzzle fastest? Test your speed on the puzzle leaderboard!' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: PuzzlePage,
});

// =========================================================================
// 🧩 PUZZLE LEVELS & CONFIGURATION
// =========================================================================

const LEVELS = [
  {
    name: 'Easy',
    level: 0,
    cols: 3,
    rows: 3,
    art: '🪔',
    desc: 'Level 1: 3×3 Grid · Pastel Durga Under the Temple Arch',
    image: '/navratri-puzzle-art-0.jpg',
    aspectRatio: 1, // 3 / 3
  },
  {
    name: 'Medium',
    level: 1,
    cols: 4,
    rows: 3,
    art: '🌺',
    desc: 'Level 2: 4×3 Grid · Devotional Temple Shrine with Children',
    image: '/navratri-puzzle-art-1.jpg',
    aspectRatio: 4 / 3, // 1.333
  },
  {
    name: 'Hard',
    level: 2,
    cols: 6,
    rows: 3,
    art: '💃',
    desc: 'Level 3: 6×3 Grid · Amity University Garba Celebration',
    image: '/navratri-puzzle-art-2.jpg',
    aspectRatio: 6 / 3, // 2.0
  },
];

const LOCAL_STORAGE_KEY = 'pehchaan_navratri_puzzle_v2';
const SUBMITTED_CACHE_KEY = 'pehchaan_puzzle_submitted_date';
const PUZZLE_CONFIG_CACHE_KEY = 'pehchaan_puzzle_config_cache';

function getTodayIST(): string {
  const d = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffset);
  return istDate.toISOString().slice(0, 10);
}

function checkLocalAttemptSync(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const today = getTodayIST();
    if (localStorage.getItem(SUBMITTED_CACHE_KEY) === today) {
      return true;
    }
    const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedRaw) {
      const parsed = JSON.parse(savedRaw);
      if (parsed && parsed.date === today && parsed.submitted) {
        return true;
      }
    }
  } catch {}
  return false;
}

function checkLocalPuzzleEnabledSync(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const cached = localStorage.getItem(PUZZLE_CONFIG_CACHE_KEY);
    if (cached !== null) {
      const parsed = JSON.parse(cached);
      return parsed.enabled === true;
    }
  } catch {}
  return false; // Safe default: do NOT show game until verified from config or cache!
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Solvability check for sliding puzzle
function isSolved(tiles: number[]): boolean {
  return tiles.every((v, i) => v === i);
}

function getNeighbors(emptyIdx: number, cols: number, rows: number): number[] {
  const neighbors: number[] = [];
  const emptyR = Math.floor(emptyIdx / cols);
  const emptyC = emptyIdx % cols;
  if (emptyR > 0) neighbors.push(emptyIdx - cols); // from top
  if (emptyR < rows - 1) neighbors.push(emptyIdx + cols); // from bottom
  if (emptyC > 0) neighbors.push(emptyIdx - 1); // from left
  if (emptyC < cols - 1) neighbors.push(emptyIdx + 1); // from right
  return neighbors;
}

// Generates fun, 100% solvable, and achievable puzzles via controlled random walk
function generateSolvableTiles(cols: number, rows: number, customSteps?: number): number[] {
  const n = cols * rows;
  // Controlled difficulty: balanced, engaging & winnable!
  // 3x3 (Easy): 8 steps (solvable in ~8-12 moves)
  // 4x3 (Medium): 12 steps (solvable in ~12-16 moves)
  // 6x3 (Hard): 16 steps (solvable in ~16-22 moves)
  const steps = customSteps ?? (n <= 9 ? 8 : n <= 12 ? 12 : 16);
  let tiles: number[];
  do {
    tiles = [...Array(n).keys()];
    let emptyIdx = n - 1;
    let lastMoved = -1;

    for (let s = 0; s < steps; s++) {
      const allNeighbors = getNeighbors(emptyIdx, cols, rows);
      const candidates = allNeighbors.filter(idx => tiles[idx] !== lastMoved);
      const chosen = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : allNeighbors[0];
      lastMoved = tiles[chosen];
      tiles[emptyIdx] = tiles[chosen];
      tiles[chosen] = n - 1;
      emptyIdx = chosen;
    }
  } while (isSolved(tiles));
  return tiles;
}

type PuzzleLocalState = {
  date: string;
  level: number;
  unlocked: number;
  tiles: number[];
  moves: number;
  totalMoves: number;
  accumulatedSeconds: number;
  levelTimeSeconds: number[];
  levelMoves: number[];
  done: boolean[];
  submitted: boolean;
};

// =========================================================================
// 🎯 MAIN PUZZLE COMPONENT
// =========================================================================

function PuzzlePage() {
  const todayIST = getTodayIST();

  // Admin Config & Enable status
  const [isEnabled, setIsEnabled] = useState<boolean>(() => checkLocalPuzzleEnabledSync());
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => getSavedUserProfile());
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [fullNameInput, setFullNameInput] = useState<string>('');
  const [rollNoInput, setRollNoInput] = useState<string>('');
  const [courseInput, setCourseInput] = useState<string>('BCA');
  const [yearInput, setYearInput] = useState<string>('1st Sem');

  // Attempt & Submission Status
  const [hasAttemptedToday, setHasAttemptedToday] = useState<boolean>(() => checkLocalAttemptSync());
  const [serverExistingScore, setServerExistingScore] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    rank?: number;
    isTop10?: boolean;
    bonusPoints?: number;
  } | null>(null);

  // Puzzle Board State
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(0);
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(0);
  const [sessionElapsed, setSessionElapsed] = useState<number>(0);
  const [levelTimes, setLevelTimes] = useState<number[]>([0, 0, 0]);
  const [levelMovesArr, setLevelMovesArr] = useState<number[]>([0, 0, 0]);
  const [doneLevels, setDoneLevels] = useState<boolean[]>([false, false, false]);

  // Move History (Undo) & Target Art Preview
  const [moveHistory, setMoveHistory] = useState<number[][]>([]);
  const [showPeekModal, setShowPeekModal] = useState<boolean>(false);

  // Modals & UI
  const [showLevelModal, setShowLevelModal] = useState<boolean>(false);
  const [completedLevelInfo, setCompletedLevelInfo] = useState<{
    level: number;
    time: number;
    moves: number;
    isLast: boolean;
  } | null>(null);

  // Puzzle Leaderboard
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState<boolean>(false);

  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Timer reference
  const sessionStartTsRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isContinuingRef = useRef<boolean>(false);

  const currentLevel = LEVELS[currentLevelIdx] || LEVELS[0];
  const totalLiveSeconds = accumulatedSeconds + (isGameActive ? sessionElapsed : 0);
  const totalLiveMoves = levelMovesArr.reduce((a, b) => a + b, 0) + moves;

  // 1. Fetch Admin Puzzle Config & Leaderboard
  useEffect(() => {
    async function initData() {
      setIsLoadingConfig(true);
      try {
        const cfgRes = await fetch('/api/puzzle/config');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          const active = cfg.enabled !== false;
          setIsEnabled(active);
          try {
            localStorage.setItem(PUZZLE_CONFIG_CACHE_KEY, JSON.stringify({ enabled: active }));
          } catch {}
        }
      } catch {
        setIsEnabled((prev) => prev);
      } finally {
        setIsLoadingConfig(false);
      }

      fetchLeaderboard();
    }
    initData();
  }, []);

  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const res = await fetch('/api/puzzle/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(Array.isArray(data) ? data : []);
      }
    } catch {
      setLeaderboard([]);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  // 2. Check Server Attempt if Profile exists
  useEffect(() => {
    async function checkAttempt() {
      const profile = getSavedUserProfile();
      if (!profile) return;
      try {
        const cleanUser = encodeURIComponent(profile.fullName || profile.username);
        const cleanRoll = encodeURIComponent(profile.rollNo || '');
        const res = await fetch(`/api/puzzle/attempt?username=${cleanUser}&rollNo=${cleanRoll}&date=${todayIST}`);
        if (res.ok) {
          const data = await res.json();
          if (data.attempted) {
            setServerExistingScore(data.existingScore);
            // Check if user is currently in the middle of continuing the next level
            let isContinuing = false;
            try {
              const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
              if (savedRaw) {
                const parsed = JSON.parse(savedRaw);
                if (
                  parsed &&
                  parsed.date === todayIST &&
                  parsed.submitted === false &&
                  Number(parsed.level ?? 0) >= Math.min(2, Number(data.existingScore?.completedLevels ?? 0))
                ) {
                  isContinuing = true;
                }
              }
            } catch {}

            if (!isContinuing) {
              localStorage.setItem(SUBMITTED_CACHE_KEY, todayIST);
              setHasAttemptedToday(true);
            }
          } else {
            // 🌟 Server verified: User has NOT attempted in MongoDB (or admin deleted score from database)
            // Immediately clean up local submission cache so user can play freshly!
            try {
              localStorage.removeItem(SUBMITTED_CACHE_KEY);
              const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
              if (savedRaw) {
                const parsed = JSON.parse(savedRaw);
                if (parsed && (parsed.submitted || parsed.date !== todayIST)) {
                  parsed.submitted = false;
                  parsed.level = 0;
                  parsed.moves = 0;
                  parsed.accumulatedSeconds = 0;
                  parsed.done = [false, false, false];
                  parsed.levelTimeSeconds = [0, 0, 0];
                  parsed.levelMoves = [0, 0, 0];
                  const n = LEVELS[0].cols * LEVELS[0].rows;
                  parsed.tiles = [...Array(n).keys()];
                  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
                }
              }
            } catch {}

            setHasAttemptedToday(false);
            setServerExistingScore(null);
          }
        }
      } catch (err) {
        console.error('Failed to verify puzzle attempt:', err);
      }
    }
    checkAttempt();
  }, [userProfile, todayIST]);

  // 3. Initialize & Restore Board State from LocalStorage
  useEffect(() => {
    if (isLoadingConfig || !isEnabled || hasAttemptedToday) return;

    if (isContinuingRef.current) {
      isContinuingRef.current = false;
      return;
    }

    try {
      const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedRaw) {
        const parsed: PuzzleLocalState = JSON.parse(savedRaw);
        // Resume ONLY if from today and not yet submitted!
        if (parsed && parsed.date === todayIST && !parsed.submitted) {
          setCurrentLevelIdx(parsed.level ?? 0);
          setUnlockedLevel(parsed.unlocked ?? 0);
          setTiles(Array.isArray(parsed.tiles) && parsed.tiles.length > 0 ? parsed.tiles : generateSolvableTiles(LEVELS[parsed.level ?? 0].cols, LEVELS[parsed.level ?? 0].rows));
          setMoves(parsed.moves ?? 0);
          setAccumulatedSeconds(parsed.accumulatedSeconds ?? 0);
          setLevelTimes(parsed.levelTimeSeconds ?? [0, 0, 0]);
          setLevelMovesArr(parsed.levelMoves ?? [0, 0, 0]);
          setDoneLevels(parsed.done ?? [false, false, false]);
          setMoveHistory([]);
          // Note: isGameActive stays false on load/refresh until user clicks "Resume Play"!
          return;
        }
      }
    } catch (e) {
      console.warn('Error reading saved puzzle state:', e);
    }

    // Fresh start for today: show solved picture initially
    const n = LEVELS[0].cols * LEVELS[0].rows;
    const initialTiles = [...Array(n).keys()];
    setTiles(initialTiles);
    setCurrentLevelIdx(0);
    setUnlockedLevel(0);
    setMoves(0);
    setAccumulatedSeconds(0);
    setSessionElapsed(0);
    setLevelTimes([0, 0, 0]);
    setLevelMovesArr([0, 0, 0]);
    setDoneLevels([false, false, false]);
    setMoveHistory([]);
    setIsGameActive(false);
  }, [isLoadingConfig, isEnabled, hasAttemptedToday, todayIST]);

  // 4. Live Timer Tick (ONLY runs when isGameActive is true!)
  useEffect(() => {
    if (!isGameActive || hasAttemptedToday || doneLevels[currentLevelIdx] || isSubmitting) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTsRef.current) / 1000);
      setSessionElapsed(elapsed);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isGameActive, hasAttemptedToday, doneLevels, currentLevelIdx, isSubmitting]);

  // Start Play: auto-shuffles tiles and starts the timer!
  const handleStartPlay = () => {
    if (hasAttemptedToday) return;
    const targetCols = currentLevel.cols;
    const targetRows = currentLevel.rows;
    const shuffled = generateSolvableTiles(targetCols, targetRows);
    setTiles(shuffled);
    setMoves(0);
    setMoveHistory([]);
    setSessionElapsed(0);
    sessionStartTsRef.current = Date.now();
    setIsGameActive(true);
    saveStateToStorage({ tiles: shuffled, moves: 0 });
  };

  // Resume Play: continues previous game with saved timer and moves!
  const handleResumePlay = () => {
    if (hasAttemptedToday) return;
    setSessionElapsed(0);
    sessionStartTsRef.current = Date.now();
    setIsGameActive(true);
  };

  // 5. Auto-Save State to LocalStorage on changes
  const saveStateToStorage = useCallback(
    (override?: Partial<PuzzleLocalState>) => {
      if (hasAttemptedToday && override?.submitted !== false) return;
      try {
        const currentElapsedNow = isGameActive ? Math.max(0, Math.floor((Date.now() - sessionStartTsRef.current) / 1000)) : 0;
        const payload: PuzzleLocalState = {
          date: todayIST,
          level: currentLevelIdx,
          unlocked: unlockedLevel,
          tiles,
          moves,
          totalMoves: levelMovesArr.reduce((a, b) => a + b, 0) + moves,
          accumulatedSeconds: accumulatedSeconds + currentElapsedNow,
          levelTimeSeconds: levelTimes,
          levelMoves: levelMovesArr,
          done: doneLevels,
          submitted: hasAttemptedToday,
          ...override,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      } catch {}
    },
    [
      isGameActive,
      todayIST,
      currentLevelIdx,
      unlockedLevel,
      tiles,
      moves,
      accumulatedSeconds,
      levelTimes,
      levelMovesArr,
      doneLevels,
      hasAttemptedToday,
    ]
  );

  // ↩️ Undo last move
  const handleUndoMove = () => {
    if (!isGameActive || hasAttemptedToday || doneLevels[currentLevelIdx] || moveHistory.length === 0) return;
    const previousTiles = moveHistory[moveHistory.length - 1];
    setMoveHistory((prev) => prev.slice(0, prev.length - 1));
    setTiles(previousTiles);
    const newMoves = Math.max(0, moves - 1);
    setMoves(newMoves);
    saveStateToStorage({ tiles: previousTiles, moves: newMoves });
  };

  // Sync state on unmount / page hide
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveStateToStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [saveStateToStorage]);

  // 6. Handle Tile Movement
  const handleTileClick = (index: number) => {
    if (!isGameActive || hasAttemptedToday || doneLevels[currentLevelIdx]) return;

    const { cols } = currentLevel;
    const emptyIdx = tiles.indexOf(tiles.length - 1);
    if (emptyIdx === -1) return;

    const sameRow = Math.floor(index / cols) === Math.floor(emptyIdx / cols);
    const isAdjacent = sameRow ? Math.abs(index - emptyIdx) === 1 : Math.abs(index - emptyIdx) === cols;

    if (!isAdjacent) return;

    // Record previous board state for Undo
    setMoveHistory((prev) => [...prev.slice(-25), tiles]);

    // Swap tile with empty slot
    const newTiles = [...tiles];
    [newTiles[index], newTiles[emptyIdx]] = [newTiles[emptyIdx], newTiles[index]];
    const newMoves = moves + 1;

    setTiles(newTiles);
    setMoves(newMoves);

    // Check if level is solved
    if (isSolved(newTiles)) {
      handleLevelComplete(newTiles, newMoves);
    } else {
      saveStateToStorage({ tiles: newTiles, moves: newMoves });
    }
  };

  // 7. Handle Level Complete
  const handleLevelComplete = (solvedTiles: number[], finalMoves: number) => {
    setIsGameActive(false); // Stop timer when level is complete
    const finalSessionSec = Math.floor((Date.now() - sessionStartTsRef.current) / 1000);
    const finalTotalSec = accumulatedSeconds + finalSessionSec;

    const newLevelTimes = [...levelTimes];
    newLevelTimes[currentLevelIdx] = finalTotalSec;
    setLevelTimes(newLevelTimes);

    const newLevelMoves = [...levelMovesArr];
    newLevelMoves[currentLevelIdx] = finalMoves;
    setLevelMovesArr(newLevelMoves);

    const newDone = [...doneLevels];
    newDone[currentLevelIdx] = true;
    setDoneLevels(newDone);

    const nextIdx = currentLevelIdx + 1;
    const isLast = currentLevelIdx === LEVELS.length - 1;
    const newUnlocked = isLast ? unlockedLevel : Math.max(unlockedLevel, nextIdx);
    setUnlockedLevel(newUnlocked);

    // Freeze accumulated timer
    setAccumulatedSeconds(finalTotalSec);
    setSessionElapsed(0);
    sessionStartTsRef.current = Date.now();

    saveStateToStorage({
      tiles: solvedTiles,
      moves: finalMoves,
      accumulatedSeconds: finalTotalSec,
      levelTimeSeconds: newLevelTimes,
      levelMoves: newLevelMoves,
      done: newDone,
      unlocked: newUnlocked,
    });

    setCompletedLevelInfo({
      level: currentLevelIdx,
      time: finalTotalSec,
      moves: finalMoves,
      isLast,
    });
    setShowLevelModal(true);

    // 🌟 Auto-submit score to MongoDB immediately upon completing ANY level!
    const countCompleted = currentLevelIdx + 1;
    const finalMovesTotal = newLevelMoves.slice(0, countCompleted).reduce((a, b) => a + b, 0);
    submitPuzzleScore(
      countCompleted,
      finalTotalSec,
      finalMovesTotal,
      newLevelTimes,
      newLevelMoves,
      { isFinalStop: isLast, openShareModal: isLast }
    );
  };

  // 8. Switch to Next Level
  const proceedToNextLevel = (nextLevelIdx: number) => {
    setShowLevelModal(false);
    if (nextLevelIdx >= LEVELS.length) return;
    if (nextLevelIdx <= currentLevelIdx) return; // Strict: Can never go backwards to previous levels

    setCurrentLevelIdx(nextLevelIdx);
    const targetCols = LEVELS[nextLevelIdx].cols;
    const targetRows = LEVELS[nextLevelIdx].rows;
    const nextTiles = generateSolvableTiles(targetCols, targetRows);

    setTiles(nextTiles);
    setMoves(0);
    setMoveHistory([]);
    setSessionElapsed(0);
    sessionStartTsRef.current = Date.now();
    setIsGameActive(true);

    saveStateToStorage({
      level: nextLevelIdx,
      tiles: nextTiles,
      moves: 0,
      unlocked: Math.max(unlockedLevel, nextLevelIdx),
    });
  };

  // 9. Reshuffle current level
  const handleReshuffle = () => {
    if (hasAttemptedToday || doneLevels[currentLevelIdx]) return;
    const shuffled = generateSolvableTiles(currentLevel.cols, currentLevel.rows);
    setTiles(shuffled);
    setMoveHistory([]);
    saveStateToStorage({ tiles: shuffled });
  };

  // 10. Submit Score to Server (enforcing 1-attempt/day)
  const submitPuzzleScore = async (
    completedCount?: number,
    finalTotalSeconds?: number,
    finalTotalMoves?: number,
    timesArr?: number[],
    movesArr?: number[],
    options?: { isFinalStop?: boolean; openShareModal?: boolean }
  ) => {
    let profile = getSavedUserProfile();
    if (!profile) {
      setShowProfileModal(true);
      return;
    }

    const count = completedCount ?? doneLevels.filter(Boolean).length;
    // Points system: Level 1 = 15, Level 2 = 30 (15+15), Level 3 = 50 (15+15+20)
    const points = count >= 3 ? 50 : count === 2 ? 30 : count === 1 ? 15 : 0;

    const timeSec = finalTotalSeconds ?? totalLiveSeconds;
    const totalMoves = finalTotalMoves ?? levelMovesArr.reduce((a, b) => a + b, 0) + moves;
    const times = timesArr ?? levelTimes;
    const mvs = movesArr ?? levelMovesArr;

    setIsSubmitting(true);
    try {
      const breakdown = LEVELS.slice(0, count).map((lv, i) => ({
        level: lv.level,
        name: lv.name,
        timeSeconds: times[i] || 0,
        moves: mvs[i] || 0,
      }));

      const payload = {
        username: profile.username,
        fullName: profile.fullName || profile.username,
        course: profile.course,
        year: profile.year,
        batch: profile.batch,
        rollNo: profile.rollNo,
        email: profile.email,
        date: todayIST,
        completedLevels: count,
        totalTimeSeconds: timeSec,
        totalMoves: totalMoves,
        pointsEarned: points,
        levelBreakdown: breakdown,
        submittedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/puzzle/submit', {
        method: 'POST',
        headers: { 'Content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmissionResult(data);
        setServerExistingScore({
          completedLevels: count,
          totalTimeSeconds: timeSec,
          totalMoves: totalMoves,
          pointsEarned: data.pointsEarned ?? points,
          rank: data.rank,
        });

        const shouldLockOut = count >= 3 || options?.isFinalStop === true;
        if (shouldLockOut) {
          setHasAttemptedToday(true);
          localStorage.setItem(SUBMITTED_CACHE_KEY, todayIST);
          saveStateToStorage({ submitted: true });
        } else {
          // Partial level auto-submit (Level 1 or 2): Save in DB, keep next level open!
          saveStateToStorage({ submitted: false, level: count, unlocked: count });
        }

        fetchLeaderboard();

        if (options?.openShareModal || (shouldLockOut && options?.openShareModal !== false)) {
          setShowShareModal(true);
        }
      } else {
        if (options?.isFinalStop) {
          alert(data.error || 'Failed to submit puzzle score.');
        }
      }
    } catch (err: any) {
      if (options?.isFinalStop) {
        alert(err?.message || 'Network error submitting puzzle score.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save profile from modal
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameInput.trim()) return;

    const res = saveUserProfile({
      fullName: fullNameInput.trim(),
      username: fullNameInput.trim(),
      course: courseInput.trim(),
      year: yearInput.trim(),
      rollNo: rollNoInput.trim().toUpperCase(),
    });

    if (res.success) {
      setUserProfile(res.profile);
      setShowProfileModal(false);
    }
  };

  // User continuation: if they stopped & submitted at Level 1 or Level 2, continue right from where they left off!
  const handleContinueNextLevel = (forcedTargetLvl?: number) => {
    // When completedLevels is 1 -> targetIdx is 1 (Level 2: Medium)
    // When completedLevels is 2 -> targetIdx is 2 (Level 3: Hard)
    const targetIdx = typeof forcedTargetLvl === 'number'
      ? forcedTargetLvl
      : Number(serverExistingScore?.completedLevels ?? 1);

    if (targetIdx >= LEVELS.length) return;

    // Check if there is an in-progress local save for this level
    let savedTiles: number[] | null = null;
    let savedMoves = 0;
    let savedAccSec = Number(serverExistingScore?.totalTimeSeconds || accumulatedSeconds || 0);
    let savedTimes = [...levelTimes];
    let savedMovesArr = [...levelMovesArr];

    try {
      const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (
          parsed &&
          parsed.date === todayIST &&
          parsed.level === targetIdx &&
          Array.isArray(parsed.tiles) &&
          parsed.tiles.length === LEVELS[targetIdx].cols * LEVELS[targetIdx].rows
        ) {
          savedTiles = parsed.tiles;
          savedMoves = parsed.moves ?? 0;
          savedAccSec = parsed.accumulatedSeconds ?? savedAccSec;
          if (Array.isArray(parsed.levelTimeSeconds)) savedTimes = parsed.levelTimeSeconds;
          if (Array.isArray(parsed.levelMoves)) savedMovesArr = parsed.levelMoves;
        }
      }
    } catch {}

    const newDone = [false, false, false];
    for (let i = 0; i < targetIdx; i++) newDone[i] = true;

    if (targetIdx > 0 && (!savedTimes[targetIdx - 1] || savedTimes[targetIdx - 1] === 0)) {
      savedTimes[targetIdx - 1] = savedAccSec;
    }
    if (targetIdx > 0 && (!savedMovesArr[targetIdx - 1] || savedMovesArr[targetIdx - 1] === 0)) {
      savedMovesArr[targetIdx - 1] = Number(serverExistingScore?.totalMoves || 0);
    }

    // If no previous in-progress board exists, generate solvable tiles for next level
    const targetCols = LEVELS[targetIdx].cols;
    const targetRows = LEVELS[targetIdx].rows;
    const activeTiles = savedTiles || generateSolvableTiles(targetCols, targetRows);

    // DIRECTLY WRITE TO LOCALSTORAGE BEFORE ANY REACT STATE UPDATES!
    const newPayload: PuzzleLocalState = {
      date: todayIST,
      level: targetIdx,
      unlocked: targetIdx,
      tiles: activeTiles,
      moves: savedMoves,
      totalMoves: savedMovesArr.reduce((a, b) => a + b, 0) + savedMoves,
      accumulatedSeconds: savedAccSec,
      levelTimeSeconds: savedTimes,
      levelMoves: savedMovesArr,
      done: newDone,
      submitted: false,
    };

    try {
      localStorage.removeItem(SUBMITTED_CACHE_KEY);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPayload));
    } catch {}

    // Set flag so useEffect 3 doesn't overwrite what we just initialized
    isContinuingRef.current = true;

    // Update all React states
    setDoneLevels(newDone);
    setCurrentLevelIdx(targetIdx);
    setUnlockedLevel(targetIdx);
    setAccumulatedSeconds(savedAccSec);
    setSessionElapsed(0);
    setMoves(savedMoves);
    setLevelTimes(savedTimes);
    setLevelMovesArr(savedMovesArr);
    setTiles(activeTiles);
    setMoveHistory([]);

    sessionStartTsRef.current = Date.now();
    setIsGameActive(true);
    setHasAttemptedToday(false);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
      {/* 🌸 HEADER */}
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 border-2 border-[#1C332E] text-pink-700 text-xs sm:text-sm font-bold shadow-[2px_2px_0px_#1C332E] rotate-[-1deg]">
          <span>🌸</span> Navratri Special Challenge · पहचानो कौन?
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-pink-700 font-['Baloo_2'] tracking-tight">
          Navratri Sliding Puzzle
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-xl mx-auto">
          Unscramble the sacred Durga Puja artwork! Complete Easy, Medium & Hard levels.{' '}
          <span className="font-bold text-foreground">
            Fastest solvers are ranked on today's speed leaderboard!
          </span>
        </p>
      </header>

      {/* ⏳ CHECKING STATUS LOADER */}
      {isLoadingConfig && (
        <div className="bg-white border-3 border-[#1C332E] rounded-3xl p-10 text-center shadow-[6px_6px_0px_#1C332E] space-y-3">
          <div className="w-8 h-8 border-3 border-[#1C332E] border-t-pink-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#1C332E]">Checking challenge status...</p>
        </div>
      )}

      {/* ⚙️ OFFLINE STATE BANNER (If Admin Disabled) */}
      {!isLoadingConfig && !isEnabled && (
        <div className="bg-amber-50 border-3 border-[#1C332E] rounded-2xl p-6 text-center shadow-[6px_6px_0px_#1C332E] space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 border-2 border-[#1C332E] flex items-center justify-center text-amber-700 font-bold text-xl">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold font-['Baloo_2'] text-amber-900">
            Puzzle Challenge Currently Inactive
          </h2>
          <p className="text-sm text-amber-800 max-w-md mx-auto">
            The Navratri sliding puzzle has been temporarily paused by the tournament admin. Check back soon for the next broadcast!
          </p>
          <Button asChild variant="outline" className="border-2 border-[#1C332E] font-bold">
            <Link to="/challenge">Play Daily Quiz Instead <ArrowRight size={14} className="ml-1.5" /></Link>
          </Button>
        </div>
      )}


      {/* 👤 PLAYER IDENTITY BAR */}
      {!isLoadingConfig && isEnabled && (
        <div className="bg-white border-3 border-[#1C332E] rounded-2xl p-4 shadow-[4px_4px_0px_#1C332E] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 border-2 border-[#1C332E] flex items-center justify-center text-pink-700 font-bold text-lg">
              {userProfile?.fullName?.[0] || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-foreground">
                  {userProfile ? userProfile.fullName : 'Guest Participant'}
                </span>
                {userProfile?.rollNo && (
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-muted rounded border border-border text-muted-foreground">
                    {userProfile.rollNo}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {userProfile ? `${userProfile.course} • ${userProfile.year}` : 'Enter your name to qualify for top 10 bonus points'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!userProfile ? (
              <Button
                size="sm"
                onClick={() => setShowProfileModal(true)}
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold border-2 border-[#1C332E] shadow-[2px_2px_0px_#1C332E] text-xs"
              >
                Set Profile to Save Score
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProfileModal(true)}
                className="text-xs font-semibold border-2 border-[#1C332E]"
              >
                Edit Details
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 🏆 COMPLETED TODAY BANNER (Anti-Cheat 1-Attempt Record) */}
      {!isLoadingConfig && isEnabled && hasAttemptedToday && Boolean(serverExistingScore) && (
        <div className="bg-white border-3 border-[#1C332E] rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#1C332E] text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-pink-100 border-3 border-[#1C332E] flex items-center justify-center text-pink-700 shadow-[3px_3px_0px_#1C332E]">
            <Trophy size={32} className="animate-bounce" />
          </div>
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 bg-pink-100 text-pink-800 rounded-full border border-pink-300 mb-2">
              Challenge Completed Today
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-['Baloo_2']">
              Shubh Navratri! Your Score is Locked In 🌸
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              You have already completed today's official 1-attempt daily puzzle.
              Check your placement on the speed leaderboard below!
            </p>
          </div>

          {serverExistingScore && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto py-2">
              <div className="bg-white border-2 border-[#1C332E] rounded-xl p-3 shadow-[2px_2px_0px_#1C332E]">
                <span className="text-xs text-muted-foreground block">Levels Solved</span>
                <span className="text-lg font-extrabold text-foreground">
                  {serverExistingScore.completedLevels || 1}/3
                </span>
              </div>
              <div className="bg-white border-2 border-[#1C332E] rounded-xl p-3 shadow-[2px_2px_0px_#1C332E]">
                <span className="text-xs text-muted-foreground block">Points Earned</span>
                <span className="text-lg font-extrabold text-pink-600 font-mono">
                  +{serverExistingScore.pointsEarned ?? (
                    (serverExistingScore.completedLevels || 1) >= 3 ? 50 : (serverExistingScore.completedLevels || 1) === 2 ? 30 : 15
                  )} PTS
                </span>
              </div>
              <div className="bg-white border-2 border-[#1C332E] rounded-xl p-3 shadow-[2px_2px_0px_#1C332E]">
                <span className="text-xs text-muted-foreground block">Total Time</span>
                <span className="text-lg font-extrabold text-foreground font-mono">
                  {formatTime(serverExistingScore.totalTimeSeconds || 0)}
                </span>
              </div>
              <div className="bg-white border-2 border-[#1C332E] rounded-xl p-3 shadow-[2px_2px_0px_#1C332E]">
                <span className="text-xs text-muted-foreground block">Total Moves</span>
                <span className="text-lg font-extrabold text-foreground">
                  {serverExistingScore.totalMoves || 0}
                </span>
              </div>
            </div>
          )}

          {/* 🌺 Continue Next Level Option for Partial Completion */}
          {serverExistingScore && Number(serverExistingScore.completedLevels || 0) < 3 && (
            <div className="bg-emerald-50 border-2.5 border-[#1C332E] rounded-2xl p-4 max-w-lg mx-auto space-y-2 text-center shadow-[4px_4px_0px_#1C332E]">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold">
                <span>⚡</span> Partial Score Saved: +{serverExistingScore.pointsEarned ?? (Number(serverExistingScore.completedLevels) === 1 ? 15 : 30)} PTS
              </div>
              <p className="text-xs sm:text-sm text-foreground font-medium">
                You cleared Level {serverExistingScore.completedLevels}. Continue Level {Number(serverExistingScore.completedLevels) + 1} to reach up to 50 total points!
              </p>
              <Button
                onClick={() => handleContinueNextLevel(Number(serverExistingScore.completedLevels))}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold border-2 border-[#1C332E] shadow-[3px_3px_0px_#1C332E] text-xs sm:text-sm py-2.5 px-6 rounded-xl cursor-pointer"
              >
                Continue Level {Number(serverExistingScore.completedLevels) + 1} ({LEVELS[Number(serverExistingScore.completedLevels)].name}) (+{Number(serverExistingScore.completedLevels) === 1 ? 15 : 20} pts) →
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => setShowShareModal(true)}
              className="bg-pink-600 hover:bg-pink-700 font-extrabold border-2 border-[#1C332E] shadow-[3px_3px_0px_#1C332E] text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 size={16} /> Share 4:5 Card on BeSocial
            </Button>
            <Button asChild className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold border-2 border-[#1C332E] shadow-[3px_3px_0px_#1C332E]">
              <Link to="/challenge">Play Daily Quiz Hunt <ArrowRight size={14} className="ml-1" /></Link>
            </Button>
            <Button asChild variant="outline" className="border-2 border-[#1C332E] font-bold">
              <Link to="/leaderboard">View Overall Standings</Link>
            </Button>
          </div>

        </div>
      )}

      {/* 🧩 MAIN PUZZLE INTERACTION CARD (Active Game) */}
      {!isLoadingConfig && isEnabled && (!hasAttemptedToday || !serverExistingScore) && (
        <div className="bg-white border-3 border-[#1C332E] rounded-3xl p-4 sm:p-7 shadow-[6px_6px_0px_#1C332E] space-y-5">
          {/* Level Progress Indicator (Non-clickable: Once advanced, previous levels cannot be replayed) */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {LEVELS.map((lv, idx) => {
              const isCurrent = idx === currentLevelIdx;
              const isDone = doneLevels[idx];
              const isLocked = idx > currentLevelIdx;
              const levelPts = idx === 0 ? '15 pts' : idx === 1 ? '+15 pts (30 total)' : '+20 pts (50 total)';

              return (
                <div
                  key={lv.name}
                  className={`px-3.5 py-1.5 rounded-xl font-bold font-['Baloo_2'] text-xs sm:text-sm border-2.5 border-[#1C332E] flex items-center gap-1.5 select-none transition-all ${
                    isCurrent
                      ? 'bg-pink-600 text-white shadow-[3px_3px_0px_#1C332E]'
                      : isDone
                      ? 'bg-white text-muted-foreground border-border/80'
                      : 'bg-muted/30 text-muted-foreground/60 border-dashed border-border'
                  }`}
                >
                  <span>{lv.art}</span>
                  <span>{isDone ? `✓ ${lv.name} (${levelPts})` : isCurrent ? `${lv.name} · ${levelPts}` : `${lv.name} (${levelPts})`}</span>
                  {isLocked && <Lock size={12} className="ml-0.5 text-muted-foreground/60" />}
                </div>
              );
            })}
          </div>

          {/* HUD Status Bar */}
          {/* HUD Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-pink-50/70 border-2 border-[#1C332E] rounded-2xl p-3 shadow-[2px_2px_0px_#1C332E]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-[#FBF0C8] border-2 border-[#1C332E] px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold text-[#1C332E]">
                <Timer size={15} />
                <span>⏱ {formatTime(totalLiveSeconds)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#BAE6FD] border-2 border-[#1C332E] px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold text-[#1C332E]">
                <span>🎯 Moves: {totalLiveMoves}</span>
              </span>

              {/* ↩️ Undo Move Button */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleUndoMove}
                disabled={!isGameActive || doneLevels[currentLevelIdx] || moveHistory.length === 0}
                className="h-8 text-xs font-extrabold border-2 border-[#1C332E] bg-white hover:bg-amber-50 text-[#1C332E] rounded-full px-3 shadow-[1px_1px_0px_#1C332E] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Undo last slide move"
              >
                <RotateCcw size={13} className="mr-1 text-amber-600" />
                Undo Move
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* 👁️ Target Art Reference Preview */}
              <button
                type="button"
                onClick={() => setShowPeekModal(true)}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-emerald-50 border-2 border-[#1C332E] px-3 py-1 rounded-xl text-xs font-extrabold text-emerald-900 shadow-[2px_2px_0px_#1C332E] transition-all cursor-pointer"
                title="View full solved artwork preview"
              >
                <img
                  src={currentLevel.image}
                  alt="Target"
                  className="w-5 h-5 rounded-md object-cover border border-[#1C332E]"
                />
                <Eye size={13} className="text-emerald-700" />
                <span>Target Art</span>
              </button>

              {doneLevels[0] && !doneLevels[currentLevelIdx] && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const completedCount = doneLevels.filter(Boolean).length;
                    const pts = completedCount >= 2 ? 30 : 15;
                    if (window.confirm(`Stop and submit your score with ${pts} points now?`)) {
                      submitPuzzleScore(completedCount);
                    }
                  }}
                  className="h-8 text-xs font-bold border-2 border-pink-600 text-pink-700 bg-white hover:bg-pink-50 cursor-pointer"
                >
                  🏁 Stop & Submit ({doneLevels[1] ? '30 pts' : '15 pts'})
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleReshuffle}
                disabled={!isGameActive || doneLevels[currentLevelIdx]}
                className="h-8 text-xs font-bold border-2 border-[#1C332E] bg-white hover:bg-amber-50"
              >
                <Shuffle size={13} className="mr-1" /> Reshuffle
              </Button>
            </div>
          </div>

          {/* Sliding Puzzle Grid */}
          <div className="w-full max-w-[540px] mx-auto relative">
            <div
              className="grid gap-1.5 sm:gap-2 w-full border-3 border-[#1C332E] rounded-2xl p-2 sm:p-3 bg-[#1C332E] shadow-[5px_5px_0px_#B82348] select-none touch-manipulation overflow-hidden"
              style={{
                gridTemplateColumns: `repeat(${currentLevel.cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${currentLevel.rows}, minmax(0, 1fr))`,
                aspectRatio: `${currentLevel.cols} / ${currentLevel.rows}`,
              }}
            >
              {tiles.map((tileVal, idx) => {
                const emptyVal = tiles.length - 1;
                const isEmpty = tileVal === emptyVal;

                if (isEmpty) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="aspect-square w-full h-full rounded-lg sm:rounded-xl border-2 border-dashed border-white/20 bg-black/30 pointer-events-none select-none"
                    />
                  );
                }

                // Tile Slice CSS Math
                const cols = currentLevel.cols;
                const rows = currentLevel.rows;
                const posX = (tileVal % cols) * (100 / (cols - 1));
                const posY = Math.floor(tileVal / cols) * (100 / (rows - 1));
                const isCorrect = tileVal === idx;

                return (
                  <button
                    key={`tile-${tileVal}`}
                    onClick={() => handleTileClick(idx)}
                    className="relative aspect-square w-full h-full rounded-lg sm:rounded-xl border-2 border-[#1C332E] cursor-pointer hover:brightness-105 active:brightness-95 overflow-hidden shadow-sm focus:outline-none transition-transform duration-100"
                    style={{
                      backgroundImage: `url(${currentLevel.image})`,
                      backgroundSize: `${cols * 100}% ${rows * 100}%`,
                      backgroundPosition: `${posX}% ${posY}%`,
                      backgroundRepeat: 'no-repeat',
                    }}
                    aria-label={`Slide tile ${tileVal + 1}`}
                  >
                    {/* Very small corner number so artwork remains clearly visible */}
                    <span
                      className={`absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-bold leading-none select-none pointer-events-none ${
                        isCorrect
                          ? 'bg-emerald-600/80 text-white shadow-xs'
                          : 'bg-black/45 text-white/90 backdrop-blur-[1px]'
                      }`}
                    >
                      {tileVal + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Start / Resume Play Overlay */}
            {!isGameActive && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10 border-3 border-[#1C332E] shadow-[5px_5px_0px_#B82348] space-y-4">
                <div className="text-4xl animate-bounce">{currentLevel.art}</div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1C332E] font-['Baloo_2']">
                    {moves > 0 || accumulatedSeconds > 0
                      ? `Level ${currentLevelIdx + 1}: ${currentLevel.name} Paused`
                      : `Level ${currentLevelIdx + 1}: ${currentLevel.name}`}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto mt-1 font-medium">
                    {moves > 0 || accumulatedSeconds > 0
                      ? `Saved: ${moves} moves · ${formatTime(totalLiveSeconds)}. Click Resume Play to continue!`
                      : 'Click "Start Play" to shuffle tiles and begin the timer!'}
                  </p>
                </div>
                {moves > 0 || accumulatedSeconds > 0 ? (
                  <Button
                    onClick={handleResumePlay}
                    size="lg"
                    className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-base px-8 py-3 rounded-2xl border-3 border-[#1C332E] shadow-[4px_4px_0px_#1C332E] hover:shadow-[2px_2px_0px_#1C332E] transition-all cursor-pointer"
                  >
                    ▶️ Resume Play
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartPlay}
                    size="lg"
                    className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-base px-8 py-3 rounded-2xl border-3 border-[#1C332E] shadow-[4px_4px_0px_#1C332E] hover:shadow-[2px_2px_0px_#1C332E] transition-all cursor-pointer"
                  >
                    🎮 Start Play
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-muted-foreground">
              💡 Progress auto-saves continuously. You can resume anytime without timer reset!
            </div>

            {doneLevels[0] && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => submitPuzzleScore()}
                disabled={isSubmitting}
                className="border-2 border-[#1C332E] font-bold text-xs bg-white hover:bg-emerald-50 text-emerald-800"
              >
                🏁 Submit Current Run Early
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 🏆 LIVE SPEED LEADERBOARD (Top 10 Earn +50 Bonus Points) */}
      {!isLoadingConfig && isEnabled && (
        <div className="bg-white border-3 border-[#1C332E] rounded-3xl p-5 sm:p-7 shadow-[6px_6px_0px_#1C332E] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-border/70 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground font-['Baloo_2']">
                Today's Speed Leaderboard ⚡
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-300">
                Fastest Solvers
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Fastest solvers for today ({todayIST}). Strict 1 attempt per day per student.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLeaderboard}
            disabled={isLoadingLeaderboard}
            className="text-xs font-bold"
          >
            <RotateCcw size={13} className={`mr-1 ${isLoadingLeaderboard ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground space-y-2">
            <p className="font-semibold text-sm text-foreground">No puzzle submissions yet today!</p>
            <p className="text-xs max-w-sm mx-auto">
              Be the first to unscramble the tiles and claim the #1 spot on today's speed leaderboard!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-[#1C332E] bg-muted/40 font-bold font-['Baloo_2'] text-muted-foreground">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Participant</th>
                  <th className="py-2.5 px-3 text-center">Levels</th>
                  <th className="py-2.5 px-3 text-center">Score</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                  <th className="py-2.5 px-3 text-right">Moves</th>
                  <th className="py-2.5 px-3 text-right">Standing</th>
                  <th className="py-2.5 px-3 text-center">4:5 Card</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  const isTop10 = rank <= 10;
                  const isCurrent = userProfile && (
                    (userProfile.rollNo && entry.rollNo === userProfile.rollNo) ||
                    entry.username.toLowerCase() === userProfile.username.toLowerCase()
                  );
                  const entryPoints = entry.pointsEarned ?? (
                    entry.completedLevels >= 3 ? 50 : entry.completedLevels === 2 ? 30 : 15
                  );

                  return (
                    <tr
                      key={entry.id || idx}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-pink-50/80 font-bold text-pink-950'
                          : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-muted/10'
                      }`}
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                            rank === 1
                              ? 'bg-amber-400 text-amber-950 border border-amber-600'
                              : rank === 2
                              ? 'bg-slate-300 text-slate-900 border border-slate-500'
                              : rank === 3
                              ? 'bg-amber-600 text-white border border-amber-800'
                              : isTop10
                              ? 'bg-pink-100 text-pink-800 font-extrabold'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {rank}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">
                            {entry.fullName || entry.username}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] bg-pink-600 text-white px-1.5 py-0.2 rounded font-extrabold">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {entry.course || 'BCA'} {entry.rollNo ? `• ${entry.rollNo}` : ''}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-bold text-xs">
                          {entry.completedLevels}/3
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="font-extrabold text-pink-700 font-mono text-xs">
                          +{entryPoints} PTS
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                        {formatTime(entry.totalTimeSeconds)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                        {entry.totalMoves}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-xs border ${
                            rank === 1
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : rank === 2
                              ? 'bg-slate-100 text-slate-800 border-slate-300'
                              : rank === 3
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : isTop10
                              ? 'bg-pink-50 text-pink-700 border-pink-200'
                              : 'text-muted-foreground border-transparent'
                          }`}
                        >
                          {rank === 1 ? '🥇 #1 Winner' : rank === 2 ? '🥈 #2 Runner-up' : rank === 3 ? '🥉 #3' : `Rank #${rank}`}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setServerExistingScore(entry);
                            setShowShareModal(true);
                          }}
                          className="h-7 px-2 text-[11px] font-bold text-pink-600 hover:bg-pink-50 hover:text-pink-700 border border-pink-200 cursor-pointer"
                        >
                          <Share2 size={12} className="mr-1" /> BeSocial
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* 🌟 LEVEL COMPLETE / PROCEED MODAL */}
      {showLevelModal && completedLevelInfo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border-4 border-[#1C332E] rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-[8px_8px_0px_#B82348] text-center space-y-3.5 my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="text-4xl animate-bounce">
              {completedLevelInfo.isLast ? '🏆🎉🏆' : '🎉✨🎉'}
            </div>

            <div className="space-y-1">
              <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                {completedLevelInfo.isLast
                  ? 'All 3 Levels Solved · +50 Points Locked! 🏆'
                  : completedLevelInfo.level === 0
                  ? 'Level 1 Complete · +15 Points Auto-Saved! ⚡'
                  : 'Level 2 Complete · +30 Points Auto-Saved! ⚡'}
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1C332E] font-['Baloo_2']">
                {completedLevelInfo.isLast
                  ? 'All Levels Complete! 🏆'
                  : `${LEVELS[completedLevelInfo.level].name} Complete! 🎉`}
              </h3>
            </div>

            <div className="bg-pink-50/70 border-2 border-[#1C332E] rounded-2xl p-3.5 space-y-1.5 text-center">
              <div className="flex items-center justify-around text-xs font-bold text-foreground">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Time</span>
                  <span className="font-mono text-sm">{formatTime(completedLevelInfo.time)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Moves</span>
                  <span className="font-mono text-sm">{completedLevelInfo.moves} moves</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Score Saved</span>
                  <span className="text-emerald-700 text-sm font-extrabold">
                    +{completedLevelInfo.level === 0 ? 15 : completedLevelInfo.level === 1 ? 30 : 50} PTS
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground">
              {completedLevelInfo.isLast ? (
                <>You mastered all 3 levels! Your official <strong className="text-foreground">50 points</strong> are saved in MongoDB. Shubh Navratri! 🌸</>
              ) : completedLevelInfo.level === 0 ? (
                <>
                  <strong className="text-emerald-700">+15 Points auto-submitted to MongoDB!</strong>
                  <span className="block mt-1 font-medium text-foreground">
                    Ready to take on Level 2 (Medium) for another +15 pts?
                  </span>
                </>
              ) : (
                <>
                  <strong className="text-emerald-700">+30 Points auto-submitted to MongoDB!</strong>
                  <span className="block mt-1 font-medium text-foreground">
                    Continue to Level 3 (Hard) for 50 max points?
                  </span>
                </>
              )}
            </p>

            <div className="flex flex-col gap-2 pt-1 w-full">
              {!completedLevelInfo.isLast ? (
                <>
                  <Button
                    onClick={() => proceedToNextLevel(completedLevelInfo.level + 1)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold border-2 border-[#1C332E] shadow-[3px_3px_0px_#1C332E] text-xs sm:text-sm py-3 px-3 rounded-xl cursor-pointer"
                  >
                    Play Level {completedLevelInfo.level + 2} ({LEVELS[completedLevelInfo.level + 1].name}) 🌺 (+{completedLevelInfo.level === 0 ? 15 : 20} pts) →
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowLevelModal(false);
                      setHasAttemptedToday(true);
                      localStorage.setItem(SUBMITTED_CACHE_KEY, todayIST);
                      saveStateToStorage({ submitted: true });
                      setShowShareModal(true);
                    }}
                    className="w-full border-2 border-[#1C332E] font-bold text-xs py-2 px-3 rounded-xl hover:bg-pink-50 cursor-pointer text-muted-foreground hover:text-pink-700"
                  >
                    Stop for Today · Keep {completedLevelInfo.level === 0 ? '15 Points' : '30 Points'} & View Sharecard ✓
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    setShowLevelModal(false);
                    setShowShareModal(true);
                  }}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-extrabold border-2 border-[#1C332E] shadow-[3px_3px_0px_#1C332E] rounded-xl cursor-pointer flex items-center justify-center gap-2 py-3"
                >
                  <Share2 size={16} /> Share 4:5 Card on BeSocial! 🌟
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 👤 STUDENT PROFILE MODAL (If details missing) */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white border-4 border-[#1C332E] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[8px_8px_0px_#1C332E] space-y-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-pink-100 border-2 border-[#1C332E] flex items-center justify-center text-pink-700">
                <Users size={18} />
              </div>
              <h3 className="text-xl font-extrabold text-foreground font-['Baloo_2']">
                Student Participant Details
              </h3>
            </div>

            <p className="text-xs text-muted-foreground">
              Please enter your academic details to record your official puzzle run and ranking in MongoDB!
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Amity Sharma"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  className="border-2 border-[#1C332E] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Course</label>
                  <Input
                    value={courseInput}
                    onChange={(e) => setCourseInput(e.target.value)}
                    className="border-2 border-[#1C332E] font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Semester / Year</label>
                  <Input
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                    className="border-2 border-[#1C332E] font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowProfileModal(false)}
                className="font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold border-2 border-[#1C332E] shadow-[2px_2px_0px_#1C332E] text-xs"
              >
                Save & Continue
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 👁️ PEEK ARTWORK PREVIEW MODAL */}
      {showPeekModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#1C332E] rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-[8px_8px_0px_#1C332E] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b-2 border-[#1C332E]/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentLevel.art}</span>
                <div>
                  <h3 className="font-extrabold text-foreground text-lg sm:text-xl font-['Baloo_2']">
                    Level {currentLevelIdx + 1} ({currentLevel.name}) Solved Preview
                  </h3>
                  <p className="text-xs text-muted-foreground">{currentLevel.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPeekModal(false)}
                className="w-8 h-8 rounded-full border-2 border-[#1C332E] flex items-center justify-center hover:bg-muted font-bold text-foreground cursor-pointer"
                aria-label="Close Preview"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border-2.5 border-[#1C332E] shadow-inner bg-slate-900">
              <img
                src={currentLevel.image}
                alt={currentLevel.name}
                className="w-full object-contain max-h-[380px] mx-auto select-none pointer-events-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs text-muted-foreground font-medium">
                🎯 Target Grid: {currentLevel.cols} × {currentLevel.rows} tiles
              </span>
              <Button
                type="button"
                onClick={() => setShowPeekModal(false)}
                className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold border-2 border-[#1C332E] shadow-[3px_3px_0px_#1C332E] px-6 cursor-pointer text-xs sm:text-sm"
              >
                Back to Puzzle
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 📸 BeSocial 4:5 Scorecard Modal */}
      <PuzzleShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        completedLevels={
          serverExistingScore?.completedLevels ??
          doneLevels.filter(Boolean).length ??
          1
        }
        totalTimeSeconds={
          serverExistingScore?.totalTimeSeconds ??
          totalLiveSeconds ??
          0
        }
        totalMoves={
          serverExistingScore?.totalMoves ??
          moves ??
          0
        }
        pointsEarned={
          serverExistingScore?.pointsEarned ??
          (doneLevels.filter(Boolean).length >= 3
            ? 50
            : doneLevels.filter(Boolean).length === 2
            ? 30
            : 15)
        }
        rank={serverExistingScore?.rank}
        fullName={serverExistingScore?.fullName || userProfile?.fullName || userProfile?.username || 'Pehchaan Kaun Player'}
        course={serverExistingScore?.course || userProfile?.course || 'BCA'}
        year={serverExistingScore?.year || userProfile?.year || '1st Sem'}
        rollNo={serverExistingScore?.rollNo || userProfile?.rollNo}
        levelImage={
          (serverExistingScore?.completedLevels || doneLevels.filter(Boolean).length) >= 3
            ? '/navratri-puzzle-art-2.jpg'
            : (serverExistingScore?.completedLevels || doneLevels.filter(Boolean).length) === 2
            ? '/navratri-puzzle-art-1.jpg'
            : '/navratri-puzzle-art-0.jpg'
        }
      />
    </div>
  );
}
