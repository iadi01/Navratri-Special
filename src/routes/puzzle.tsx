import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Trophy,
  Timer,
  RotateCcw,
  Sparkles,
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
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getSavedUserProfile,
  saveUserProfile,
  type UserProfile
} from '@/lib/leaderboard-store';

export const Route = createFileRoute('/puzzle')({
  head: () => ({
    meta: [
      { title: 'Navratri Sliding Puzzle — पहचानो कौन?' },
      {
        name: 'description',
        content: 'Solve the festive Navratri sliding puzzle! Top 10 fastest players win +50 bonus points. Play Easy, Medium & Hard levels.',
      },
      { property: 'og:title', content: 'Navratri Sliding Puzzle Challenge — पहचानो कौन?' },
      { property: 'og:description', content: 'Can you solve the puzzle fastest? Win +50 Bonus Points!' },
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
    desc: 'Level 1: 3×3 Grid · Maa Durga ki jyoti — light the way!',
    image: '/navratri-puzzle-art-0.jpg',
    aspectRatio: 1, // 3 / 3
  },
  {
    name: 'Medium',
    level: 1,
    cols: 4,
    rows: 3,
    art: '🌺',
    desc: 'Level 2: 4×3 Grid · Divine Navratri celebration.',
    image: '/navratri-puzzle-art-1.jpg',
    aspectRatio: 4 / 3, // 1.333
  },
  {
    name: 'Hard',
    level: 2,
    cols: 6,
    rows: 3,
    art: '💃',
    desc: 'Level 3: 6×3 Grid · Dandiya night celebration!',
    image: '/navratri-puzzle-art-2.jpg',
    aspectRatio: 6 / 3, // 2.0
  },
];

const LOCAL_STORAGE_KEY = 'pehchaan_navratri_puzzle_v2';

function getTodayIST(): string {
  const d = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffset);
  return istDate.toISOString().slice(0, 10);
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

function isSolvable(tiles: number[], cols: number, rows: number): boolean {
  const arr = tiles.filter(v => v !== tiles.length - 1);
  let inv = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) inv++;
    }
  }
  if (cols % 2 === 1) {
    return inv % 2 === 0;
  }
  const emptyRowFromBottom = rows - Math.floor(tiles.indexOf(tiles.length - 1) / cols);
  return (emptyRowFromBottom % 2 === 0) !== (inv % 2 === 0);
}

