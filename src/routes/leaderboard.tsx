import { createFileRoute, Link, useSearch } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';
import {
  Trophy,
  Search,
  ArrowRight,
  Crown,
  Calendar,
  Medal,
  Award,
  Zap,
  GraduationCap,
  X,
  Star,
  User,
  Clock,
  CheckCircle2,
  Share2,
  Sparkles,
  Lock,
  Flower2,
} from 'lucide-react';
import { ShareCardModal } from '@/components/share-card-modal';
import { Button } from '@/components/ui/button';
import { DiyaIcon } from '@/components/diya-icon';
import { Input } from '@/components/ui/input';
import {
  getLeaderboardEntries,
  getOverallLeaderboard,
  syncLeaderboardWithServer,
  getSavedUserProfile,
  type LeaderboardEntry,
  type OverallLeaderboardEntry,
} from '@/lib/leaderboard-store';
import { DAILY_QUIZZES } from '@/data/quiz';
import {
  getLiveDays,
  syncLiveDaysWithServer,
  getLeaderboardConfig,
  syncLeaderboardConfigWithServer,
  type LeaderboardConfig,
} from '@/lib/admin-store';

const BEST_KEY_PREFIX = 'pehchaan-kaun-best-day-';

export const Route = createFileRoute('/leaderboard')({
  validateSearch: (search: Record<string, unknown>): { day?: number; view?: string } => {
    const d = Number(search?.day);
    const v = String(search?.view || '');
    return {
      day: !isNaN(d) && d >= 1 && d <= 10 ? d : undefined,
      view: v === 'daily' ? 'daily' : 'overall',
    };
  },
  head: () => ({
    meta: [
      { title: 'Leaderboard — पहचानो कौन?' },
      { name: 'description', content: 'Explore the fastest minds and herstory champions ranked by speed and accuracy.' },
      { property: 'og:title', content: 'Leaderboard — पहचानो कौन?' },
      { property: 'og:description', content: 'Overall and day-wise rankings for Unsung Heroines of India.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Leaderboard,
});

// 🌸 Festive "Stay Tuned" Suspense Announcement Component
function StayTunedAnnouncement({
  day,
  isOverall,
  message,
}: {
  day?: number;
  isOverall?: boolean;
  message?: string;
}) {
  return (
    <div className="relative bg-[#FFF7F8] border-4 border-[#1C332E] rounded-3xl p-6 sm:p-10 md:p-12 shadow-[8px_8px_0px_#B82348] text-center max-w-3xl mx-auto my-6 sm:my-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
      {/* Decorative Washi Tape Top Tab */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FBF0C8] border-2 border-[#1C332E] px-6 py-1 rounded-sm shadow-[2px_2px_0px_#1C332E] text-xs font-black uppercase tracking-widest text-[#1C332E] rotate-[-1deg]">
        🌸 SHUBH NAVRATRI · SACRED SUSPENSE 🌸
      </div>

      {/* Floating Floral & Diya Icons */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <span className="text-3xl animate-bounce">🪔</span>
        <div className="w-14 h-14 rounded-full bg-[#FCE7F0] border-2 border-[#1C332E] flex items-center justify-center text-[#B82348] shadow-[3px_3px_0px_#1C332E]">
          <Flower2 size={28} />
        </div>
        <span className="text-3xl animate-bounce delay-150">🌺</span>
      </div>

      {/* Eyebrow badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4F4E2] border-2 border-[#1C332E] text-[#1C332E] text-xs font-extrabold tracking-wider shadow-[2px_2px_0px_#1C332E]">
        <Sparkles size={14} className="text-[#B82348]" />
        {isOverall ? 'FINAL CHAMPIONSHIP IN SUSPENSE' : `DAY ${String(day).padStart(2, '0')} REVEAL LOCKED`}
      </div>

      {/* Headline */}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#1C332E] font-['Baloo_2'] tracking-tight">
        Stay Tuned!
      </h2>

      {/* Main Required Announcement Message */}
      <div className="bg-white border-2 border-[#1C332E] rounded-2xl p-5 sm:p-6 max-w-xl mx-auto shadow-[4px_4px_0px_#1C332E]">
        <p className="text-base sm:text-lg font-bold text-[#B82348] leading-relaxed">
          “{message || 'The celebration is not over yet. Stay tuned for the final reveal!'}”
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-3 leading-relaxed">
          To preserve the sacred thrill and honor all courageous participants across India, final rankings, scores, and winner details are held in celebratory suspense until the official conclusion ceremony.
        </p>
      </div>

      {/* Subtle festive note */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-muted-foreground pt-2">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-emerald-600" /> All attempts &amp; scores safely recorded
        </span>
        <span className="flex items-center gap-1.5">
          <Star size={14} className="text-amber-500 fill-amber-500" /> Official champions revealed at finale
        </span>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
        <Button
          asChild
          className="w-full sm:w-auto font-black text-xs sm:text-sm h-11 px-6 rounded-2xl bg-[#B82348] hover:bg-[#961c3b] text-white border-2 border-[#1C332E] shadow-[3px_3px_0px_#1C332E] cursor-pointer"
        >
          <Link to="/heroines">
            Explore Heroines &amp; Reflect 🌸
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          className="w-full sm:w-auto font-bold text-xs sm:text-sm h-11 px-6 rounded-2xl border-2 border-[#1C332E] bg-white hover:bg-[#FCE7F0] text-[#1C332E] shadow-[3px_3px_0px_#1C332E] cursor-pointer"
        >
          <Link to="/challenge">
            Play Daily Challenge ⚡
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Leaderboard() {
  const search = useSearch({ from: '/leaderboard' });
  const [liveDays, setLiveDays] = useState<number[]>(() => getLiveDays());

  // Leaderboard Suspense Config State
  const [leaderboardConfig, setLeaderboardConfig] = useState<LeaderboardConfig>(() => getLeaderboardConfig());

  const [activeTab, setActiveTab] = useState<'overall' | 'daily'>(
    search.day ? 'daily' : search.view === 'daily' ? 'daily' : 'overall'
  );
  const [selectedDay, setSelectedDay] = useState<number>(search.day || liveDays[0] || 1);
  const [searchQuery, setSearchQuery] = useState('');

  const [overallList, setOverallList] = useState<OverallLeaderboardEntry[]>([]);
  const [dailyList, setDailyList] = useState<LeaderboardEntry[]>([]);
  const [userBest, setUserBest] = useState<number>(0);
  const [selectedUserDetail, setSelectedUserDetail] = useState<OverallLeaderboardEntry | LeaderboardEntry | null>(null);
  const [shareCardData, setShareCardData] = useState<{
    day: number;
    dayTitle: string;
    points: number;
    maxPoints: number;
    timeTaken: number;
    firstTryCount: number;
    totalQuestions: number;
    rank: number;
    fullName: string;
    course?: string;
    year?: string;
    tier: string;
  } | null>(null);

  // Active / open days currently enabled by admin
  const openDays = useMemo(() => {
    const list = Array.isArray(liveDays) && liveDays.length > 0 ? liveDays : [1];
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [liveDays]);

  const overallMaxScore = useMemo(() => {
    return openDays.reduce((sum, d) => sum + (d === 10 ? 100 : 30), 0);
  }, [openDays]);

  const overallTotalQuestions = useMemo(() => {
    return openDays.reduce((sum, d) => sum + (d === 10 ? 10 : 3), 0);
  }, [openDays]);

  const handleOpenShare = (entry: any, rank: number = 1, forDay?: number) => {
    if (!entry) return;
    const isOverall = !forDay && !entry.day && 'totalPoints' in entry;
    if (isOverall) {
      const maxPoints = overallMaxScore;
      const points = Math.min(entry.totalPoints ?? 0, maxPoints);
      const totalQuestions = overallTotalQuestions;
      const firstTryCount = Math.min(entry.firstTryTotal ?? 0, totalQuestions);
      const timeTaken = entry.totalTimeSeconds ?? 0;
      const tier = points >= maxPoints ? 'Herstory Champion' : points >= Math.round(maxPoints * 0.66) ? 'Curiosity Star' : 'Brave Explorer';
      const latestLiveDay = openDays[openDays.length - 1] || 1;

      setShareCardData({
        day: latestLiveDay,
        dayTitle: `Overall Championship (${openDays.length} Chapters Active)`,
        points,
        maxPoints,
        timeTaken,
        firstTryCount,
        totalQuestions,
        rank,
        fullName: entry.fullName || entry.username || 'Explorer',
        course: entry.course || 'BCA',
        year: entry.year || '1st Sem',
        tier,
      });
      return;
    }

    const targetDay = forDay || entry.day || selectedDay || 1;
    const quiz = DAILY_QUIZZES.find(q => q.day === targetDay) || DAILY_QUIZZES[0];
    const totalQuestions = quiz.questions?.length || 3;
    const maxPoints = totalQuestions * 10;
    const dayScore = entry.dayBreakdown?.find((d: any) => d.day === targetDay);
    const points = Math.min(dayScore?.points ?? entry.points ?? 30, maxPoints);
    const timeTaken = dayScore?.timeSeconds ?? entry.timeSeconds ?? entry.totalTimeSeconds ?? 0;
    const firstTryCount = Math.min(dayScore?.firstTryCount ?? entry.firstTryCount ?? 3, totalQuestions);
    const tier = points >= maxPoints ? 'Herstory Champion' : points >= 20 ? 'Curiosity Star' : 'Brave Explorer';

    setShareCardData({
      day: targetDay,
      dayTitle: quiz.title,
      points,
      maxPoints,
      timeTaken,
      firstTryCount,
      totalQuestions,
      rank,
      fullName: entry.fullName || entry.username || 'Explorer',
      course: entry.course || 'BCA',
      year: entry.year || '1st Sem',
      tier,
    });
  };

  const loadData = (daysToUse: number[] = liveDays) => {
    const active = daysToUse && daysToUse.length > 0 ? daysToUse : [1];
    setOverallList(getOverallLeaderboard(active));
    setDailyList(getLeaderboardEntries(selectedDay));
    try {
      setUserBest(Number(localStorage.getItem(`${BEST_KEY_PREFIX}${selectedDay}`)) || 0);
    } catch {
      setUserBest(0);
    }
  };

  useEffect(() => {
    loadData(liveDays);
  }, [liveDays, selectedDay]);

  useEffect(() => {
    syncLiveDaysWithServer().then(days => {
      setLiveDays(days);
    });
    syncLeaderboardConfigWithServer().then(cfg => {
      setLeaderboardConfig(cfg);
    });
    syncLeaderboardWithServer().then(() => {
      loadData(getLiveDays());
    });
    const handleUpdate = () => {
      const days = getLiveDays();
      setLiveDays(days);
      setLeaderboardConfig(getLeaderboardConfig());
    };
    window.addEventListener('pehchaan_leaderboard_updated', handleUpdate);
    window.addEventListener('pehchaan_live_days_changed', handleUpdate);
    window.addEventListener('pehchaan_leaderboard_config_changed', handleUpdate);
    return () => {
      window.removeEventListener('pehchaan_leaderboard_updated', handleUpdate);
      window.removeEventListener('pehchaan_live_days_changed', handleUpdate);
      window.removeEventListener('pehchaan_leaderboard_config_changed', handleUpdate);
    };
  }, []);

  // Whether current view is in suspense
  const isSuspenseActive = useMemo(() => {
    // Suspense must be enabled in config
    if (!leaderboardConfig.suspenseEnabled) {
      return false;
    }

    const hideDay = typeof leaderboardConfig.hideFromDay === 'number' ? leaderboardConfig.hideFromDay : 8;

    if (activeTab === 'daily') {
      // For Day-wise tab: hide if selectedDay >= hideDay (e.g. Day 8, 9, 10)
      return selectedDay >= hideDay;
    } else {
      // For Overall Championship tab: hide if the competition has reached Day 8+
      const latestLive = openDays[openDays.length - 1] || 1;
      return latestLive >= hideDay;
    }
  }, [leaderboardConfig, activeTab, selectedDay, openDays]);

  const filteredOverall = useMemo(() => {
    if (!searchQuery.trim()) return overallList;
    const q = searchQuery.toLowerCase();
    return overallList.filter(
      e =>
        e.username.toLowerCase().includes(q) ||
        e.fullName?.toLowerCase().includes(q) ||
        e.course?.toLowerCase().includes(q)
    );
  }, [overallList, searchQuery]);

  const filteredDaily = useMemo(() => {
    if (!searchQuery.trim()) return dailyList;
    const q = searchQuery.toLowerCase();
    return dailyList.filter(
      e =>
        e.username.toLowerCase().includes(q) ||
        e.fullName?.toLowerCase().includes(q) ||
        e.course?.toLowerCase().includes(q)
    );
  }, [dailyList, searchQuery]);

  const currentUserDayEntry = useMemo(() => {
    const profile = getSavedUserProfile();
    if (!profile) return null;
    const cleanRoll = (profile.rollNo || '').trim().toUpperCase();
    const cleanName = (profile.fullName || profile.username || '').trim().toLowerCase();
    if (!cleanRoll && !cleanName) return null;
    return (
      dailyList.find(e => {
        const eRoll = (e.rollNo || '').trim().toUpperCase();
        const eName = (e.fullName || e.username || '').trim().toLowerCase();
        return (cleanRoll && eRoll === cleanRoll) || (cleanName && eName === cleanName);
      }) || null
    );
  }, [dailyList]);

  const userDayRank = useMemo(() => {
    if (!currentUserDayEntry) return 0;
    const idx = dailyList.findIndex(e => e.id === currentUserDayEntry.id);
    return idx >= 0 ? idx + 1 : 0;
  }, [dailyList, currentUserDayEntry]);

  const currentDayUserBest = useMemo(() => {
    if (currentUserDayEntry) {
      return Math.max(currentUserDayEntry.points, userBest);
    }
    return userBest;
  }, [currentUserDayEntry, userBest]);

  const currentQuiz = DAILY_QUIZZES.find(q => q.day === selectedDay) || DAILY_QUIZZES[0];

  return (
    <main className="wrap section pb-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="eyebrow mb-2">
          <Star size={15} className="text-amber-500 fill-amber-500 inline mr-1" /> HERSTORY PODIUM &amp; STANDINGS
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          Leaderboard Rankings
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-2">
          Ranked by highest score first, followed by fastest completion time.
        </p>

        {/* Clean Segmented Tab Switcher */}
        <div className="inline-flex p-1 bg-muted/80 rounded-2xl border border-border mt-6 shadow-xs max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('overall')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === 'overall'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy size={14} className="shrink-0" />
            <span className="hidden sm:inline">Overall Championship (Main)</span>
            <span className="sm:hidden">Overall</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-secondary text-secondary-foreground border border-border shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar size={14} className="shrink-0" />
            <span className="hidden sm:inline">Day-wise Standings</span>
            <span className="sm:hidden">Day-wise</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERALL MAIN CHAMPIONSHIP */}
      {/* ========================================================================= */}
      {activeTab === 'overall' && (
        isSuspenseActive ? (
          <StayTunedAnnouncement isOverall message={leaderboardConfig.announcementMessage} />
        ) : (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-4xl mx-auto">
            <div className="text-xs font-semibold text-muted-foreground">
              Cumulative score &amp; speed across all chapters. Click any card or row to view student details.
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, course..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs bg-background font-medium border"
              />
            </div>
          </div>

          {/* 3-STEP PODIUM (Rank 1 Center, Rank 2 Left, Rank 3 Right) */}
          {filteredOverall.length >= 3 && !searchQuery && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-8 items-end">
              {/* #2 PODIUM STEP (LEFT - SOFT BUTTER / WARM GOLD) */}
              <div
                onClick={() => setSelectedUserDetail(filteredOverall[1])}
                className="order-2 md:order-1 rounded-2xl p-5 text-center flex flex-col justify-between relative shadow-sm bg-[var(--butter)]/55 dark:bg-amber-950/20 border-2 border-amber-300/70 dark:border-amber-800/60 hover:-translate-y-1 transition-all cursor-pointer group md:h-[275px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-950 dark:text-amber-200 border border-amber-300/50 flex items-center gap-1">
                    <Medal size={12} className="text-amber-600" /> Rank 2
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Share Scorecard"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenShare(filteredOverall[1], 2);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-background hover:bg-[var(--butter)] text-foreground border border-amber-400 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Share2 size={11} className="text-primary shrink-0" />
                      <span>Share</span>
                    </button>
                    <span className="text-xs font-mono font-black text-amber-800/80 dark:text-amber-400">#2</span>
                  </div>
                </div>

                <div className="py-2">
                  <div className="w-12 h-12 rounded-full bg-amber-400/25 text-amber-950 dark:text-amber-200 mx-auto flex items-center justify-center font-black text-lg mb-2 shadow-xs border border-amber-400/60">
                    2
                  </div>
                  <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors truncate">
                    {filteredOverall[1]?.fullName || filteredOverall[1]?.username}
                  </h3>
                  {filteredOverall[1]?.course && (
                    <span className="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-background/80 text-foreground border border-border">
                      {filteredOverall[1]?.course}
                    </span>
                  )}
                  <div className="inline-flex items-center gap-1 mt-2 text-xs font-mono font-bold text-muted-foreground bg-background/70 px-2.5 py-0.5 rounded-full border border-border">
                    <Zap size={12} className="text-amber-600" /> {filteredOverall[1]?.totalTimeSeconds}s • {filteredOverall[1]?.daysCompleted}/{openDays.length} day
                  </div>
                </div>

                <div className="pt-2.5 border-t border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground uppercase font-bold">Total Score</span>
                  <span className="font-black text-lg text-foreground">
                    {filteredOverall[1]?.totalPoints ?? 0}/{overallMaxScore}
                  </span>
                </div>
              </div>

              {/* #1 PODIUM STEP (CENTER - TALLEST - SOFT PETAL / ROSE) */}
              <div
                onClick={() => setSelectedUserDetail(filteredOverall[0])}
                className="order-1 md:order-2 rounded-2xl p-6 text-center flex flex-col justify-between relative shadow-md bg-[var(--petal)]/80 dark:bg-rose-950/25 border-2 border-primary/40 dark:border-primary/50 hover:-translate-y-1 transition-all cursor-pointer group md:h-[310px]"
              >
                {/* Gold Star Floating Badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[var(--butter)] text-foreground px-3 py-0.5 rounded-full shadow-xs font-black text-[11px] flex items-center gap-1 border border-border">
                  <Star size={12} className="fill-amber-500 text-amber-600" /> 1ST PLACE
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 flex items-center gap-1">
                    <Crown size={12} /> Grand Champion
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Share Champion Scorecard"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenShare(filteredOverall[0], 1);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-background hover:bg-[var(--butter)] text-foreground border border-primary/40 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Share2 size={11} className="text-primary shrink-0" />
                      <span>Share</span>
                    </button>
                    <span className="text-xs font-mono font-black text-primary">#1</span>
                  </div>
                </div>

                <div className="py-2">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground mx-auto flex items-center justify-center font-black text-xl mb-2 shadow-sm border-2 border-primary/60">
                    1
                  </div>
                  <h3 className="font-black text-lg text-foreground group-hover:text-primary transition-colors truncate">
                    {filteredOverall[0]?.fullName || filteredOverall[0]?.username}
                  </h3>
                  {filteredOverall[0]?.course && (
                    <span className="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-background/90 text-foreground border border-border">
                      {filteredOverall[0]?.course} • {filteredOverall[0]?.year}
                    </span>
                  )}
                  <div className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-muted-foreground font-mono bg-background/80 border border-border px-2.5 py-0.5 rounded-full">
                    <Zap size={12} className="text-primary" /> {filteredOverall[0]?.totalTimeSeconds}s • {filteredOverall[0]?.daysCompleted}/{openDays.length} day
                  </div>
                </div>

                <div className="pt-2.5 border-t border-primary/20 dark:border-rose-900/60 flex items-center justify-between">
                  <span className="text-[11px] text-primary uppercase font-black">Champion Score</span>
                  <span className="font-black text-2xl text-primary">
                    {filteredOverall[0]?.totalPoints ?? 0}/{overallMaxScore}
                  </span>
                </div>
              </div>

              {/* #3 PODIUM STEP (RIGHT - SOFT SKY BLUE) */}
              <div
                onClick={() => setSelectedUserDetail(filteredOverall[2])}
                className="order-3 rounded-2xl p-5 text-center flex flex-col justify-between relative shadow-sm bg-[var(--sky)]/55 dark:bg-sky-950/20 border-2 border-sky-300/70 dark:border-sky-800/60 hover:-translate-y-1 transition-all cursor-pointer group md:h-[260px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-950 dark:text-sky-200 border border-sky-300/50 flex items-center gap-1">
                    <Award size={12} className="text-sky-600" /> Rank 3
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Share Scorecard"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenShare(filteredOverall[2], 3);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-background hover:bg-[var(--butter)] text-foreground border border-sky-400 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Share2 size={11} className="text-primary shrink-0" />
                      <span>Share</span>
                    </button>
                    <span className="text-xs font-mono font-black text-sky-800/80 dark:text-sky-400">#3</span>
                  </div>
                </div>

                <div className="py-2">
                  <div className="w-12 h-12 rounded-full bg-sky-400/25 text-sky-950 dark:text-sky-200 mx-auto flex items-center justify-center font-black text-lg mb-2 shadow-xs border border-sky-400/60">
                    3
                  </div>
                  <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors truncate">
                    {filteredOverall[2]?.fullName || filteredOverall[2]?.username}
                  </h3>
                  {filteredOverall[2]?.course && (
                    <span className="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-background/80 text-foreground border border-border">
                      {filteredOverall[2]?.course}
                    </span>
                  )}
                  <div className="inline-flex items-center gap-1 mt-2 text-xs font-mono font-bold text-muted-foreground bg-background/70 px-2.5 py-0.5 rounded-full border border-border">
                    <Zap size={12} className="text-sky-600" /> {filteredOverall[2]?.totalTimeSeconds}s • {filteredOverall[2]?.daysCompleted}/{openDays.length} day
                  </div>
                </div>

                <div className="pt-2.5 border-t border-sky-200/80 dark:border-sky-900/60 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground uppercase font-bold">Total Score</span>
                  <span className="font-black text-lg text-foreground">
                    {filteredOverall[2]?.totalPoints ?? 0}/{overallMaxScore}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Clean & High-Contrast Overall Table */}
          <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-primary" />
                <span className="font-extrabold text-sm text-foreground">Overall Tournament Standings</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono font-bold">
                {filteredOverall.length} Players Tracked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b border-border text-muted-foreground text-xs font-extrabold uppercase tracking-wider">
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 w-12 sm:w-20 text-center">Rank</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4">Player &amp; Course</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-center">Points</th>
                    <th className="py-3 px-4 text-center hidden md:table-cell">Speed</th>
                    <th className="py-3 px-4 text-center hidden md:table-cell">Chapters</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOverall.map((entry, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr
                        key={entry.username}
                        onClick={() => setSelectedUserDetail(entry)}
                        className={`cursor-pointer transition-colors ${
                          rank === 1
                            ? 'bg-primary/5 hover:bg-primary/10'
                            : rank === 2
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : rank === 3
                            ? 'bg-sky-500/5 hover:bg-sky-500/10'
                            : 'hover:bg-muted/40'
                        }`}
                      >
                        <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center font-mono">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/15 text-primary border border-primary/30">
                              #1
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center justify-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300">
                              #2
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center justify-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-500/15 text-sky-900 dark:text-sky-200 border border-sky-300">
                              #3
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-extrabold text-xs">#{rank}</span>
                          )}
                        </td>

                        <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 font-bold text-foreground">
                          <div className="flex items-center gap-2 sm:gap-2.5">
                            <div
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                rank === 1
                                  ? 'bg-primary/15 text-primary border border-primary/30'
                                  : rank === 2
                                  ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300'
                                  : rank === 3
                                  ? 'bg-sky-500/20 text-sky-900 dark:text-sky-200 border border-sky-300'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              {entry.username.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-foreground text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[180px] md:max-w-[240px]">
                                {entry.fullName || entry.username}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {entry.course && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-muted border border-border text-foreground text-[9px] sm:text-[10px] font-bold">
                                    {entry.course}
                                  </span>
                                )}
                                {entry.year && (
                                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-semibold">
                                    • {entry.year}
                                  </span>
                                )}
                                <span className="text-[9px] text-muted-foreground font-mono md:hidden">
                                  • ⚡{entry.totalTimeSeconds}s • {entry.daysCompleted}/{openDays.length} day
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center">
                          <span className="font-black text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                            {entry.totalPoints}/{overallMaxScore}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-lg border border-border">
                            ⚡ {entry.totalTimeSeconds}s
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center hidden md:table-cell">
                          <span className="px-2.5 py-0.5 rounded-full bg-muted border border-border text-foreground text-xs font-bold font-mono">
                            {entry.daysCompleted}/{openDays.length} Day
                          </span>
                        </td>

                        <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 sm:gap-1.5 justify-end">
                            <button
                              type="button"
                              title="Share Scorecard to BeSocial"
                              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-xs font-bold bg-[var(--butter)] hover:bg-amber-200 text-foreground border border-amber-300 dark:border-amber-800 transition-all cursor-pointer hover:scale-105 active:scale-95"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenShare(entry, rank);
                              }}
                            >
                              <Share2 size={11} className="text-primary shrink-0" />
                              <span>Share</span>
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-1.5 sm:px-2 text-muted-foreground hover:text-foreground font-semibold cursor-pointer hidden sm:inline-flex"
                              onClick={() => setSelectedUserDetail(entry)}
                            >
                              View <ArrowRight size={11} className="ml-0.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredOverall.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm font-medium">
                        No scores recorded yet. Complete today’s challenge to be the first champion on the leaderboard!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DAY-WISE STANDINGS */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Day Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {DAILY_QUIZZES.map(quiz => {
              const isSelected = selectedDay === quiz.day;
              const isLive = liveDays.includes(quiz.day);
              const hideDay = typeof leaderboardConfig.hideFromDay === 'number' ? leaderboardConfig.hideFromDay : 8;
              const isLockedSuspense = leaderboardConfig.suspenseEnabled && quiz.day >= hideDay;
              return (
                <Button
                  key={quiz.day}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDay(quiz.day)}
                  className={`shrink-0 text-xs gap-1.5 h-8.5 rounded-xl font-black border transition-all ${
                    isSelected ? 'bg-secondary text-secondary-foreground border-secondary-foreground/40 shadow-xs' : 'border-border'
                  }`}
                >
                  <span>Day {String(quiz.day).padStart(2, '0')}</span>
                  {isLive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  {isLockedSuspense && <Lock size={10} className="text-amber-600 ml-0.5" title="Locked in suspense" />}
                </Button>
              );
            })}
          </div>

          {isSuspenseActive ? (
            <StayTunedAnnouncement day={selectedDay} message={leaderboardConfig.announcementMessage} />
          ) : (
            <>
          {/* Active Day Banner */}
          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="text-xs font-mono font-extrabold uppercase text-primary">
                DAY {String(currentQuiz.day).padStart(2, '0')} STANDINGS • {currentQuiz.date}
              </span>
              <h2 className="font-extrabold text-xl mt-0.5 text-foreground">{currentQuiz.title}</h2>
              <p className="text-xs font-medium text-muted-foreground">{currentQuiz.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" asChild className="gap-1.5 text-xs font-extrabold shadow-xs">
                <Link to="/challenge" search={{ day: selectedDay }}>
                  Play Day {String(selectedDay).padStart(2, '0')} <ArrowRight size={13} />
                </Link>
              </Button>
            </div>
          </div>

          {/* User Personal Best for this day */}
          {currentDayUserBest > 0 && (
            <div className="quiz-best-band flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <DiyaIcon size={16} className="text-amber-600 inline" />
                <span className="font-bold">Day {String(selectedDay).padStart(2, '0')} Personal Best:</span>
                <span className="font-black text-primary px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-xs sm:text-sm">
                  {currentDayUserBest}/{selectedDay === 10 ? 100 : 30}
                </span>
                {currentUserDayEntry && (
                  <span className="text-xs text-muted-foreground font-mono font-bold flex items-center gap-1.5 ml-1">
                    • ⚡ {currentUserDayEntry.timeSeconds}s
                    {userDayRank > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-foreground font-sans">
                        Rank #{userDayRank}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const entryToShare = currentUserDayEntry || {
                    points: currentDayUserBest,
                    fullName: getSavedUserProfile()?.fullName || 'Participant',
                    username: getSavedUserProfile()?.username || 'participant',
                    timeSeconds: 0,
                    firstTryCount: 3,
                    totalQuestions: 3,
                  };
                  handleOpenShare(entryToShare, userDayRank || 1, selectedDay);
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-[var(--butter)] hover:bg-amber-200 text-foreground border border-amber-300 dark:border-amber-800 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              >
                <Share2 size={12} className="text-primary shrink-0" />
                <span>Share My Scorecard</span>
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground font-mono font-bold">
              {filteredDaily.length} {filteredDaily.length === 1 ? 'Score' : 'Scores'} recorded
            </span>
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search player, course..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs bg-background font-medium border"
              />
            </div>
          </div>

          {/* Day Table */}
          <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b border-border text-muted-foreground text-xs font-extrabold uppercase tracking-wider">
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 w-12 sm:w-20 text-center">Rank</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4">Player &amp; Course</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-center">Points</th>
                    <th className="py-3 px-4 text-center hidden md:table-cell">Speed</th>
                    <th className="py-3 px-4 text-center hidden md:table-cell">Attempt</th>
                    <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDaily.map((entry, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr
                        key={entry.id}
                        onClick={() => setSelectedUserDetail(entry)}
                        className={`cursor-pointer transition-colors ${
                          rank === 1
                            ? 'bg-primary/5 hover:bg-primary/10'
                            : rank === 2
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : rank === 3
                            ? 'bg-sky-500/5 hover:bg-sky-500/10'
                            : 'hover:bg-muted/40'
                        }`}
                      >
                        <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center font-mono">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/15 text-primary border border-primary/30">
                              #1
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center justify-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300">
                              #2
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center justify-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-500/15 text-sky-900 dark:text-sky-200 border border-sky-300">
                              #3
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-extrabold text-xs">#{rank}</span>
                          )}
                        </td>

                        <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 font-bold text-foreground">
                          <div className="flex items-center gap-2 sm:gap-2.5">
                            <div
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                rank === 1
                                  ? 'bg-primary/15 text-primary border border-primary/30'
                                  : rank === 2
                                  ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300'
                                  : rank === 3
                                  ? 'bg-sky-500/20 text-sky-900 dark:text-sky-200 border border-sky-300'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              {entry.username.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-foreground text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[180px]">
                                {entry.fullName || entry.username}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {entry.course && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-muted border border-border text-foreground text-[9px] sm:text-[10px] font-bold">
                                    {entry.course}
                                  </span>
                                )}
                                {entry.year && (
                                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-semibold">
                                    • {entry.year}
                                  </span>
                                )}
                                <span className="text-[9px] text-muted-foreground font-mono md:hidden">
                                  • ⚡{entry.timeSeconds}s
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center">
                          <span className="font-black text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                            {entry.points}/{(currentQuiz.questions?.length || 3) * 10}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-lg border border-border">
                            ⚡ {entry.timeSeconds}s
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-xs text-foreground font-bold hidden md:table-cell">
                          1/1
                        </td>

                        <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 sm:gap-1.5 justify-end">
                            <button
                              type="button"
                              title="Share Scorecard to BeSocial"
                              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-xs font-bold bg-[var(--butter)] hover:bg-amber-200 text-foreground border border-amber-300 dark:border-amber-800 transition-all cursor-pointer hover:scale-105 active:scale-95"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenShare(entry, rank, selectedDay);
                              }}
                            >
                              <Share2 size={11} className="text-primary shrink-0" />
                              <span>Share</span>
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-1.5 sm:px-2 text-muted-foreground hover:text-foreground font-semibold cursor-pointer hidden sm:inline-flex"
                              onClick={() => setSelectedUserDetail(entry)}
                            >
                              View <ArrowRight size={11} className="ml-0.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredDaily.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                        No scores recorded yet for Day {String(selectedDay).padStart(2, '0')}. Be the first to play!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎓 USER PROFILE DETAIL MODAL (PROMINENT & SOFT HARMONIOUS DESIGN) */}
      {/* ========================================================================= */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card text-card-foreground border-2 border-border rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary text-xl font-black flex items-center justify-center border border-primary/30">
                  {selectedUserDetail.username.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">
                    {selectedUserDetail.fullName || selectedUserDetail.username}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono font-bold">@{selectedUserDetail.username}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                onClick={() => setSelectedUserDetail(null)}
              >
                <X size={18} />
              </Button>
            </div>

            {/* Academic Information Box */}
            <div className="bg-muted/60 rounded-2xl p-4 border border-border space-y-2">
              <div className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                <GraduationCap size={15} /> Student Academic Information
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold block text-[11px]">Course / Degree:</span>
                  <strong className="text-foreground text-sm font-extrabold">{selectedUserDetail.course || 'Not specified'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold block text-[11px]">Semester:</span>
                  <strong className="text-foreground text-sm font-extrabold">{selectedUserDetail.year || 'Not specified'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold block text-[11px]">Batch:</span>
                  <strong className="text-foreground text-sm font-extrabold">{selectedUserDetail.batch || 'Not specified'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold block text-[11px]">Roll No / Student ID:</span>
                  <strong className="text-foreground text-sm font-mono font-extrabold">{selectedUserDetail.rollNo || '-'}</strong>
                </div>
              </div>
            </div>

            {/* Score & Speed Prominent Badges */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3.5 bg-primary/10 border border-primary/25 rounded-2xl">
                <span className="text-[11px] text-primary uppercase block font-black">Total Score</span>
                <strong className="text-2xl font-black text-primary">
                  {'totalPoints' in selectedUserDetail
                    ? `${selectedUserDetail.totalPoints}/${overallMaxScore}`
                    : `${selectedUserDetail.points}/${(selectedUserDetail as any).day === 10 ? 100 : 30}`}
                </strong>
              </div>
              <div className="p-3.5 bg-secondary border border-secondary-foreground/20 rounded-2xl">
                <span className="text-[11px] text-secondary-foreground uppercase block font-black">Speed Record</span>
                <strong className="text-2xl font-black text-secondary-foreground font-mono">
                  {'totalTimeSeconds' in selectedUserDetail ? selectedUserDetail.totalTimeSeconds : selectedUserDetail.timeSeconds}s
                </strong>
              </div>
            </div>

            {/* Share & Close Action Buttons */}
            <div className="space-y-2 pt-1">
              <Button
                className="w-full font-black h-11 text-xs sm:text-sm rounded-xl gap-2 bg-[var(--butter)] text-[var(--foreground)] hover:bg-[#fff0a6] border-2 border-[var(--foreground)] shadow-[3px_3px_0_var(--foreground)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                onClick={() => {
                  handleOpenShare(selectedUserDetail, 1);
                }}
              >
                <Share2 size={16} className="text-primary stroke-[2.5]" />
                <span>Share Scorecard to BeSocial</span>
              </Button>

              <Button
                variant="outline"
                className="w-full font-bold h-9 text-xs rounded-xl"
                onClick={() => setSelectedUserDetail(null)}
              >
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 📸 BeSocial Share Card Modal */}
      {shareCardData && (
        <ShareCardModal
          isOpen={!!shareCardData}
          onClose={() => setShareCardData(null)}
          {...shareCardData}
        />
      )}
    </main>
  );
}
