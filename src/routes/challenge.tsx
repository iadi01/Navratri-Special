import { createFileRoute, Link, useSearch } from '@tanstack/react-router';
import { useEffect, useState, useMemo, useRef } from 'react';
import {
  ArrowRight,
  Check,
  Lightbulb,
  Trophy,
  X,
  Compass,
  Timer,
  Send,
  CheckCircle2,
  GraduationCap,
  LockKeyhole,
  BookOpen,
} from 'lucide-react';
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

  const targetDay = search.day || liveDays[0] || 1;
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

  // Timing & Accuracy tracking
  const startTimeRef = useRef<number>(0);
  const [timeTaken, setTimeTaken] = useState<number>(0);
  const [firstTryCount, setFirstTryCount] = useState<number>(0);

  // Participant profile form state
  const [playerName, setPlayerName] = useState('');
  const [course, setCourse] = useState('BCA');
  const [year, setYear] = useState('1st Sem');
  const [batch, setBatch] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [submissionResult, setSubmissionResult] = useState<{ submitted: boolean; rank?: number } | null>(null);

  useEffect(() => {
    setBest(readBestForDay(targetDay));
    setStarted(false);
    setDone(false);
    setIndex(0);
    setMissed([]);
    setSolved(false);
    setPoints(0);
    setTimeTaken(0);
    setFirstTryCount(0);
    setSubmissionResult(null);

    // Load saved user profile if available
    const saved = getSavedUserProfile();
    if (saved) {
      setPlayerName(saved.fullName || saved.username || '');
      setCourse(saved.course || 'BCA');
      setYear(saved.year || '1st Sem');
      setBatch(saved.batch || '');
      setRollNo(saved.rollNo || '');
    }
  }, [targetDay]);

  const handleStart = () => {
    startTimeRef.current = Date.now();
    setStarted(true);
    setDone(false);
    setIndex(0);
    setMissed([]);
    setSolved(false);
    setPoints(0);
    setTimeTaken(0);
    setFirstTryCount(0);
    setSubmissionResult(null);
  };

  const q = questions[index] || questions[0];

  const choose = (option: string) => {
    if (solved || missed.includes(option)) return;
    if (option === q.answer) {
      setSolved(true);
      const earned = pointsFor(missed.length);
      setPoints(p => p + earned);
      if (missed.length === 0) {
        setFirstTryCount(c => c + 1);
      }
    } else {
      setMissed(m => [...m, option]);
    }
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      const elapsedSeconds = Number(((Date.now() - startTimeRef.current) / 1000).toFixed(1));
      setTimeTaken(elapsedSeconds);
      setDone(true);
      try {
        const currentBest = readBestForDay(targetDay);
        if (points > currentBest) {
          localStorage.setItem(`${BEST_KEY_PREFIX}${targetDay}`, String(points));
          setBest(points);
        }
      } catch {
        /* storage unavailable */
      }
      return;
    }
    setIndex(i => i + 1);
    setMissed([]);
    setSolved(false);
  };

  const restart = () => {
    handleStart();
  };

  const handleLeaderboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    saveUserProfile({
      username: playerName.trim(),
      fullName: playerName.trim(),
      course: course.trim(),
      year: year.trim(),
      batch: batch.trim(),
      rollNo: rollNo.trim(),
    });

    const res = submitLeaderboardScore({
      username: playerName.trim(),
      fullName: playerName.trim(),
      course: course.trim(),
      year: year.trim(),
      batch: batch.trim(),
      rollNo: rollNo.trim(),
      day: targetDay,
      points,
      timeSeconds: timeTaken,
      firstTryCount,
      totalQuestions: questions.length,
    });

    setSubmissionResult({ submitted: true, rank: res.rank });
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

  if (!started) {
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
            <div className="quiz-actions">
              <Button size="lg" onClick={handleStart}>
                Start playing <ArrowRight />
              </Button>
              {best > 0 && <span className="quiz-best">Your best: {best} points</span>}
            </div>
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
                <strong>{points}</strong>
                <small>OF {maxPoints}</small>
              </div>
            </div>
            <div className="eyebrow">
              <Trophy size={14} /> {tier}
            </div>
            <h2>{points >= maxPoints ? 'Every name, first try. Extraordinary!' : 'You discovered three remarkable women.'}</h2>

            {/* Performance Stats: Time & Accuracy */}
            <div className="flex flex-wrap items-center justify-center gap-3 my-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 rounded-full text-xs font-semibold">
                <Timer size={14} className="text-primary" /> Time: <span className="font-mono text-primary font-bold">{timeTaken}s</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 rounded-full text-xs font-semibold">
                <DiyaIcon size={14} className="text-amber-600" /> First-Try Accuracy: <span className="font-mono font-bold">{firstTryCount}/{questions.length}</span>
              </div>
            </div>

            {/* Leaderboard Submission Box with Student Details */}
            <div className="bg-card border border-border rounded-xl p-5 my-4 max-w-lg mx-auto text-left shadow-sm">
              {!submissionResult?.submitted ? (
                <form onSubmit={handleLeaderboardSubmit} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <GraduationCap size={15} className="text-primary" /> Record Score to Leaderboard
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Day {String(targetDay).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="player-name" className="text-xs">Your Name / Username *</Label>
                    <Input
                      id="player-name"
                      placeholder="e.g. amity kumar"
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      className="h-8.5 text-xs"
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
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring h-8.5 font-medium"
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
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring h-8.5 font-medium"
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
                    <Label htmlFor="player-batch" className="text-xs">Batch</Label>
                    <Input
                      id="player-batch"
                      placeholder="e.g. 2024–2028 / Batch A"
                      value={batch}
                      onChange={e => setBatch(e.target.value)}
                      className="h-8.5 text-xs"
                    />
                  </div>

                  <Button type="submit" size="sm" className="w-full gap-1.5 mt-2 h-9">
                    <Send size={13} /> Submit to Leaderboard
                  </Button>
                </form>
              ) : (
                <div className="text-center py-3 space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 size={18} /> Score & Student Details Recorded!
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You placed <b>Rank #{submissionResult.rank}</b> for Day {String(targetDay).padStart(2, '0')}.
                  </p>
                  <Button variant="secondary" size="sm" asChild className="mt-1">
                    <Link to="/leaderboard" search={{ day: targetDay }}>
                      View Leaderboard Rankings <Trophy size={13} className="ml-1.5" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-3">Here are the enduring stories from this hunt:</p>
            <div className="quiz-recap">
              {questions.map(item => (
                <div key={item.id}>
                  <b>{item.answer}</b>
                  <p>{item.fact}</p>
                </div>
              ))}
            </div>
            <div className="quiz-actions quiz-actions-center mt-6">
              <Button asChild>
                <Link to="/leaderboard" search={{ day: targetDay }}>
                  View Leaderboard <Trophy size={14} className="ml-1" />
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
              const isAnswer = solved && option === q.answer;
              const isMissed = missed.includes(option);
              return (
                <Button
                  key={option}
                  variant="secondary"
                  className={`quiz-option ${isAnswer ? 'right' : ''} ${isMissed ? 'wrong' : ''} ${
                    solved && !isAnswer ? 'dim' : ''
                  }`}
                  onClick={() => choose(option)}
                  disabled={solved || isMissed}
                >
                  <span className="key">{KEYS[i]}</span>
                  {option}
                  {isAnswer && <Check size={16} className="ml-auto" />}
                  {isMissed && <X size={16} className="ml-auto" />}
                </Button>
              );
            })}
          </div>

          {solved && (
            <div className="quiz-feedback">
              <div>
                <strong>Yes — {q.answer}.</strong>
                {q.fact}
              </div>
            </div>
          )}
          {!solved && missed.length > 0 && (
            <div className="quiz-feedback bad">
              <div>
                <strong>Not her — have another go.</strong>
                {missed.length === 1 ? 'One more try still earns 5 points.' : 'You can still get 2 points for this one.'}
              </div>
            </div>
          )}

          <div className="quiz-actions">
            <span className="quiz-hint">{missed.length > 0 ? `No first-try bonus here — ${POINTS_SECOND_TRY} points up for grabs.` : `First try earns ${POINTS_FIRST_TRY} points.`}</span>
            <Button onClick={next} disabled={!solved}>
              {index + 1 === questions.length ? 'See my score' : 'Next clue'} <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
