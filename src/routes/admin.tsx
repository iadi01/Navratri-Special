import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Radio,
  Eye,
  EyeOff,
  UserPlus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  LogOut,
  Layers,
  Crown,
  GraduationCap,
  Users,
  Search,
  Timer,
  Calendar,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DAILY_QUIZZES, type DailyQuiz, type Question } from '@/data/quiz';
import {
  getAdminSession,
  loginAdmin,
  logoutAdmin,
  getAllAdmins,
  addAdmin,
  deleteAdmin,
  getLiveDays,
  toggleDayLive,
  type AdminUser,
  type AdminRole,
} from '@/lib/admin-store';
import {
  getOverallLeaderboard,
  syncLeaderboardWithServer,
  type OverallLeaderboardEntry,
} from '@/lib/leaderboard-store';

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: 'Admin Control Center — पहचानो कौन?' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<{ isAuthenticated: boolean; user: AdminUser | null }>({
    isAuthenticated: false,
    user: null,
  });
  const [activeTab, setActiveTab] = useState<'live' | 'inspect' | 'students' | 'admins'>('live');

  // Login form state
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Live days state
  const [liveDays, setLiveDays] = useState<number[]>([1]);

  // Selected day for inspection
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);

  // Student directory state
  const [participants, setParticipants] = useState<OverallLeaderboardEntry[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<OverallLeaderboardEntry | null>(null);

  // New admin form state
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('admin');
  const [adminActionMsg, setAdminActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adminList, setAdminList] = useState<AdminUser[]>([]);

  useEffect(() => {
    const s = getAdminSession();
    setSession(s);
    setLiveDays(getLiveDays());
    setParticipants(getOverallLeaderboard());
    if (s.isAuthenticated) {
      setAdminList(getAllAdmins());
      syncLeaderboardWithServer().then(() => {
        setParticipants(getOverallLeaderboard());
      });
    }

    const handleStorage = () => {
      setLiveDays(getLiveDays());
      setParticipants(getOverallLeaderboard());
    };
    window.addEventListener('pehchaan_live_days_changed', handleStorage);
    window.addEventListener('pehchaan_leaderboard_updated', handleStorage);
    return () => {
      window.removeEventListener('pehchaan_live_days_changed', handleStorage);
      window.removeEventListener('pehchaan_leaderboard_updated', handleStorage);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const res = loginAdmin(usernameInput, passwordInput);
    if (res.success && res.user) {
      setSession({ isAuthenticated: true, user: res.user });
      setAdminList(getAllAdmins());
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setLoginError(res.error || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setSession({ isAuthenticated: false, user: null });
  };

  const handleToggleDay = (day: number) => {
    const updated = toggleDayLive(day);
    setLiveDays(updated);
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session.user) return;
    setAdminActionMsg(null);

    const res = addAdmin(session.user, {
      username: newUsername,
      name: newName,
      password: newPassword,
      role: newRole,
    });

    if (res.success) {
      setAdminActionMsg({ type: 'success', text: `Admin @${newUsername} successfully created!` });
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewRole('admin');
      setAdminList(getAllAdmins());
    } else {
      setAdminActionMsg({ type: 'error', text: res.error || 'Failed to create admin' });
    }
  };

  const handleDeleteAdmin = (targetUsername: string) => {
    if (!session.user) return;
    if (!confirm(`Are you sure you want to remove admin @${targetUsername}?`)) return;

    const res = deleteAdmin(session.user, targetUsername);
    if (res.success) {
      setAdminActionMsg({ type: 'success', text: `Admin @${targetUsername} removed.` });
      setAdminList(getAllAdmins());
    } else {
      setAdminActionMsg({ type: 'error', text: res.error || 'Failed to remove admin' });
    }
  };

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return participants;
    const q = studentSearch.toLowerCase();
    return participants.filter(
      p =>
        p.username.toLowerCase().includes(q) ||
        p.fullName?.toLowerCase().includes(q) ||
        p.course?.toLowerCase().includes(q) ||
        p.batch?.toLowerCase().includes(q) ||
        p.year?.toLowerCase().includes(q)
    );
  }, [participants, studentSearch]);

  // If not authenticated, render discreet Admin Login Portal
  if (!session.isAuthenticated || !session.user) {
    return (
      <main className="wrap section min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 md:p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
              <ShieldCheck size={26} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Authorized access only for quiz curators and management.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Enter admin username"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer select-none transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <>
                      <EyeOff size={13} />
                      <span>Hide password</span>
                    </>
                  ) : (
                    <>
                      <Eye size={13} />
                      <span>Show password</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={showPassword ? 'Enter admin password' : '••••••••'}
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" size="lg">
              <KeyRound size={16} className="mr-2" /> Sign In to Admin Panel
            </Button>
          </form>
        </div>
      </main>
    );
  }

  const isMainAdmin = session.user.role === 'main_admin';
  const currentQuiz = DAILY_QUIZZES.find(q => q.day === selectedDay) || DAILY_QUIZZES[0];

  return (
    <main className="wrap section pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary">
              <ShieldCheck size={12} /> Admin
            </span>
            <span className="text-xs text-muted-foreground">• Signed in as <b>@{session.user.username}</b></span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Control Center</h1>
          <p className="text-sm text-muted-foreground">
            Manage live daily quiz broadcasts and review upcoming question clues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/">View Public Site</Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            <LogOut size={14} className="mr-1.5" /> Logout
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 my-6">
        <Button
          variant={activeTab === 'live' ? 'default' : 'outline'}
          onClick={() => setActiveTab('live')}
          className="gap-2"
        >
          <Radio size={16} /> Live Broadcast ({liveDays.length} Live)
        </Button>

        <Button
          variant={activeTab === 'inspect' ? 'default' : 'outline'}
          onClick={() => setActiveTab('inspect')}
          className="gap-2"
        >
          <HelpCircle size={16} /> Inspect Questions
        </Button>

        {/* Student Directory - Main Admin Only */}
        {isMainAdmin && (
          <Button
            variant={activeTab === 'students' ? 'default' : 'outline'}
            onClick={() => setActiveTab('students')}
            className="gap-2"
          >
            <GraduationCap size={16} /> Student Directory ({participants.length})
          </Button>
        )}

        {/* Admin Management - Main Admin Only */}
        {isMainAdmin && (
          <Button
            variant={activeTab === 'admins' ? 'default' : 'outline'}
            onClick={() => setActiveTab('admins')}
            className="gap-2"
          >
            <UserPlus size={16} /> Manage Admins ({adminList.length})
          </Button>
        )}
      </div>

      {/* TAB 1: LIVE BROADCAST CONTROLLER (Available to all admins) */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Radio className="text-emerald-500 animate-pulse" size={18} /> Daily Quiz Broadcast Control
                </h2>
                <p className="text-sm text-muted-foreground">
                  Click any day below to toggle its status. Active quizzes immediately become playable on the main site.
                </p>
              </div>
              <div className="text-xs font-mono bg-muted px-3 py-1.5 rounded-lg">
                Active Live Days: {liveDays.join(', ')}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DAILY_QUIZZES.map((quiz: DailyQuiz) => {
                const isLive = liveDays.includes(quiz.day);
                return (
                  <div
                    key={quiz.day}
                    className={`border rounded-xl p-4 transition-all ${
                      isLive
                        ? 'border-emerald-500/50 bg-emerald-500/5 shadow-sm'
                        : 'border-border bg-card/50 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-muted">
                        DAY {String(quiz.day).padStart(2, '0')}
                      </span>
                      {isLive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> LIVE NOW
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          <Lock size={11} /> LOCKED
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-foreground text-sm line-clamp-1">{quiz.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 mb-3">
                      {quiz.subtitle}
                    </p>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <Button
                        size="sm"
                        variant={isLive ? 'outline' : 'default'}
                        className="w-full text-xs font-medium"
                        onClick={() => handleToggleDay(quiz.day)}
                      >
                        {isLive ? (
                          <>
                            <Lock size={13} className="mr-1.5" /> Deactivate
                          </>
                        ) : (
                          <>
                            <Unlock size={13} className="mr-1.5" /> Make Live
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs px-2"
                        asChild
                      >
                        <Link to="/challenge" search={{ day: quiz.day }}>
                          Play <ArrowRight size={12} className="ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INSPECT QUESTIONS & CLUES (Answers visible to Main Admin only) */}
      {activeTab === 'inspect' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm">
            {/* Day Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-border">
              {DAILY_QUIZZES.map((quiz: DailyQuiz) => {
                const isSel = selectedDay === quiz.day;
                const isLive = liveDays.includes(quiz.day);
                return (
                  <Button
                    key={quiz.day}
                    size="sm"
                    variant={isSel ? 'default' : 'outline'}
                    onClick={() => setSelectedDay(quiz.day)}
                    className="shrink-0 text-xs gap-1.5"
                  >
                    <span>Day {String(quiz.day).padStart(2, '0')}</span>
                    {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  </Button>
                );
              })}
            </div>

            {/* Day Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase text-primary">
                    Day {String(currentQuiz.day).padStart(2, '0')} Inspection
                  </span>
                  {liveDays.includes(currentQuiz.day) ? (
                    <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      LIVE
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium px-2 py-0.2 rounded-full bg-muted text-muted-foreground">
                      Locked
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold mt-1">{currentQuiz.title}</h2>
                <p className="text-xs text-muted-foreground">{currentQuiz.subtitle} • {currentQuiz.date}</p>
              </div>

              {/* Reveal Answers Control for Main Admin */}
              {isMainAdmin && (
                <div>
                  <Button
                    variant={showAnswers ? 'destructive' : 'secondary'}
                    size="sm"
                    onClick={() => setShowAnswers(!showAnswers)}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    {showAnswers ? (
                      <>
                        <EyeOff size={14} /> Hide Answers
                      </>
                    ) : (
                      <>
                        <Eye size={14} /> Reveal Answers
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Questions Inspection List */}
            <div className="space-y-4">
              {currentQuiz.questions.map((q: Question, qIdx: number) => (
                <div
                  key={q.id}
                  className="border border-border rounded-xl p-4 md:p-5 bg-muted/20 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                      Clue #{qIdx + 1}
                    </span>
                    <span className="text-xs text-muted-foreground italic">{q.era}</span>
                  </div>

                  <p className="text-sm md:text-base font-medium text-foreground italic border-l-2 border-primary/40 pl-3">
                    "{q.clue}"
                  </p>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {q.options.map((opt: string) => {
                      const isCorrect = opt === q.answer;
                      return (
                        <div
                          key={opt}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-between ${
                            showAnswers && isMainAdmin && isCorrect
                              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                              : 'bg-card border-border text-foreground'
                          }`}
                        >
                          <span>{opt}</span>
                          {showAnswers && isMainAdmin && isCorrect && (
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Historical Fact */}
                  {showAnswers && isMainAdmin && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-800 dark:text-emerald-200 mt-2">
                      <span className="font-bold block mb-0.5">Historical Fact:</span>
                      {q.fact}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT DIRECTORY (Visible to Main Admin ONLY) */}
      {isMainAdmin && activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <GraduationCap size={20} className="text-primary" /> Student &amp; Participant Directory
                </h2>
                <p className="text-sm text-muted-foreground">
                  Click on any student/user row to view their full Course, Year, Batch, and day-by-day score breakdown.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, course, batch..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Student / User</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Semester &amp; Batch</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4 text-center">Time</th>
                    <th className="py-3 px-4 text-center">Chapters</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredStudents.map((st, idx) => (
                    <tr
                      key={st.username}
                      onClick={() => setSelectedStudent(st)}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                    >
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {st.username.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-foreground">{st.fullName || st.username}</div>
                            <div className="text-xs text-muted-foreground font-mono">@{st.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium text-foreground">
                        {st.course || <span className="text-muted-foreground">-</span>}
                      </td>

                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        <span className="font-semibold text-foreground">{st.year}</span>
                        {st.batch && <span className="block text-[11px] font-mono">{st.batch}</span>}
                      </td>

                      <td className="py-3 px-4 text-center font-extrabold text-primary">
                        {st.totalPoints} pts
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400">
                        ⚡ {st.totalTimeSeconds}s
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-mono">
                          {st.daysCompleted}/10
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs px-2.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudent(st);
                          }}
                        >
                          View Details <ArrowRight size={12} className="ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                        No students found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT DETAIL MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary text-lg font-bold flex items-center justify-center">
                  {selectedStudent.username.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {selectedStudent.fullName || selectedStudent.username}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">@{selectedStudent.username}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setSelectedStudent(null)}
              >
                <X size={16} />
              </Button>
            </div>

            {/* Academic Profile Details */}
            <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-xs border border-border">
              <div className="text-[11px] font-bold uppercase text-primary tracking-wider mb-1 flex items-center gap-1">
                <GraduationCap size={13} /> Academic Information
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-muted-foreground block">Course:</span>
                  <strong className="text-foreground text-sm">{selectedStudent.course || 'Not provided'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Semester:</span>
                  <strong className="text-foreground text-sm">{selectedStudent.year || 'Not provided'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Batch:</span>
                  <strong className="text-foreground text-sm">{selectedStudent.batch || 'Not provided'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Roll No / ID:</span>
                  <strong className="text-foreground text-sm">{selectedStudent.rollNo || 'N/A'}</strong>
                </div>
              </div>
            </div>

            {/* Tournament Summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-card border border-border rounded-xl">
                <span className="text-[11px] text-muted-foreground uppercase block font-semibold">Total Points</span>
                <strong className="text-lg font-bold text-primary">{selectedStudent.totalPoints}</strong>
              </div>
              <div className="p-3 bg-card border border-border rounded-xl">
                <span className="text-[11px] text-muted-foreground uppercase block font-semibold">Total Time</span>
                <strong className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {selectedStudent.totalTimeSeconds}s
                </strong>
              </div>
              <div className="p-3 bg-card border border-border rounded-xl">
                <span className="text-[11px] text-muted-foreground uppercase block font-semibold">Completed</span>
                <strong className="text-lg font-bold text-foreground font-mono">
                  {selectedStudent.daysCompleted}/10
                </strong>
              </div>
            </div>

            <Button
              className="w-full font-bold"
              onClick={() => setSelectedStudent(null)}
            >
              Close Profile
            </Button>
          </div>
        </div>
      )}

      {/* TAB 4: ADMIN ACCESS MANAGEMENT (Main Admin Only) */}
      {isMainAdmin && activeTab === 'admins' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Admin Form */}
            <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                <UserPlus size={18} className="text-primary" /> Add New Admin
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Grant administration privileges to team members.
              </p>

              {adminActionMsg && (
                <div
                  className={`p-3 rounded-lg text-xs mb-4 flex items-center gap-2 border ${
                    adminActionMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  {adminActionMsg.type === 'success' ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
                  <span>{adminActionMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleAddAdmin} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="admin-username" className="text-xs">Username</Label>
                  <Input
                    id="admin-username"
                    placeholder="e.g. curator_rohit"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="admin-name" className="text-xs">Full Name</Label>
                  <Input
                    id="admin-name"
                    placeholder="e.g. Rohit Sharma"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="admin-password" className="text-xs">Password</Label>
                    <button
                      type="button"
                      onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer select-none transition-colors"
                      tabIndex={-1}
                    >
                      {showNewAdminPassword ? (
                        <>
                          <EyeOff size={12} />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye size={12} />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="admin-password"
                      type={showNewAdminPassword ? 'text' : 'password'}
                      placeholder={showNewAdminPassword ? 'Enter new admin password' : '••••••••'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 transition-colors"
                      aria-label={showNewAdminPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showNewAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="admin-role" className="text-xs">Role</Label>
                  <select
                    id="admin-role"
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as AdminRole)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="admin">Sub Admin (Can live quiz, cannot see answers / add admins / view directory)</option>
                    <option value="main_admin">Main Admin (Full control + see answers + student directory)</option>
                  </select>
                </div>

                <Button type="submit" className="w-full mt-2" size="sm">
                  <UserPlus size={14} className="mr-1.5" /> Add Administrator
                </Button>
              </form>
            </div>

            {/* Admin Accounts List */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Active Administrators</h2>
                  <p className="text-xs text-muted-foreground">
                    List of all authorized administrator accounts.
                  </p>
                </div>
                <span className="text-xs font-mono bg-muted px-2.5 py-1 rounded">
                  Total: {adminList.length}
                </span>
              </div>

              <div className="divide-y divide-border">
                {adminList.map((adm: AdminUser) => {
                  const isSelf = adm.username.toLowerCase() === session.user?.username.toLowerCase();
                  return (
                    <div key={adm.username} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                            adm.role === 'main_admin'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {adm.role === 'main_admin' ? <Crown size={16} /> : <Shield size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{adm.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">@{adm.username}</span>
                            {isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>Role: <b>{adm.role === 'main_admin' ? 'Main Admin' : 'Sub Admin'}</b></span>
                            <span>•</span>
                            <span>Added {new Date(adm.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {!isSelf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 h-8 px-2"
                          onClick={() => handleDeleteAdmin(adm.username)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