function generateSolvableTiles(cols: number, rows: number): number[] {
  const n = cols * rows;
  const tiles = [...Array(n).keys()];
  do {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
  } while (isSolved(tiles) || !isSolvable(tiles, cols, rows));
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
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => getSavedUserProfile());
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [fullNameInput, setFullNameInput] = useState<string>('');
  const [rollNoInput, setRollNoInput] = useState<string>('');
  const [courseInput, setCourseInput] = useState<string>('BCA');
  const [yearInput, setYearInput] = useState<string>('1st Sem');

  // Attempt & Submission Status
  const [hasAttemptedToday, setHasAttemptedToday] = useState<boolean>(false);
  const [serverExistingScore, setServerExistingScore] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    rank?: number;
    isTop10?: boolean;
    bonusPoints?: number;
  } | null>(null);

  // Puzzle Board State
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(0);
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(0);
  const [sessionElapsed, setSessionElapsed] = useState<number>(0);
  const [levelTimes, setLevelTimes] = useState<number[]>([0, 0, 0]);
  const [levelMovesArr, setLevelMovesArr] = useState<number[]>([0, 0, 0]);
  const [doneLevels, setDoneLevels] = useState<boolean[]>([false, false, false]);

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

  // Timer reference
  const sessionStartTsRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentLevel = LEVELS[currentLevelIdx] || LEVELS[0];
  const totalLiveSeconds = accumulatedSeconds + sessionElapsed;

  // 1. Fetch Admin Puzzle Config & Leaderboard
  useEffect(() => {
    async function initData() {
      setIsLoadingConfig(true);
      try {
        const cfgRes = await fetch('/api/puzzle/config');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setIsEnabled(cfg.enabled !== false);
        }
      } catch {
        setIsEnabled(true);
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
            setHasAttemptedToday(true);
            setServerExistingScore(data.existingScore);
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
    if (hasAttemptedToday) return;

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

          sessionStartTsRef.current = Date.now();
          return;
        }
      }
    } catch (e) {
      console.warn('Error reading saved puzzle state:', e);
    }

    // Fresh start for today
    const freshTiles = generateSolvableTiles(LEVELS[0].cols, LEVELS[0].rows);
    setTiles(freshTiles);
    setCurrentLevelIdx(0);
    setUnlockedLevel(0);
    setMoves(0);
    setAccumulatedSeconds(0);
    setSessionElapsed(0);
    setLevelTimes([0, 0, 0]);
    setLevelMovesArr([0, 0, 0]);
    setDoneLevels([false, false, false]);
    sessionStartTsRef.current = Date.now();
  }, [hasAttemptedToday, todayIST]);

  // 4. Live Timer Tick & Auto-Save
  useEffect(() => {
    if (hasAttemptedToday || doneLevels[currentLevelIdx] || isSubmitting) {
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
  }, [hasAttemptedToday, doneLevels, currentLevelIdx, isSubmitting]);

  // 5. Auto-Save State to LocalStorage on changes
  const saveStateToStorage = useCallback(
    (override?: Partial<PuzzleLocalState>) => {
      if (hasAttemptedToday) return;
      try {
        const currentElapsedNow = Math.floor((Date.now() - sessionStartTsRef.current) / 1000);
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
    if (hasAttemptedToday || doneLevels[currentLevelIdx]) return;

    const { cols } = currentLevel;
    const emptyIdx = tiles.indexOf(tiles.length - 1);
    if (emptyIdx === -1) return;

    const sameRow = Math.floor(index / cols) === Math.floor(emptyIdx / cols);
    const isAdjacent = sameRow ? Math.abs(index - emptyIdx) === 1 : Math.abs(index - emptyIdx) === cols;

    if (!isAdjacent) return;

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

    // If last level (Hard) solved, trigger auto-submit!
    if (isLast) {
      submitPuzzleScore(3, finalTotalSec, newLevelMoves.reduce((a, b) => a + b, 0), newLevelTimes, newLevelMoves);
    }
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
    setSessionElapsed(0);
    sessionStartTsRef.current = Date.now();

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
    saveStateToStorage({ tiles: shuffled });
  };

  // 10. Submit Score to Server (enforcing 1-attempt/day)
  const submitPuzzleScore = async (
    completedCount?: number,
    finalTotalSeconds?: number,
    finalTotalMoves?: number,
    timesArr?: number[],
    movesArr?: number[]
  ) => {
    let profile = getSavedUserProfile();
    if (!profile) {
      setShowProfileModal(true);
      return;
    }

    const count = completedCount ?? doneLevels.filter(Boolean).length;
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
        setHasAttemptedToday(true);
        setSubmissionResult(data);
        saveStateToStorage({ submitted: true });
        fetchLeaderboard();
      } else {
        alert(data.error || 'Failed to submit puzzle score.');
      }
    } catch (err: any) {
      alert(err?.message || 'Network error submitting puzzle score.');
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
            Top 10 fastest solvers receive <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">+50 Bonus Points</span>!
          </span>
        </p>
      </header>

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

      {/* 🏆 COMPLETED TODAY BANNER (Anti-Cheat 1-Attempt Record) */}
      {hasAttemptedToday && (
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
                  {serverExistingScore.completedLevels || 3}/3
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
              <div className="bg-white border-2 border-[#1C332E] rounded-xl p-3 shadow-[2px_2px_0px_#1C332E]">
                <span className="text-xs text-muted-foreground block">Speed Bonus</span>
                <span className="text-base font-extrabold text-pink-600 flex items-center justify-center gap-1">
                  {serverExistingScore.bonusAwarded ? '+50 pts 🌟' : 'Ranked'}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild className="bg-pink-600 hover:bg-pink-700 font-bold border-2 border-[#1C332E] shadow-[3px_3px_0px_#1C332E]">
              <Link to="/challenge">Play Daily Quiz Hunt <ArrowRight size={14} className="ml-1" /></Link>
            </Button>
            <Button asChild variant="outline" className="border-2 border-[#1C332E] font-bold">
              <Link to="/leaderboard">View Overall Standings</Link>
            </Button>
          </div>
        </div>
      )}

      {/* 🧩 MAIN PUZZLE INTERACTION CARD (Active Game) */}
      {!hasAttemptedToday && isEnabled && (
        <div className="bg-white border-3 border-[#1C332E] rounded-3xl p-4 sm:p-7 shadow-[6px_6px_0px_#1C332E] space-y-5">
          {/* Level Progress Indicator (Non-clickable: Once advanced, previous levels cannot be replayed) */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {LEVELS.map((lv, idx) => {
              const isCurrent = idx === currentLevelIdx;
              const isDone = doneLevels[idx];
              const isLocked = idx > currentLevelIdx;

              return (
                <div
                  key={lv.name}
                  className={`px-4 py-2 rounded-xl font-bold font-['Baloo_2'] text-sm sm:text-base border-2.5 border-[#1C332E] flex items-center gap-1.5 select-none transition-all ${
                    isCurrent
                      ? 'bg-pink-600 text-white shadow-[3px_3px_0px_#1C332E]'
                      : isDone
                      ? 'bg-white text-muted-foreground border-border/80'
                      : 'bg-muted/30 text-muted-foreground/60 border-dashed border-border'
                  }`}
                >
                  <span>{lv.art}</span>
                  <span>{isDone ? `✓ ${lv.name} (Done)` : isCurrent ? `${lv.name} (Playing)` : lv.name}</span>
                  {isLocked && <Lock size={12} className="ml-0.5 text-muted-foreground/60" />}
                </div>
              );
            })}
          </div>

          {/* HUD Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-pink-50/70 border-2 border-[#1C332E] rounded-2xl p-3 shadow-[2px_2px_0px_#1C332E]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-[#FBF0C8] border-2 border-[#1C332E] px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold text-[#1C332E]">
                <Timer size={15} />
                <span>⏱ {formatTime(totalLiveSeconds)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#BAE6FD] border-2 border-[#1C332E] px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold text-[#1C332E]">
                <span>🎯 Moves: {moves}</span>
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReshuffle}
              disabled={doneLevels[currentLevelIdx]}
              className="h-8 text-xs font-bold border-2 border-[#1C332E] bg-white hover:bg-amber-50"
            >
              <Shuffle size={13} className="mr-1" /> Reshuffle
            </Button>
          </div>

          {/* Sliding Puzzle Grid */}
          <div className="w-full max-w-[540px] mx-auto">
            <div
              className="grid gap-1.5 sm:gap-2 w-full border-3 border-[#1C332E] rounded-2xl p-2 sm:p-3 bg-[#1C332E] shadow-[5px_5px_0px_#B82348] select-none touch-manipulation"
              style={{
                gridTemplateColumns: `repeat(${currentLevel.cols}, minmax(0, 1fr))`,
                aspectRatio: `${currentLevel.aspectRatio}`,
              }}
            >
              {tiles.map((tileVal, idx) => {
                const emptyVal = tiles.length - 1;
                const isEmpty = tileVal === emptyVal;

                if (isEmpty) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="w-full h-full rounded-lg sm:rounded-xl border-2 border-dashed border-white/30 bg-black/25 flex items-center justify-center"
                    >
                      <span className="text-[10px] text-white/20 font-mono">blank</span>
                    </div>
                  );
                }

                // Tile Slice CSS Math
                const cols = currentLevel.cols;
                const rows = currentLevel.rows;
                const posX = (tileVal % cols) * (100 / (cols - 1));
                const posY = Math.floor(tileVal / cols) * (100 / (rows - 1));

                return (
                  <button
                    key={`tile-${tileVal}`}
                    onClick={() => handleTileClick(idx)}
                    className="relative w-full h-full rounded-lg sm:rounded-xl border-2 border-[#1C332E] cursor-pointer hover:brightness-110 active:scale-95 transition-transform overflow-hidden shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    style={{
                      backgroundImage: `url(${currentLevel.image})`,
                      backgroundSize: `${cols * 100}% ${rows * 100}%`,
                      backgroundPosition: `${posX}% ${posY}%`,
                      backgroundRepeat: 'no-repeat',
                    }}
                    aria-label={`Move tile`}
                  />
                );
              })}
            </div>
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
      <div className="bg-white border-3 border-[#1C332E] rounded-3xl p-5 sm:p-7 shadow-[6px_6px_0px_#1C332E] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-border/70 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground font-['Baloo_2']">
                Today's Speed Leaderboard ⚡
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-300">
                Top 10 win +50 pts
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
            <div className="w-12 h-12 mx-auto rounded-full bg-pink-50 border-2 border-[#1C332E] flex items-center justify-center text-pink-600 font-bold text-xl">
              <Sparkles size={22} />
            </div>
            <p className="font-semibold text-sm text-foreground">No puzzle submissions yet today!</p>
            <p className="text-xs max-w-sm mx-auto">
              Be the first to unscramble the tiles and claim the #1 spot with +50 Bonus Points!
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
                  <th className="py-2.5 px-3 text-right">Time</th>
                  <th className="py-2.5 px-3 text-right">Moves</th>
                  <th className="py-2.5 px-3 text-right">Bonus Points</th>
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

                      <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                        {formatTime(entry.totalTimeSeconds)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                        {entry.totalMoves}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {isTop10 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-extrabold text-xs border border-pink-300">
                            <Star size={11} className="fill-pink-600" /> +50 pts
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🌟 LEVEL COMPLETE / PROCEED MODAL */}
      {showLevelModal && completedLevelInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#1C332E] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[8px_8px_0px_#B82348] text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-4xl animate-bounce">
              {completedLevelInfo.isLast ? '🏆🎉🏆' : '🎉✨🎉'}
            </div>

            <h3 className="text-2xl font-extrabold text-pink-700 font-['Baloo_2']">
              {completedLevelInfo.isLast
                ? 'Sab Levels Complete! 🏆'
                : `${LEVELS[completedLevelInfo.level].name} Complete!`}
            </h3>

            <p className="text-sm text-muted-foreground">
              {completedLevelInfo.isLast ? (
                <>
                  You completed all 3 levels in{' '}
                  <span className="font-bold text-foreground font-mono">
                    {formatTime(completedLevelInfo.time)}
                  </span>{' '}
                  with{' '}
                  <span className="font-bold text-foreground font-mono">
                    {completedLevelInfo.moves} moves
                  </span>
                  . Tumne poora puzzle jeet liya — Shubh Navratri! 🌸
                </>
              ) : (
                <>
                  Completed in{' '}
                  <span className="font-bold text-foreground font-mono">
                    {formatTime(completedLevelInfo.time)}
                  </span>{' '}
                  with{' '}
                  <span className="font-bold text-foreground font-mono">
                    {completedLevelInfo.moves} moves
                  </span>
                  .{' '}
                  <span className="block mt-1 font-bold text-foreground">
                    Kya {LEVELS[completedLevelInfo.level + 1].name} level kheloge?
                  </span>
                </>
              )}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              {!completedLevelInfo.isLast ? (
                <>
                  <Button
                    onClick={() => proceedToNextLevel(completedLevelInfo.level + 1)}
                    className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700 text-white font-bold border-2 border-[#1C332E] shadow-[3px_3px_0px_#1C332E]"
                  >
                    Yes, Play {LEVELS[completedLevelInfo.level + 1].name}! 🌺
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowLevelModal(false);
                      submitPuzzleScore(completedLevelInfo.level + 1);
                    }}
                    className="w-full sm:w-auto border-2 border-[#1C332E] font-bold text-xs"
                  >
                    Submit Score Now
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setShowLevelModal(false)}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold border-2 border-[#1C332E] shadow-[3px_3px_0px_#1C332E]"
                >
                  Awesome, View My Ranking! 🌟
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
              Please enter your academic details to submit puzzle scores and claim the +50 speed bonus points!
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Hasini Sharma"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  className="border-2 border-[#1C332E] font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Enrollment / Roll No <span className="text-muted-foreground font-normal">(Recommended)</span>
                </label>
                <Input
                  placeholder="e.g. A2305221001"
                  value={rollNoInput}
                  onChange={(e) => setRollNoInput(e.target.value)}
                  className="border-2 border-[#1C332E] font-mono font-medium"
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
    </div>
  );
}
