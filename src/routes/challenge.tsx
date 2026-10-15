import { createFileRoute, Link, useSearch } from '@tanstack/react-router';
import { useEffect, useState, useMemo, useRef } from 'react';
import {
  ArrowRight,
  Check,
  Lightbulb,
  Trophy,
  Compass,
  Timer,
  CheckCircle2,
  GraduationCap,
  LockKeyhole,
  BookOpen,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  AlertCircle,
  X,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { ShareCardModal } from '@/components/share-card-modal';
import { Button } from '@/components/ui/button';
import { DiyaIcon } from '@/components/diya-icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  POINTS_FIRST_TRY,
  POINTS_SECOND_TRY,
  POINTS_THIRD_TRY,
  getQuizForDay,
  pointsFor,
} from '@/data/quiz';
import { getLiveDays, syncLiveDaysWithServer } from '@/lib/admin-store';
import {
  submitLeaderboardScore,
  getSavedUserProfile,
  saveUserProfile,
  isQuizAttempted,
  checkServerAttempt,
  getQuizProgress,
  saveQuizProgress,
  clearQuizProgress,
  readLeaderboardFromStorage,
  type UserProfile,
  type UserAnswerRecord,
} from '@/lib/leaderboard-store';

const BEST_KEY_PREFIX = 'pehchaan-kaun-best-day-';
const KEYS = ['A', 'B', 'C', 'D'];

