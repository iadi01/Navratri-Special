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
  Edit3,
  Save,
  XCircle,
  AlertTriangle,
  Check,
  Sparkles,
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
  syncAdminsFromServer,
  addAdmin,
  deleteAdmin,
  getLiveDays,
  syncLiveDaysWithServer,
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

const ADMIN_PUZZLE_LEVELS = [
  {
    name: 'Easy',
    level: 0,
    cols: 3,
    rows: 3,
    totalTiles: 9,
    art: '🪔',
    desc: 'Level 1: 3×3 Grid · Maa Durga ki jyoti — light the way!',
    image: '/navratri-puzzle-art-0.jpg',
    aspectRatio: '1 / 1',
  },
  {
    name: 'Medium',
    level: 1,
    cols: 4,
    rows: 3,
    totalTiles: 12,
    art: '🌺',
    desc: 'Level 2: 4×3 Grid · Divine Navratri celebration.',
    image: '/navratri-puzzle-art-1.jpg',
    aspectRatio: '4 / 3',
  },
  {
    name: 'Hard',
    level: 2,
    cols: 6,
    rows: 3,
    totalTiles: 18,
    art: '💃',
    desc: 'Level 3: 6×3 Grid · Dandiya night celebration!',
    image: '/navratri-puzzle-art-2.jpg',
    aspectRatio: '6 / 3',
  },
];

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
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Live days state
  const [liveDays, setLiveDays] = useState<number[]>([1]);

  // Selected day for inspection
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);

  // Student directory state
  const [participants, setParticipants] = useState<OverallLeaderboardEntry[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<OverallLeaderboardEntry | null>(null);
  const [editingStudent, setEditingStudent] = useState<{
    id?: string;
    username: string;
    fullName: string;
    course: string;
    year: string;
    batch: string;
    rollNo: string;
    day: number;
    points: number;
    timeSeconds: number;
    firstTryCount: number;
    studentRef?: OverallLeaderboardEntry;
  } | null>(null);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [studentActionMsg, setStudentActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New admin form state
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('admin');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [adminActionMsg, setAdminActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adminList, setAdminList] = useState<AdminUser[]>([]);

  // Navratri Sliding Puzzle Game Admin State
  const [puzzleEnabled, setPuzzleEnabled] = useState<boolean>(true);
  const [puzzleStats, setPuzzleStats] = useState<{
    totalAttemptsToday: number;
    fastestTimeSeconds: number | null;
    top10BonusAwardedCount: number;
  }>({
    totalAttemptsToday: 0,
    fastestTimeSeconds: null,
    top10BonusAwardedCount: 0,
  });
  const [isTogglingPuzzle, setIsTogglingPuzzle] = useState<boolean>(false);
  const [puzzleSubmissions, setPuzzleSubmissions] = useState<any[]>([]);
  const [showPuzzleSubmissions, setShowPuzzleSubmissions] = useState<boolean>(false);
  const [isLoadingPuzzleSubmissions, setIsLoadingPuzzleSubmissions] = useState<boolean>(false);
  const [showPuzzleInspector, setShowPuzzleInspector] = useState<boolean>(false);
  const [showGridOverlayOnArtwork, setShowGridOverlayOnArtwork] = useState<boolean>(false);

  const loadPuzzleSubmissions = async () => {
    setIsLoadingPuzzleSubmissions(true);
    try {
      const res = await fetch('/api/puzzle/leaderboard?date=all');
      if (res.ok) {
        const data = await res.json();
        setPuzzleSubmissions(Array.isArray(data) ? data : []);
      }
    } catch {}
    setIsLoadingPuzzleSubmissions(false);
  };

  const fetchPuzzleAdminData = async () => {
    try {
      const cfgRes = await fetch('/api/puzzle/config');
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        const isAct = cfg.enabled !== false;
        setPuzzleEnabled(isAct);
        try {
          localStorage.setItem('pehchaan_puzzle_config_cache', JSON.stringify({ enabled: isAct }));
        } catch {}
      }
      const statsRes = await fetch('/api/puzzle/stats');
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setPuzzleStats(stats);
      }
    } catch {}
  };

  useEffect(() => {
    const s = getAdminSession();
    setSession(s);
    setLiveDays(getLiveDays());
    setParticipants(getOverallLeaderboard());

    // Fetch live days & puzzle status from server
    syncLiveDaysWithServer().then(days => setLiveDays(days));
    fetchPuzzleAdminData();

    if (s.isAuthenticated) {
      setAdminList(getAllAdmins());
      syncAdminsFromServer().then(list => setAdminList(list));
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await loginAdmin(usernameInput, passwordInput);
      if (res.success && res.user) {
        setSession({ isAuthenticated: true, user: res.user });
        const list = await syncAdminsFromServer();
        setAdminList(list);
        setUsernameInput('');
        setPasswordInput('');
      } else {
        setLoginError(res.error || 'Authentication failed');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed. Please check network.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setSession({ isAuthenticated: false, user: null });
  };

  const handleToggleDay = async (day: number) => {
    const updated = await toggleDayLive(day);
    setLiveDays(updated);
  };

  const handleTogglePuzzle = async () => {
    setIsTogglingPuzzle(true);
    try {
      const nextState = !puzzleEnabled;
      const res = await fetch('/api/puzzle/config', {
        method: 'POST',
        headers: { 'Content-type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
      if (res.ok) {
        setPuzzleEnabled(nextState);
        try {
          localStorage.setItem('pehchaan_puzzle_config_cache', JSON.stringify({ enabled: nextState }));
        } catch {}
        fetchPuzzleAdminData();
      }
    } catch {
      alert('Failed to toggle puzzle game status.');
    } finally {
      setIsTogglingPuzzle(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session.user) return;
    setAdminActionMsg(null);
    setIsAddingAdmin(true);

    try {
      const res = await addAdmin(session.user, {
        username: newUsername,
        name: newName,
        password: newPassword,
        role: newRole,
      });

      if (res.success) {
        setAdminActionMsg({ type: 'success', text: `Admin @${newUsername} successfully saved to MongoDB Atlas!` });
        setNewUsername('');
        setNewName('');
        setNewPassword('');
        setNewRole('admin');
        const list = await syncAdminsFromServer();
        setAdminList(list);
      } else {
        setAdminActionMsg({ type: 'error', text: res.error || 'Failed to create admin in database' });
      }
    } catch (err: any) {
      setAdminActionMsg({ type: 'error', text: err?.message || 'Error communicating with server' });
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (targetUsername: string) => {
    if (!session.user) return;
    if (!confirm(`Are you sure you want to remove admin @${targetUsername}?`)) return;

    const res = await deleteAdmin(session.user, targetUsername);
    if (res.success) {
      setAdminActionMsg({ type: 'success', text: `Admin @${targetUsername} removed.` });
      const list = await syncAdminsFromServer();
      setAdminList(list);
    } else {
      setAdminActionMsg({ type: 'error', text: res.error || 'Failed to remove admin' });
    }
  };

  const handleStartEditStudent = (st: OverallLeaderboardEntry, targetDay?: number) => {
    const dayToUse = targetDay || st.dayBreakdown?.[0]?.day || 1;
    const dayScore = st.dayBreakdown?.find(d => d.day === dayToUse);
    setEditingStudent({
      username: st.username,
      fullName: st.fullName || st.username,
      course: st.course && st.course !== 'Not specified' ? st.course : 'BCA',
      year: st.year && st.year !== 'Not specified' ? st.year : '1st Sem',
      batch: st.batch && st.batch !== 'Not specified' ? st.batch : '',
      rollNo: st.rollNo !== '-' && st.rollNo !== 'N/A' ? (st.rollNo || '') : '',
      day: dayToUse,
      points: dayScore?.points ?? 0,
      timeSeconds: dayScore?.timeSeconds ?? 0,
      firstTryCount: dayScore?.firstTryCount ?? 3,
      studentRef: st,
    });
    setStudentActionMsg(null);
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingStudent(true);
    setStudentActionMsg(null);

    try {
      const res = await fetch('/api/admin/update-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingStudent,
          day: Number(editingStudent.day),
          points: Number(editingStudent.points),
          timeSeconds: Number(editingStudent.timeSeconds),
          firstTryCount: Number(editingStudent.firstTryCount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStudentActionMsg({
          type: 'success',
          text: `Day ${editingStudent.day} marks and details for "${editingStudent.fullName}" successfully updated in database!`,
        });
        await syncLeaderboardWithServer();
        const updatedList = getOverallLeaderboard();
        setParticipants(updatedList);
        if (selectedStudent?.username === editingStudent.username) {
          const updatedSelected = updatedList.find(p => p.username === editingStudent.username);
          if (updatedSelected) {
            setSelectedStudent(updatedSelected);
          }
        }
        setEditingStudent(null);
      } else {
        setStudentActionMsg({ type: 'error', text: data.error || 'Failed to update student score.' });
      }
    } catch (err: any) {
      setStudentActionMsg({ type: 'error', text: err?.message || 'Network error updating student score.' });
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleDeleteStudent = async (st: OverallLeaderboardEntry) => {
    const confirmName = st.fullName || st.username;
    if (!window.confirm(`Are you sure you want to permanently delete "${confirmName}" from the leaderboard and database? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/delete-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: st.username, deleteUser: true }),
      });
      const data = await res.json();
      if (data.success) {
        await syncLeaderboardWithServer();
        setParticipants(getOverallLeaderboard());
        if (selectedStudent?.username === st.username) {
          setSelectedStudent(null);
        }
        setStudentActionMsg({ type: 'success', text: `Participant "${confirmName}" permanently deleted from leaderboard.` });
      } else {
        alert(data.error || 'Failed to delete student.');
      }
    } catch (err: any) {
      alert(err?.message || 'Network error deleting student.');
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
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Enter admin username (e.g. kuchupuchu)"
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

            <Button type="submit" className="w-full mt-2" size="lg" disabled={isLoggingIn}>
              <KeyRound size={16} className="mr-2" />
              {isLoggingIn ? 'Verifying & Signing In...' : 'Sign In to Admin Panel'}
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

        {/* Student Directory - Accessible to all Admins */}
        <Button
          variant={activeTab === 'students' ? 'default' : 'outline'}
          onClick={() => setActiveTab('students')}
          className="gap-2"
        >
          <GraduationCap size={16} /> Student Directory ({participants.length})
        </Button>

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
          {/* 🌸 NAVRATRI SLIDING PUZZLE BROADCAST CONTROLLER */}
          <div className="bg-card border-2 border-pink-500/30 rounded-xl p-5 md:p-6 shadow-sm bg-gradient-to-r from-pink-50/40 via-card to-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧩</span>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    Navratri Sliding Puzzle Game Controller
                  </h2>
                  {puzzleEnabled ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> ACTIVE NOW
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      <Lock size={11} /> DISABLED
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Control the special Navratri sliding puzzle game globally. When enabled, users can play Easy, Medium & Hard levels. Puzzle scores are tracked separately in MongoDB and never added to the main quiz leaderboard.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  size="sm"
                  variant={puzzleEnabled ? 'outline' : 'default'}
                  onClick={handleTogglePuzzle}
                  disabled={isTogglingPuzzle}
                  className={`font-bold text-xs ${
                    puzzleEnabled
                      ? 'border-destructive text-destructive hover:bg-destructive/10'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {puzzleEnabled ? (
                    <>
                      <Lock size={13} className="mr-1.5" /> Turn Puzzle OFF
                    </>
                  ) : (
                    <>
                      <Unlock size={13} className="mr-1.5" /> Turn Puzzle ON
                    </>
                  )}
                </Button>

                <Button size="sm" variant="ghost" className="text-xs" asChild>
                  <Link to="/puzzle">
                    Open Puzzle Page <ArrowRight size={12} className="ml-1" />
                  </Link>
                </Button>

                {isMainAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPuzzleInspector(!showPuzzleInspector)}
                    className="border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-bold text-xs"
                  >
                    <Crown size={13} className="mr-1.5 text-amber-500" />
                    {showPuzzleInspector ? 'Hide Full Puzzle' : '👁️ View Full Puzzle (Main Admin Only)'}
                  </Button>
                )}
              </div>
            </div>

            {/* Puzzle Fast Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/60">
              <div className="bg-muted/40 rounded-lg p-2.5 border border-border/50">
                <span className="text-xs text-muted-foreground block">Today's Solvers</span>
                <span className="text-base font-bold text-foreground">
                  {puzzleStats.totalAttemptsToday} student(s)
                </span>
              </div>
              <div className="bg-muted/40 rounded-lg p-2.5 border border-border/50">
                <span className="text-xs text-muted-foreground block">Fastest Completion</span>
                <span className="text-base font-bold text-foreground font-mono">
                  {puzzleStats.fastestTimeSeconds !== null ? `${puzzleStats.fastestTimeSeconds}s` : 'None yet'}
                </span>
              </div>
              <div className="bg-muted/40 rounded-lg p-2.5 border border-border/50 col-span-2 sm:col-span-1">
                <span className="text-xs text-muted-foreground block">Leaderboard Status</span>
                <span className="text-base font-bold text-emerald-600 flex items-center gap-1">
                  Separated in MongoDB ✓
                </span>
              </div>
            </div>

            {/* View MongoDB Submissions Toggle */}
            <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                All puzzle runs are stored safely in MongoDB in the <code className="text-pink-600 font-mono font-semibold">puzzle_scores</code> collection.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!showPuzzleSubmissions) {
                    loadPuzzleSubmissions();
                  }
                  setShowPuzzleSubmissions(!showPuzzleSubmissions);
                }}
                className="text-xs font-bold"
              >
                {showPuzzleSubmissions ? 'Hide Solvers List' : 'View Solvers in MongoDB'}
              </Button>
            </div>

            {/* Submissions List Table */}
            {showPuzzleSubmissions && (
              <div className="mt-3 pt-3 border-t border-border/60 space-y-2.5 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground">
                    All MongoDB Puzzle Solvers ({puzzleSubmissions.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadPuzzleSubmissions}
                    disabled={isLoadingPuzzleSubmissions}
                    className="text-xs h-7"
                  >
                    Refresh List
                  </Button>
                </div>
                {isLoadingPuzzleSubmissions ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Loading from MongoDB...</p>
                ) : puzzleSubmissions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No puzzle submissions saved in MongoDB yet.</p>
                ) : (
                  <div className="overflow-x-auto max-h-72 overflow-y-auto border border-border rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/80 sticky top-0 font-bold border-b border-border text-muted-foreground">
                        <tr>
                          <th className="py-2 px-3">Participant</th>
                          <th className="py-2 px-3">Course / Roll</th>
                          <th className="py-2 px-3 text-center">Levels</th>
                          <th className="py-2 px-3 text-center">Points</th>
                          <th className="py-2 px-3 text-right">Time</th>
                          <th className="py-2 px-3 text-right">Moves</th>
                          <th className="py-2 px-3 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {puzzleSubmissions.map((sub, i) => (
                          <tr key={sub.id || i} className="hover:bg-muted/30">
                            <td className="py-2 px-3 font-semibold text-foreground">{sub.fullName || sub.username}</td>
                            <td className="py-2 px-3 text-muted-foreground">{sub.course || 'BCA'} {sub.rollNo ? `• ${sub.rollNo}` : ''}</td>
                            <td className="py-2 px-3 text-center font-bold text-pink-700">{sub.completedLevels}/3</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-pink-600">
                              +{sub.pointsEarned ?? (sub.completedLevels >= 3 ? 50 : sub.completedLevels === 2 ? 30 : 15)} PTS
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-medium">{sub.totalTimeSeconds}s</td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">{sub.totalMoves}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">{sub.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 👑 MAIN ADMIN ONLY: FULL PUZZLE INSPECTOR & ARTWORK GALLERY */}
            {isMainAdmin && showPuzzleInspector && (
              <div className="mt-4 pt-4 border-t border-amber-500/30 space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Crown size={20} className="text-amber-500 shrink-0" />
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground flex items-center gap-1.5">
                        Full Puzzle Artwork & Solution Inspector
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
                          MAIN ADMIN ONLY
                        </span>
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Complete target artwork solutions for all 3 levels. Regular students cannot view target artwork while playing.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGridOverlayOnArtwork(!showGridOverlayOnArtwork)}
                    className="text-xs font-bold h-7 border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 shrink-0"
                  >
                    <Layers size={13} className="mr-1" />
                    {showGridOverlayOnArtwork ? 'Hide Grid Cuts' : 'Show Grid Cuts Overlay'}
                  </Button>
                </div>

                {/* 3 Level Grid Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ADMIN_PUZZLE_LEVELS.map((lv) => (
                    <div
                      key={lv.name}
                      className="bg-card border-2 border-border/80 hover:border-amber-500/50 rounded-2xl p-3.5 space-y-3 shadow-sm transition-all flex flex-col"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="text-xl mr-1">{lv.art}</span>
                          <span className="font-extrabold text-sm text-foreground">
                            Level {lv.level + 1}: {lv.name}
                          </span>
                          <span className="block text-[11px] text-muted-foreground font-mono">
                            {lv.cols}×{lv.rows} Grid ({lv.totalTiles - 1} tiles + 1 blank)
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted font-bold text-muted-foreground">
                          Ratio {lv.aspectRatio}
                        </span>
                      </div>

                      <div
                        className="relative w-full rounded-xl overflow-hidden border-2 border-[#1C332E] bg-black/5 shadow-inner"
                        style={{ aspectRatio: lv.aspectRatio }}
                      >
                        <img
                          src={lv.image}
                          alt={lv.name}
                          className="w-full h-full object-cover select-none"
                        />
                        {showGridOverlayOnArtwork && (
                          <div
                            className="absolute inset-0 grid pointer-events-none"
                            style={{
                              gridTemplateColumns: `repeat(${lv.cols}, minmax(0, 1fr))`,
                              gridTemplateRows: `repeat(${lv.rows}, minmax(0, 1fr))`,
                            }}
                          >
                            {[...Array(lv.cols * lv.rows)].map((_, i) => (
                              <div
                                key={i}
                                className="border border-white/60 bg-black/10 flex items-center justify-center"
                              >
                                <span className="text-[9px] font-mono font-extrabold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                  {i + 1 === lv.cols * lv.rows ? 'BLANK' : i + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {lv.desc}
                      </p>

                      <div className="pt-2 mt-auto flex items-center justify-between gap-2 border-t border-border/50">
                        <a
                          href={lv.image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-pink-600 hover:underline flex items-center gap-1"
                        >
                          <Eye size={12} /> Full Image ↗
                        </a>
                        <Button size="sm" variant="outline" className="text-[11px] h-7 px-2.5 font-bold" asChild>
                          <Link to="/puzzle">
                            Test on /puzzle <ArrowRight size={11} className="ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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

      {/* TAB 3: STUDENT DIRECTORY (Visible to all Admins) */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <GraduationCap size={20} className="text-primary" /> Student &amp; Participant Directory
                </h2>
                <p className="text-sm text-muted-foreground">
                  View verified participants. Admins have permission to correct student names (Roll number and scores are locked).
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

            {studentActionMsg && (
              <div
                className={`p-3 rounded-lg text-xs mb-4 flex items-center justify-between border ${
                  studentActionMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-destructive/10 text-destructive border-destructive/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {studentActionMsg.type === 'success' ? <CheckCircle2 size={15} /> : <ShieldAlert size={15} />}
                  <span>{studentActionMsg.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStudentActionMsg(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

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

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(st);
                            }}
                          >
                            <Eye size={12} className="mr-1" /> View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditStudent(st);
                            }}
                          >
                            <Edit3 size={12} className="mr-1" /> {isMainAdmin ? 'Edit' : 'Edit Name'}
                          </Button>
                          {isMainAdmin && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs px-2"
                              title="Delete Participant (Main Admin only)"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStudent(st);
                              }}
                            >
                              <Trash2 size={12} />
                            </Button>
                          )}
                        </div>
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
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
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
                  <strong className="text-foreground text-sm font-mono">{selectedStudent.rollNo || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Network / IP:</span>
                  <span className="text-foreground text-xs font-mono">{selectedStudent.clientIp || 'Web Client'}</span>
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

            {/* 📝 DAY-WISE ANSWERS & SCORE LOG */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Layers size={14} /> Day-wise Quiz Responses &amp; Accuracy
                </span>
                <span className="text-[11px] font-mono font-bold text-muted-foreground">
                  {selectedStudent.dayBreakdown?.length || 0} Day(s) Recorded
                </span>
              </div>

              {(!selectedStudent.dayBreakdown || selectedStudent.dayBreakdown.length === 0) ? (
                <div className="text-center py-6 bg-muted/30 rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                  No daily quiz attempts recorded yet for this participant.
                  {isMainAdmin && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-bold gap-1 text-primary border-primary/30"
                        onClick={() => handleStartEditStudent(selectedStudent, 1)}
                      >
                        <Edit3 size={12} /> Assign Day 1 Marks
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedStudent.dayBreakdown.map((db) => {
                    const quiz = DAILY_QUIZZES.find(q => q.day === db.day);
                    const maxPts = db.day === 10 ? 100 : 30;
                    const hasDetailedAnswers = Array.isArray(db.answers) && db.answers.length > 0;
                    const totalQuestions = hasDetailedAnswers ? db.answers!.length : (quiz?.questions?.length || 3);
                    const wrongCount = hasDetailedAnswers
                      ? db.answers!.filter(a => !a.isCorrect).length
                      : Math.max(0, totalQuestions - (db.firstTryCount ?? totalQuestions));
                    const hasMistakes = wrongCount > 0;

                    return (
                      <div
                        key={db.day}
                        className={`border rounded-2xl p-4 space-y-3.5 transition-all text-xs ${
                          hasMistakes
                            ? 'bg-rose-500/[0.03] dark:bg-rose-950/[0.08] border-rose-500/25 shadow-xs'
                            : 'bg-card border-border/80'
                        }`}
                      >
                        {/* Day Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/60 pb-3">
                          <div>
                            <div className="font-extrabold text-foreground flex items-center gap-1.5 text-sm">
                              <Calendar size={14} className="text-primary" />
                              <span>Day {String(db.day).padStart(2, '0')}: {quiz?.title || `Quiz Chapter ${db.day}`}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Timer size={10} /> Submitted: {new Date(db.submittedAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Accuracy Status Badge */}
                            {hasMistakes ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 shadow-xs">
                                <AlertTriangle size={12} className="text-rose-500" />
                                {wrongCount} Wrong Answer{wrongCount > 1 ? 's' : ''} ({totalQuestions - wrongCount}/{totalQuestions} Correct)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-xs">
                                <Sparkles size={12} className="text-emerald-500" />
                                All {totalQuestions} Correct (100%)
                              </span>
                            )}

                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary border border-primary/20">
                              {db.points}/{maxPts} pts
                            </span>
                            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-muted text-emerald-600 dark:text-emerald-400 border border-border">
                              ⚡ {db.timeSeconds}s
                            </span>

                            {isMainAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2.5 font-bold gap-1 text-primary hover:bg-primary/10 border-primary/30"
                                onClick={() => handleStartEditStudent(selectedStudent, db.day)}
                              >
                                <Edit3 size={12} /> Edit Day {db.day} Marks
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Question-wise Answers & Correct/Wrong Breakdown */}
                        {hasDetailedAnswers ? (
                          <div className="space-y-2.5 pt-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                              <span>Question Responses Breakdown ({db.answers!.length} Questions):</span>
                              <span className={hasMistakes ? 'text-rose-500 font-black' : 'text-emerald-500 font-black'}>
                                {hasMistakes ? `${wrongCount} Mistake(s) Detected` : 'All 3 Answered Correctly'}
                              </span>
                            </div>

                            <div className="space-y-2.5">
                              {db.answers!.map((ans, aIdx) => {
                                const isWrong = !ans.isCorrect;
                                return (
                                  <div
                                    key={ans.questionId || aIdx}
                                    className={`rounded-xl p-3.5 space-y-2.5 border transition-all ${
                                      isWrong
                                        ? 'bg-rose-500/[0.08] dark:bg-rose-950/30 border-rose-500/40 shadow-xs'
                                        : 'bg-card border-border/80'
                                    }`}
                                  >
                                    {/* Question header row */}
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono ${
                                            isWrong
                                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                              : 'bg-primary/10 text-primary border border-primary/20'
                                          }`}>
                                            Question {ans.questionNumber || aIdx + 1}
                                          </span>
                                          {isWrong ? (
                                            <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                              <XCircle size={13} className="text-rose-500" /> INCORRECT CHOICE (0 pts)
                                            </span>
                                          ) : (
                                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                              <CheckCircle2 size={13} className="text-emerald-500" /> CORRECT ON 1ST TRY (+10 pts)
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs font-semibold text-foreground leading-relaxed pt-0.5">
                                          {ans.clue || quiz?.questions?.[aIdx]?.clue || 'Question clue'}
                                        </p>
                                      </div>
                                    </div>

                                    {/* High contrast comparison / answer section */}
                                    {isWrong ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                        {/* What user answered wrongly */}
                                        <div className="bg-rose-500/15 border border-rose-500/35 rounded-xl p-2.5 space-y-1">
                                          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                                            <X size={12} strokeWidth={3} className="text-rose-600 dark:text-rose-400" />
                                            Student's Wrong Choice:
                                          </div>
                                          <div className="font-mono font-black text-xs text-rose-800 dark:text-rose-200 line-through decoration-rose-600 decoration-2 break-words">
                                            {ans.selectedOption || '(None / Skipped)'}
                                          </div>
                                        </div>

                                        {/* What the correct answer actually is */}
                                        <div className="bg-emerald-500/15 border border-emerald-500/35 rounded-xl p-2.5 space-y-1">
                                          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                            <Check size={12} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400" />
                                            Correct Answer / Solution:
                                          </div>
                                          <div className="font-mono font-black text-xs text-emerald-800 dark:text-emerald-200 break-words">
                                            {ans.correctAnswer}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 pt-0.5 text-xs bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                                        <span className="text-muted-foreground text-[11px] font-semibold">Student Answered:</span>
                                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">
                                          {ans.selectedOption}
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-600/80 ml-auto flex items-center gap-1">
                                          <Check size={11} strokeWidth={3} /> Verified Correct
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-card p-3.5 rounded-xl border border-border/80 text-xs space-y-2">
                            <div className="flex items-center justify-between text-[11px] pb-1 border-b border-border/50">
                              <span className="font-semibold text-foreground">
                                Score: <strong className="text-primary font-mono">{db.points} pts</strong> ({db.firstTryCount}/{quiz?.questions?.length || 3} first attempt)
                              </span>
                              <span className="text-[10px] text-muted-foreground italic">
                                Detailed option logging active for upcoming submissions
                              </span>
                            </div>
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                Quiz Solution Key:
                              </span>
                              {quiz?.questions?.map((q, qIdx) => (
                                <div key={q.id || qIdx} className="flex items-center justify-between gap-3 text-[11px] p-2 rounded-lg bg-muted/40 border border-border/40">
                                  <span className="text-muted-foreground truncate max-w-[320px]">
                                    <strong className="text-foreground mr-1 font-mono">Q{qIdx + 1}:</strong> {q.clue}
                                  </span>
                                  <span className="shrink-0 font-bold text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                    Answer: {q.answer}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 font-bold text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                onClick={() => {
                  handleStartEditStudent(selectedStudent);
                }}
              >
                <Edit3 size={14} /> {isMainAdmin ? 'Edit Student & Score' : 'Edit Student Name'}
              </Button>
              {isMainAdmin && (
                <Button
                  variant="destructive"
                  className="flex-1 font-bold text-xs gap-1.5"
                  onClick={() => {
                    handleDeleteStudent(selectedStudent);
                  }}
                >
                  <Trash2 size={14} /> Delete Participant
                </Button>
              )}
            </div>

            <Button
              variant="secondary"
              className="w-full font-bold text-xs"
              onClick={() => setSelectedStudent(null)}
            >
              Close Profile
            </Button>
          </div>
        </div>
      )}

      {/* EDIT STUDENT & MARKS MODAL (MAIN ADMIN ONLY) */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Edit3 size={18} className="text-primary" /> {isMainAdmin ? 'Edit Participant & Score' : 'Edit Participant Name'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isMainAdmin
                    ? `Update marks/points, speed, and academic details for @${editingStudent.username}`
                    : `Update student name for @${editingStudent.username}. Roll number is locked.`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setEditingStudent(null)}
              >
                <X size={16} />
              </Button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="edit-fullname" className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Student Full Name *</span>
                  <span className="text-[11px] font-semibold text-primary">Editable by Admin</span>
                </Label>
                <Input
                  id="edit-fullname"
                  value={editingStudent.fullName}
                  onChange={e => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                  className="h-9 text-xs font-semibold"
                  placeholder="Enter student's verified full name"
                  required
                />
              </div>

              {/* 📅 Daily Marks Day Selector (Main Admin) */}
              {isMainAdmin && (
                <div className="space-y-1.5 bg-muted/60 p-3 rounded-xl border border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Calendar size={13} className="text-primary" /> Daily Marks Selection:
                    </span>
                    <span className="text-[11px] font-mono font-bold text-primary">
                      Editing Day {String(editingStudent.day).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Click any day below to view or edit that specific day's marks:
                  </p>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 pt-1">
                    {DAILY_QUIZZES.map((q) => {
                      const isCurrent = editingStudent.day === q.day;
                      const currentSt = editingStudent.studentRef || participants.find(p => p.username === editingStudent.username);
                      const dayScore = currentSt?.dayBreakdown?.find(d => d.day === q.day);
                      const hasAttempted = !!dayScore;
                      return (
                        <button
                          key={q.day}
                          type="button"
                          onClick={() => {
                            setEditingStudent({
                              ...editingStudent,
                              day: q.day,
                              points: dayScore?.points ?? 0,
                              timeSeconds: dayScore?.timeSeconds ?? 0,
                              firstTryCount: dayScore?.firstTryCount ?? 3,
                            });
                          }}
                          className={`p-1.5 rounded-lg text-center border text-xs font-bold transition-all cursor-pointer relative ${
                            isCurrent
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : hasAttempted
                              ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          <span className="block text-[10px]">D{q.day}</span>
                          {hasAttempted ? (
                            <span className="block text-[9px] font-mono leading-none font-black truncate">
                              {dayScore.points}p
                            </span>
                          ) : (
                            <span className="block text-[9px] font-mono leading-none text-muted-foreground">
                              0p
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Score / Marks & Time */}
              {isMainAdmin ? (
                <div className="grid grid-cols-3 gap-2.5 bg-primary/5 p-3 rounded-xl border border-primary/20">
                  <div className="space-y-1">
                    <Label htmlFor="edit-points" className="text-xs font-bold text-primary">
                      Day {editingStudent.day} Score (Points) *
                    </Label>
                    <Input
                      id="edit-points"
                      type="number"
                      min="0"
                      max={editingStudent.day === 10 ? 100 : 30}
                      value={editingStudent.points}
                      onChange={e => setEditingStudent({ ...editingStudent, points: Number(e.target.value) })}
                      className="h-9 text-sm font-black text-primary font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-time" className="text-xs font-bold text-emerald-600">Speed (Seconds)</Label>
                    <Input
                      id="edit-time"
                      type="number"
                      step="0.1"
                      min="0"
                      value={editingStudent.timeSeconds}
                      onChange={e => setEditingStudent({ ...editingStudent, timeSeconds: Number(e.target.value) })}
                      className="h-9 text-xs font-mono font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-firsttry" className="text-xs font-bold text-muted-foreground">Attempts (1-3)</Label>
                    <select
                      id="edit-firsttry"
                      value={editingStudent.firstTryCount}
                      onChange={e => setEditingStudent({ ...editingStudent, firstTryCount: Number(e.target.value) })}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs h-9 font-mono"
                    >
                      <option value="3">3/3</option>
                      <option value="2">2/3</option>
                      <option value="1">1/3</option>
                      <option value="0">0/3</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/40 p-3 rounded-xl border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">Day {editingStudent.day} Quiz Score &amp; Marks</span>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border flex items-center gap-1">
                      <Lock size={10} /> Numbers Locked
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-background/80 p-2 rounded-lg border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Score</span>
                      <strong className="text-primary font-black">{editingStudent.points} pts</strong>
                    </div>
                    <div className="bg-background/80 p-2 rounded-lg border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Speed</span>
                      <strong className="text-emerald-600 font-mono font-bold">{editingStudent.timeSeconds}s</strong>
                    </div>
                    <div className="bg-background/80 p-2 rounded-lg border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Accuracy</span>
                      <strong className="text-foreground font-mono font-bold">{editingStudent.firstTryCount}/3</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Academic Info Inputs */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label htmlFor="edit-course" className="text-xs font-semibold">Course / Degree</Label>
                  <select
                    id="edit-course"
                    value={editingStudent.course}
                    onChange={e => setEditingStudent({ ...editingStudent, course: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs h-9"
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
                  <Label htmlFor="edit-year" className="text-xs font-semibold">Semester</Label>
                  <select
                    id="edit-year"
                    value={editingStudent.year}
                    onChange={e => setEditingStudent({ ...editingStudent, year: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs h-9"
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

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label htmlFor="edit-batch" className="text-xs font-semibold">Batch</Label>
                  <Input
                    id="edit-batch"
                    placeholder="e.g. 2025-28 / Batch G"
                    value={editingStudent.batch}
                    onChange={e => setEditingStudent({ ...editingStudent, batch: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-roll" className="text-xs font-semibold">Roll No / Student ID</Label>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                      <Lock size={10} /> Number Locked
                    </span>
                  </div>
                  <Input
                    id="edit-roll"
                    value={editingStudent.rollNo || 'N/A'}
                    disabled
                    readOnly
                    className="h-9 text-xs font-mono bg-muted/60 opacity-80 cursor-not-allowed border-dashed"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Roll number cannot be changed from admin panel to maintain attempt security.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/3 text-xs"
                  onClick={() => setEditingStudent(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingStudent}
                  className="w-2/3 text-xs font-bold gap-1.5 shadow-xs"
                >
                  <Save size={14} /> {isSavingStudent ? 'Saving to Database...' : 'Save Changes'}
                </Button>
              </div>
            </form>
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

                <Button type="submit" className="w-full mt-2" size="sm" disabled={isAddingAdmin}>
                  <UserPlus size={14} className="mr-1.5" />
                  {isAddingAdmin ? 'Saving to Database...' : 'Add Administrator'}
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