export const Route = createFileRoute('/challenge')({
  validateSearch: (search: Record<string, unknown>): { day?: number } => {
    const d = Number(search?.day);
    return {
      day: !isNaN(d) && d >= 1 && d <= 10 ? d : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: 'Play the Daily Hunt — पहचानो कौन?' },
      { name: 'description', content: 'Play today’s hunt: three heroines, three clues, thirty points to earn.' },
      { property: 'og:title', content: 'Play the Daily Hunt — पहचानो कौन?' },
      { property: 'og:description', content: 'Follow the clues, find her name, and test your knowledge.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Quiz,
});

function readBestForDay(day: number): number {
  try {
    return Number(localStorage.getItem(`${BEST_KEY_PREFIX}${day}`)) || 0;
  } catch {
    return 0;
  }
}

function Quiz() {
  const search = useSearch({ from: '/challenge' });
  const [liveDays, setLiveDays] = useState<number[]>(() => getLiveDays());

  useEffect(() => {
    syncLiveDaysWithServer().then(days => setLiveDays(days));
    const handleUpdate = () => setLiveDays(getLiveDays());
    window.addEventListener('pehchaan_live_days_changed', handleUpdate);
    return () => window.removeEventListener('pehchaan_live_days_changed', handleUpdate);
  }, []);

  const latestLiveDay = liveDays.length > 0 ? Math.max(...liveDays) : 1;
  const targetDay = search.day || latestLiveDay || 1;
  const currentQuiz = useMemo(() => getQuizForDay(targetDay), [targetDay]);
  const questions = currentQuiz.questions;
  const maxPoints = questions.length * POINTS_FIRST_TRY;

  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [points, setPoints] = useState(0);
  const [best, setBest] = useState(0);

  // Single-attempt per question & auto-transition
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const autoAdvanceTimerRef = useRef<any>(null);
  const isAdvancingRef = useRef<boolean>(false);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);

  // Timing & Accuracy tracking
  const startTimeRef = useRef<number>(0);
  const pointsRef = useRef<number>(0);
  const firstTryCountRef = useRef<number>(0);
  const [timeTaken, setTimeTaken] = useState<number>(0);
  const [firstTryCount, setFirstTryCount] = useState<number>(0);
  const userAnswersRef = useRef<UserAnswerRecord[]>([]);

  // Participant profile states
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => getSavedUserProfile());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Form input fields
  const [playerName, setPlayerName] = useState(() => userProfile?.fullName || userProfile?.username || '');
  const [course, setCourse] = useState(() => userProfile?.course || 'BCA');
  const [year, setYear] = useState(() => userProfile?.year || '1st Sem');
  const [batch, setBatch] = useState(() => userProfile?.batch || '');
  const [rollNo, setRollNo] = useState(() => userProfile?.rollNo || '');

  // 1-Attempt Security Check state (Synchronous initialization from local cache)
  const [hasAttemptedToday, setHasAttemptedToday] = useState(() => {
    const profile = getSavedUserProfile();
    return isQuizAttempted(targetDay, profile?.fullName || profile?.username, profile?.rollNo);
  });
  const [attemptReason, setAttemptReason] = useState<string | null>(null);
  const [isVerifyingAttempt, setIsVerifyingAttempt] = useState(() => {
    const profile = getSavedUserProfile();
    const already = isQuizAttempted(targetDay, profile?.fullName || profile?.username, profile?.rollNo);
    return !already;
  });

  // Submission result state
  const [submissionResult, setSubmissionResult] = useState<{ submitted: boolean; rank?: number; autoSaved?: boolean; streakBonus?: number } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setBest(readBestForDay(targetDay));
    setStarted(false);
    setDone(false);
    setIndex(0);
    setAnswered(false);
    setSelectedOption(null);
    setIsCorrect(null);
    setMissed([]);
    setSolved(false);
    setPoints(0);
    setTimeTaken(0);
    setFirstTryCount(0);
    userAnswersRef.current = [];
    setSubmissionResult(null);

    const profile = getSavedUserProfile();
    setUserProfile(profile);
    const candidateName = profile?.fullName || profile?.username || '';
    const candidateRoll = profile?.rollNo || '';

    if (profile && (profile.fullName?.trim() || profile.username?.trim())) {
      setPlayerName(candidateName);
      setCourse(profile.course || 'BCA');
      setYear(profile.year || '1st Sem');
      setBatch(profile.batch || '');
      setRollNo(candidateRoll);
      setIsEditingProfile(false);
    } else {
      setIsEditingProfile(true);
    }

    // 1. Synchronous local check to immediately prevent question/start flashing
    const locallyAttempted = isQuizAttempted(targetDay, candidateName, candidateRoll);
    if (locallyAttempted) {
      setHasAttemptedToday(true);
      setAttemptReason(`Day ${targetDay} quiz has already been completed. Only 1 attempt is counted.`);
      clearQuizProgress(targetDay);
      setIsVerifyingAttempt(false);

      // Restore saved local score if available for scorecard sharing
      try {
        const rawAttempt = localStorage.getItem(`pehchaan_quiz_attempt_day_${targetDay}`);
        if (rawAttempt) {
          const parsed = JSON.parse(rawAttempt);
          if (parsed?.score?.points !== undefined) setPoints(parsed.score.points);
          if (parsed?.score?.timeSeconds !== undefined) setTimeTaken(parsed.score.timeSeconds);
          if (parsed?.score?.rank !== undefined) setSubmissionResult({ submitted: true, rank: parsed.score.rank });
        }
      } catch {}
    } else {
      setIsVerifyingAttempt(true);
    }

    // 2. Authoritative check with server/MongoDB
    if (candidateName || candidateRoll) {
      checkServerAttempt(targetDay, candidateName, candidateRoll)
        .then((res) => {
          setIsVerifyingAttempt(false);
          if (res.attempted) {
            setHasAttemptedToday(true);
            setAttemptReason(res.reason || `Day ${targetDay} quiz has already been completed.`);
            clearQuizProgress(targetDay);
            setStarted(false);

            if (res.existingScore) {
              if (typeof res.existingScore.points === 'number') setPoints(res.existingScore.points);
              if (typeof res.existingScore.timeSeconds === 'number') setTimeTaken(res.existingScore.timeSeconds);
              if (typeof res.existingScore.firstTryCount === 'number') setFirstTryCount(res.existingScore.firstTryCount);
              if (typeof res.existingScore.rank === 'number') setSubmissionResult({ submitted: true, rank: res.existingScore.rank });
            }
          } else {
            // Server confirms NOT attempted: verify local cache didn't have lock
            if (!isQuizAttempted(targetDay, candidateName, candidateRoll)) {
              setHasAttemptedToday(false);
              setAttemptReason(null);

              // Resume progress ONLY if quiz was truly left halfway
              const savedProgress = getQuizProgress(targetDay);
              if (savedProgress && savedProgress.index < questions.length) {
                setStarted(true);
                setIndex(savedProgress.index);
                setPoints(savedProgress.points || 0);
                pointsRef.current = savedProgress.points || 0;
                setFirstTryCount(savedProgress.firstTryCount || 0);
                firstTryCountRef.current = savedProgress.firstTryCount || 0;
                userAnswersRef.current = savedProgress.answers || [];
                const elapsed = savedProgress.elapsedSeconds || 0;
                setTimeTaken(elapsed);
                startTimeRef.current = Date.now() - (elapsed * 1000);
              }
            }
          }
        })
        .catch(() => {
          setIsVerifyingAttempt(false);
        });
    } else {
      setIsVerifyingAttempt(false);
      // New visitor: resume halfway progress if exists and not attempted
      if (!isQuizAttempted(targetDay)) {
        const savedProgress = getQuizProgress(targetDay);
        if (savedProgress && savedProgress.index < questions.length) {
          setStarted(true);
          setIndex(savedProgress.index);
          setPoints(savedProgress.points || 0);
          pointsRef.current = savedProgress.points || 0;
          setFirstTryCount(savedProgress.firstTryCount || 0);
          firstTryCountRef.current = savedProgress.firstTryCount || 0;
          userAnswersRef.current = savedProgress.answers || [];
          const elapsed = savedProgress.elapsedSeconds || 0;
          setTimeTaken(elapsed);
          startTimeRef.current = Date.now() - (elapsed * 1000);
        }
      }
    }
  }, [targetDay]);

  const launchQuiz = () => {
    if (hasAttemptedToday || isVerifyingAttempt) return;
    const saved = getQuizProgress(targetDay);
    if (saved && saved.index < questions.length) {
      setStarted(true);
      setDone(false);
      setIndex(saved.index);
      setPoints(saved.points || 0);
      pointsRef.current = saved.points || 0;
      setFirstTryCount(saved.firstTryCount || 0);
      firstTryCountRef.current = saved.firstTryCount || 0;
      userAnswersRef.current = saved.answers || [];
      const elapsed = saved.elapsedSeconds || 0;
      setTimeTaken(elapsed);
      startTimeRef.current = Date.now() - (elapsed * 1000);
      setAnswered(false);
      setSelectedOption(null);
      setIsCorrect(null);
      setMissed([]);
      setSolved(false);
      setSubmissionResult(null);
      return;
    }

    startTimeRef.current = Date.now();
    setStarted(true);
    setDone(false);
    setIndex(0);
    setAnswered(false);
    setSelectedOption(null);
    setIsCorrect(null);
    setMissed([]);
    setSolved(false);
    setPoints(0);
    pointsRef.current = 0;
    setTimeTaken(0);
    setFirstTryCount(0);
    firstTryCountRef.current = 0;
    userAnswersRef.current = [];
    setSubmissionResult(null);

    saveQuizProgress(targetDay, {
      index: 0,
      points: 0,
      firstTryCount: 0,
      elapsedSeconds: 0,
    });
  };

  const handleConfirmProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    const cleanName = playerName.trim();

    if (!cleanName) {
      setProfileError('Please enter your full name.');
      return;
    }

    // Check if another participant in this batch/course already registered with conflicting roll number
    const isSameProfileAsBefore =
      userProfile?.fullName?.trim().toLowerCase() === cleanName.toLowerCase() &&
      userProfile?.course === course.trim() &&
      userProfile?.year === year.trim();

    let rollToSave = (userProfile?.rollNo || rollNo || '').trim();
    let batchToSave = batch.trim();

    if (!isSameProfileAsBefore) {
      try {
        const checkRes = await fetch(
          `/api/users/check-username?username=${encodeURIComponent(cleanName)}&course=${encodeURIComponent(course.trim())}&batch=${encodeURIComponent(batch.trim())}&year=${encodeURIComponent(year.trim())}&rollNo=${encodeURIComponent(rollToSave)}`
        );
        if (checkRes.ok) {
          const conflictData = await checkRes.json();
          if (conflictData.conflict) {
            setProfileError(
              conflictData.message ||
                `A participant named "${cleanName}" is already registered. If this is you, please verify your details.`
            );
            return;
          }
          // If server verified existing user, restore any stored fields
          if (conflictData.isExistingUser && conflictData.existingProfile) {
            if (conflictData.existingProfile.rollNo && !rollToSave) {
              rollToSave = conflictData.existingProfile.rollNo;
              setRollNo(rollToSave);
            }
            if (conflictData.existingProfile.batch && !batchToSave) {
              batchToSave = conflictData.existingProfile.batch;
              setBatch(batchToSave);
            }
          }
        }
      } catch {
        // Network fallback: allow user to proceed without blocking
      }
    }

    const res = saveUserProfile({
      fullName: cleanName,
      username: cleanName,
      course: course.trim(),
      year: year.trim(),
      batch: batchToSave,
      rollNo: rollToSave,
    });

    if (!res.success) {
      setProfileError(res.error || 'Failed to update details.');
      return;
    }

    setUserProfile(res.profile);
    setIsEditingProfile(false);

    // Verify if this participant has already attempted today
    try {
      const attemptRes = await checkServerAttempt(targetDay, cleanName, res.profile.rollNo);
      if (attemptRes.attempted) {
        setHasAttemptedToday(true);
        setAttemptReason(attemptRes.reason || `Participant ${cleanName} has already completed Day ${targetDay} quiz.`);
        clearQuizProgress(targetDay);
        return;
      }
    } catch {
      if (isQuizAttempted(targetDay, cleanName, res.profile.rollNo)) {
        setHasAttemptedToday(true);
        setAttemptReason(`Participant ${cleanName} has already completed Day ${targetDay} quiz.`);
        clearQuizProgress(targetDay);
        return;
      }
    }

    setHasAttemptedToday(false);
    setAttemptReason(null);

    // 🚀 Instantly launch quiz upon confirmation
    launchQuiz();
  };

  const handleStart = () => {
    if (!userProfile || !userProfile.fullName) {
      setIsEditingProfile(true);
      setProfileError('Please fill and confirm your participant details before starting.');
      return;
    }

    if (hasAttemptedToday || isVerifyingAttempt) {
      return;
    }

    launchQuiz();
  };

  const q = questions[index] || questions[0];

  const choose = (option: string) => {
    if (answered || isAdvancingRef.current) return;
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    setAnswered(true);
    setSelectedOption(option);

    const currentElapsed = Number(((Date.now() - startTimeRef.current) / 1000).toFixed(1));

    // Case-insensitive & trimmed comparison to guarantee 100% reliable answer matching
    const isAnswerCorrect = option.trim().toLowerCase() === q.answer.trim().toLowerCase();

    // 📝 Record answer details
    const answerRecord: UserAnswerRecord = {
      questionId: q.id,
      questionNumber: index + 1,
      clue: q.clue,
      selectedOption: option,
      correctAnswer: q.answer,
      isCorrect: isAnswerCorrect,
    };
    const existIdx = userAnswersRef.current.findIndex(a => a.questionId === q.id || a.questionNumber === index + 1);
    if (existIdx >= 0) {
      userAnswersRef.current[existIdx] = answerRecord;
    } else {
      userAnswersRef.current.push(answerRecord);
    }

    if (isAnswerCorrect) {
      setIsCorrect(true);
      setSolved(true);
      const newPoints = pointsRef.current + POINTS_FIRST_TRY;
      const newFirstTry = firstTryCountRef.current + 1;
      pointsRef.current = newPoints;
      firstTryCountRef.current = newFirstTry;
      setPoints(newPoints);
      setFirstTryCount(newFirstTry);

      saveQuizProgress(targetDay, {
        index,
        points: newPoints,
        firstTryCount: newFirstTry,
        elapsedSeconds: currentElapsed,
        answers: userAnswersRef.current,
      });

      // Auto advance to next question after 1.8s
      autoAdvanceTimerRef.current = setTimeout(() => {
        next();
      }, 1800);
    } else {
      setIsCorrect(false);
      setSolved(false);
      setMissed([option]);

      saveQuizProgress(targetDay, {
        index,
        points: pointsRef.current,
        firstTryCount: firstTryCountRef.current,
        elapsedSeconds: currentElapsed,
        answers: userAnswersRef.current,
      });

      // Auto advance to next question after 2.0s (no 2nd chance!)
      autoAdvanceTimerRef.current = setTimeout(() => {
        next();
      }, 2000);
    }
  };

  const next = () => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setIsAdvancing(true);

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    setAnswered(false);
    setSelectedOption(null);
    setIsCorrect(null);
    setMissed([]);
    setSolved(false);

    if (index + 1 >= questions.length) {
      const elapsedSeconds = Number(((Date.now() - startTimeRef.current) / 1000).toFixed(1));
      setTimeTaken(elapsedSeconds);
      setDone(true);
      setHasAttemptedToday(true);
      clearQuizProgress(targetDay);
      isAdvancingRef.current = false;
      setIsAdvancing(false);

      try {
        const currentBest = readBestForDay(targetDay);
        if (pointsRef.current > currentBest) {
          localStorage.setItem(`${BEST_KEY_PREFIX}${targetDay}`, String(pointsRef.current));
          setBest(pointsRef.current);
        }
      } catch {}

      // 🚀 AUTO SAVE SCORE IMMEDIATELY (User cannot bypass by closing or restarting)
      const currentRoll = (userProfile?.rollNo || rollNo).trim().toUpperCase();
      const currentName = (userProfile?.fullName || playerName).trim();

      // Verify score against recorded answers to guarantee no correct answer is missed
      const verifiedCorrect = userAnswersRef.current.filter(a => a.isCorrect).length;
      const verifiedPoints = verifiedCorrect * POINTS_FIRST_TRY;

      const rawPoints = Math.min(Math.max(points, pointsRef.current, verifiedPoints), maxPoints);
      const finalFirstTry = Math.min(Math.max(firstTryCount, firstTryCountRef.current, verifiedCorrect), questions.length);

      setPoints(rawPoints);
      setFirstTryCount(finalFirstTry);

      const subRes = submitLeaderboardScore({
        username: currentName,
        fullName: currentName,
        course: (userProfile?.course || course).trim(),
        year: (userProfile?.year || year).trim(),
        batch: (userProfile?.batch || batch).trim(),
        rollNo: currentRoll,
        day: targetDay,
        points: rawPoints,
        timeSeconds: elapsedSeconds,
        firstTryCount: finalFirstTry,
        totalQuestions: questions.length,
        answers: userAnswersRef.current,
      });

      setSubmissionResult({ submitted: true, rank: subRes.rank, autoSaved: true });
      return;
    }

    const nextIndex = index + 1;
    setIndex(nextIndex);
    const currentElapsed = Number(((Date.now() - startTimeRef.current) / 1000).toFixed(1));
    saveQuizProgress(targetDay, {
      index: nextIndex,
      points: pointsRef.current,
      firstTryCount: firstTryCountRef.current,
      elapsedSeconds: currentElapsed,
      answers: userAnswersRef.current,
    });

    setTimeout(() => {
      isAdvancingRef.current = false;
      setIsAdvancing(false);
    }, 200);
  };

  const isLive = liveDays.includes(targetDay);

  if (!isLive) {
    return (
      <main className="wrap section">
        <div className="quiz">
          <div className="quiz-card quiz-intro text-center py-10 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto text-muted-foreground shadow-xs">
              <LockKeyhole size={24} />
            </div>
            <div className="eyebrow text-muted-foreground">CHAPTER CURRENTLY LOCKED</div>
            <h2 className="text-2xl font-black">Day {String(currentQuiz.day).padStart(2, '0')} Unlocks on October 11, 2026</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              This daily mystery chapter opens on <strong>October 11, 2026</strong>. While the countdown ticks, discover the enduring stories and achievements of these legendary women in the Hall of Heroines!
            </p>
            <div className="quiz-actions quiz-actions-center pt-3">
              <Button asChild>
                <Link to="/heroines">
                  Explore Heroines <BookOpen size={14} className="ml-1.5" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">
                  Back to Home <ArrowRight size={14} className="ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!started || hasAttemptedToday) {
    return (
      <main className="wrap section">
        <div className="quiz">
          <div className="quiz-card quiz-intro">
            <div className="eyebrow">
              <DiyaIcon size={14} className="text-primary inline mr-1" /> DAY {String(currentQuiz.day).padStart(2, '0')} IS OPEN
            </div>
            <h2>{currentQuiz.title}</h2>
            <p className="text-sm text-muted-foreground -mt-1 mb-2 font-medium">
              {currentQuiz.subtitle} • {currentQuiz.date}
            </p>
            <p>
              Read the clue, pick the name, and explore her story. Quick thinking and first-try accuracy
              earn maximum points and boost your rank on the Leaderboard!
            </p>

            {/* ALREADY ATTEMPTED ALERT */}
            {hasAttemptedToday ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 my-5 text-center space-y-3 animate-in fade-in">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <ShieldAlert size={22} />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  You Have Already Completed Day {String(currentQuiz.day).padStart(2, '0')}!
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {attemptReason || 'Only 1 attempt per day is allowed per student to ensure 100% fair leaderboard rankings.'}
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link to="/leaderboard" search={{ day: targetDay }}>
                      View Today's Leaderboard <Trophy size={14} className="ml-1.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="font-bold cursor-pointer"
                    onClick={() => setIsShareModalOpen(true)}
                  >
                    <Share2 size={14} className="mr-1.5" /> Share Scorecard
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/heroines">Hall of Heroines</Link>
                  </Button>
                </div>
              </div>
            ) : isVerifyingAttempt ? (
              <div className="bg-card border border-border rounded-xl p-8 my-5 max-w-lg mx-auto text-center space-y-3 shadow-xs animate-in fade-in">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground font-semibold">
                  Checking quiz status &amp; verifying attempt...
                </p>
              </div>
            ) : (
              /* PARTICIPANT DETAILS & START SECTION */
              <div className="my-5">
                {(!userProfile?.fullName || isEditingProfile) ? (
                  /* Form to enter / edit details */
                  <div className="bg-card border border-border rounded-xl p-5 text-left shadow-sm space-y-3.5 max-w-lg mx-auto">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <GraduationCap size={17} className="text-primary" />
                        <div>
                          <h4 className="text-xs font-bold text-foreground">Participant Registration</h4>
                          <p className="text-[11px] text-muted-foreground">Confirm your verified details before starting the quiz</p>
                        </div>
                      </div>
                      {userProfile?.fullName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                          {2 - (userProfile.editCount || 0)} edits left
                        </span>
                      )}
                    </div>

                    {profileError && (
                      <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" /> {profileError}
                      </div>
                    )}

                    <form onSubmit={handleConfirmProfile} className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="player-name" className="text-xs">Full Name *</Label>
                        <Input
                          id="player-name"
                          placeholder="e.g. Rahul Sharma"
                          value={playerName}
                          onChange={e => setPlayerName(e.target.value)}
                          className="h-9 sm:h-8.5 text-base sm:text-xs"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <Label htmlFor="player-course" className="text-xs">Course / Degree</Label>
                          <select
                            id="player-course"
                            value={course}
                            onChange={e => setCourse(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-base sm:text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring h-9 sm:h-8.5 font-medium"
                          >
                            <option value="BBA">BBA</option>
                            <option value="BCA">BCA</option>
                            <option value="MBA">MBA</option>
                            <option value="MCA">MCA</option>
                            <option value="BA">BA</option>
                            <option value="BAJMC">BAJMC</option>
                            <option value="BCOM">BCOM</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="player-semester" className="text-xs">Semester</Label>
                          <select
                            id="player-semester"
                            value={year}
                            onChange={e => setYear(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-base sm:text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring h-9 sm:h-8.5 font-medium"
                          >
                            <option value="1st Sem">1st Sem</option>
                            <option value="2nd Sem">2nd Sem</option>
                            <option value="3rd Sem">3rd Sem</option>
                            <option value="4th Sem">4th Sem</option>
                            <option value="5th Sem">5th Sem</option>
                            <option value="6th Sem">6th Sem</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="player-batch" className="text-xs">Batch (Optional)</Label>
                        <Input
                          id="player-batch"
                          placeholder="e.g. 2024–2028 / Batch A"
                          value={batch}
                          onChange={e => setBatch(e.target.value)}
                          className="h-9 sm:h-8.5 text-base sm:text-xs"
                        />
                      </div>

                      <div className="pt-1 flex gap-2">
                        <Button type="submit" size="sm" className="w-full gap-1.5 h-9 font-semibold">
                          <Check size={14} /> Confirm Details & Continue
                        </Button>
                        {userProfile?.fullName && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsEditingProfile(false);
                              setProfileError(null);
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">
                        ⚠️ Maximum 2 edits allowed. Score will be automatically recorded upon quiz completion.
                      </p>
                    </form>
                  </div>
                ) : (
                  /* Confirmed profile card with 1-click start */
                  <div className="bg-card border border-border rounded-xl p-4 text-left shadow-sm max-w-lg mx-auto space-y-3">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ShieldCheck size={15} className="text-emerald-500" /> Verified Participant
                      </span>
                      {userProfile.isLocked ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground flex items-center gap-1">
                          <LockKeyhole size={10} /> Locked (Max edits used)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(true)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Edit3 size={11} /> Edit Details ({2 - (userProfile.editCount || 0)} left)
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Name:</span>
                        <strong className="text-foreground">{userProfile.fullName}</strong>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Course & Sem:</span>
                        <span className="text-foreground font-medium">{userProfile.course} • {userProfile.year}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[11px] text-muted-foreground block">Batch:</span>
                        <span className="text-foreground font-medium">{userProfile.batch || 'General Batch'}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button size="lg" className="w-full gap-2 text-sm font-bold shadow-md" onClick={handleStart}>
                        {getQuizProgress(targetDay)
                          ? `Resume Day ${String(currentQuiz.day).padStart(2, '0')} (Clue ${(getQuizProgress(targetDay)?.index || 0) + 1})`
                          : `Start Playing Day ${String(currentQuiz.day).padStart(2, '0')}`} <ArrowRight size={15} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {hasAttemptedToday && (
              <ShareCardModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                day={targetDay}
                dayTitle={currentQuiz.title}
                points={Math.min(points, maxPoints)}
                maxPoints={maxPoints}
                timeTaken={timeTaken}
                firstTryCount={Math.min(firstTryCount, questions.length)}
                totalQuestions={questions.length}
                rank={submissionResult?.rank || 1}
                fullName={userProfile?.fullName || playerName}
                course={userProfile?.course || course}
                year={userProfile?.year || year}
                tier={points >= maxPoints ? 'Herstory Champion' : points >= 20 ? 'Curiosity Star' : 'Brave Explorer'}
              />
            )}
          </div>
        </div>
      </main>
    );
  }

  if (done) {
    const tier = points >= maxPoints ? 'Herstory Champion' : points >= 20 ? 'Curiosity Star' : 'Brave Explorer';
    return (
      <main className="wrap section">
        <div className="quiz">
          <div className="quiz-card quiz-result">
            <div className="score-badge">
              <div>
                <strong>{Math.min(points, maxPoints)}</strong>
                <small>OF {maxPoints}</small>
              </div>
            </div>
            <div className="eyebrow">
              <Trophy size={14} /> {tier}
            </div>
            <h2>{points >= maxPoints ? 'Extraordinary! All names on the first try!' : 'Congratulations! You solved today’s mystery chapter.'}</h2>

            {/* Performance Stats: Time & Accuracy */}
            <div className="flex flex-wrap items-center justify-center gap-3 my-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 rounded-full text-xs font-semibold">
                <Timer size={14} className="text-primary" /> Time: <span className="font-mono text-primary font-bold">{timeTaken}s</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 rounded-full text-xs font-semibold">
                <DiyaIcon size={14} className="text-amber-600" /> Accuracy: <span className="font-mono font-bold">{Math.min(firstTryCount, questions.length)}/{questions.length}</span>
              </div>
            </div>

            {/* Auto-Saved Confirmation Box */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 my-4 max-w-lg mx-auto text-left shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Score Automatically Recorded!
                </span>
                <span className="text-xs font-extrabold text-foreground bg-background/80 px-2.5 py-0.5 rounded-full border border-border">
                  Rank #{submissionResult?.rank || 1}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-border/50">
                <span><b>Participant:</b> {userProfile?.fullName || playerName}</span>
                <span><b>Course:</b> {userProfile?.course || course} ({userProfile?.year || year})</span>
                {userProfile?.batch && <span><b>Batch:</b> {userProfile.batch}</span>}
              </div>
            </div>

            {/* 📸 BeSocial Share Section (Theme Matched) */}
            <div className="bg-[var(--petal)] border-[1.5px] border-[var(--foreground)] rounded-2xl p-5 my-5 max-w-lg mx-auto text-center space-y-3.5 shadow-[4px_5px_0_var(--border)] relative">
              <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[var(--butter)] border border-[var(--foreground)] text-[var(--foreground)] text-xs font-black tracking-wider shadow-[1.5px_1.5px_0_var(--foreground)]">
                SHARE YOUR ACHIEVEMENT
              </div>
              <h3 className="text-xl font-black text-[var(--foreground)] font-display tracking-tight">
                Post Your Official Scorecard on BeSocial!
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto leading-relaxed">
                Generate and download your official high-res scorecard with your score, time, and rank, and share it directly on BeSocial.
              </p>
              <div className="pt-1">
                <Button
                  size="lg"
                  className="w-full gap-2 font-bold text-sm h-11 bg-primary text-primary-foreground border-[1.5px] border-[var(--foreground)] shadow-[3px_3px_0_var(--foreground)] rounded-xl hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--foreground)] hover:bg-primary/95 transition-all cursor-pointer"
                  onClick={() => setIsShareModalOpen(true)}
                >
                  <Share2 size={16} /> Share Card to BeSocial <ExternalLink size={14} className="ml-0.5 opacity-80" />
                </Button>
              </div>
            </div>

            <ShareCardModal
              isOpen={isShareModalOpen}
              onClose={() => setIsShareModalOpen(false)}
              day={targetDay}
              dayTitle={currentQuiz.title}
              points={Math.min(points, maxPoints)}
              maxPoints={maxPoints}
              timeTaken={timeTaken}
              firstTryCount={Math.min(firstTryCount, questions.length)}
              totalQuestions={questions.length}
              rank={submissionResult?.rank || 1}
              fullName={userProfile?.fullName || playerName}
              course={userProfile?.course || course}
              year={userProfile?.year || year}
              tier={tier}
            />

            <div className="quiz-actions quiz-actions-center mt-6">
              <Button asChild size="lg">
                <Link to="/leaderboard" search={{ day: targetDay }}>
                  View Live Leaderboard <Trophy size={14} className="ml-1" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">All chapters <Compass size={14} className="ml-1" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap section">
      <div className="quiz">
        <div className="quiz-top">
          <span className="quiz-meta">
            DAY {String(currentQuiz.day).padStart(2, '0')} • CLUE {index + 1} OF {questions.length}
          </span>
          <div className="quiz-dots" aria-hidden="true">
            {questions.map((item, i) => (
              <i key={item.id} className={i < index ? 'done' : i === index ? 'now' : ''} />
            ))}
          </div>
          <span className="quiz-score">
            <DiyaIcon size={14} className="text-amber-600" /> {points}
          </span>
        </div>

        <div className="quiz-card">
          <span className="quiz-era">{q.era}</span>
          <p className="quiz-clue">“{q.clue}”</p>
          <p className="quiz-hint">
            <Lightbulb size={13} className="inline" /> Who am I?
          </p>

          <div className="quiz-options">
            {q.options.map((option, i) => {
              const isAnswer = answered && option.trim().toLowerCase() === q.answer.trim().toLowerCase();
              const isSelected = option.trim().toLowerCase() === selectedOption?.trim().toLowerCase();
              const isSelectedWrong = answered && !isCorrect && isSelected;
              const isDim = answered && !isAnswer && !isSelected;
              return (
                <Button
                  key={option}
                  variant="secondary"
                  className={`quiz-option ${isAnswer ? 'right' : ''} ${isSelectedWrong ? 'wrong' : ''} ${
                    isDim ? 'dim' : ''
                  }`}
                  onClick={() => choose(option)}
                  disabled={answered}
                >
                  <span className="key">{KEYS[i]}</span>
                  {option}
                  {isAnswer && <Check size={16} className="ml-auto" />}
                  {isSelectedWrong && <X size={16} className="ml-auto" />}
                </Button>
              );
            })}
          </div>

          {answered && isCorrect && (
            <div className="quiz-feedback">
              <div>
                <strong>Yes — {q.answer}. (+10 pts)</strong>
                {q.fact}
              </div>
            </div>
          )}
          {answered && !isCorrect && (
            <div className="quiz-feedback bad">
              <div>
                <strong>Incorrect — The correct answer is {q.answer}. (0 pts)</strong>
                {q.fact}
              </div>
            </div>
          )}

          <div className="quiz-actions">
            <span className="quiz-hint">
              {answered
                ? (isCorrect ? 'Correct! Moving to next clue...' : '1 chance only — Moving to next clue...')
                : `1 chance only • ${POINTS_FIRST_TRY} points for correct answer.`}
            </span>
            <Button onClick={next} disabled={!answered || isAdvancing}>
              {index + 1 === questions.length ? 'See my score' : 'Next clue'} <ArrowRight size={15} className="ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
