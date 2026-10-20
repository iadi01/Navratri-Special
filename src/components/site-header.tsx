import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { Flower2, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
  const navigate = useNavigate();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPuzzleEnabled, setIsPuzzleEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const cached = localStorage.getItem('pehchaan_puzzle_config_cache');
      if (cached) {
        return JSON.parse(cached).enabled !== false;
      }
    } catch {}
    return true;
  });

  useEffect(() => {
    fetch('/api/puzzle/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => {
        if (cfg && typeof cfg.enabled === 'boolean') {
          setIsPuzzleEnabled(cfg.enabled);
          try {
            localStorage.setItem('pehchaan_puzzle_config_cache', JSON.stringify({ enabled: cfg.enabled }));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Secret key combination: Ctrl+Shift+A or Cmd+Shift+A
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        navigate({ to: '/admin' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleSecretTripleClick = (e: React.MouseEvent) => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (clickCountRef.current >= 3) {
      e.preventDefault();
      clickCountRef.current = 0;
      navigate({ to: '/admin' });
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 600);
    }
  };

  return (
    <header className="wrap header">
      <Link to="/" className="brand" onClick={handleSecretTripleClick}>
        <span className="brand-mark">
          <Flower2 size={24} />
        </span>
        <span>
          पहचानो कौन?
          <small>UNSUNG HEROINES OF INDIA</small>
        </span>
      </Link>
      <nav className="nav" aria-label="Main navigation">
        <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm px-2.5 sm:px-3">
          <Link to="/">
            <span className="hidden sm:inline">The daily hunt</span>
            <span className="sm:hidden">Hunt</span>
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm px-2.5 sm:px-3">
          <Link to="/heroines">
            <span className="hidden sm:inline">Hall of Heroines</span>
            <span className="sm:hidden">Heroines</span>
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm px-2.5 sm:px-3">
          <Link to="/leaderboard">Leaderboard</Link>
        </Button>
        {isPuzzleEnabled && (
          <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm px-2.5 sm:px-3 text-pink-700 font-bold hover:text-pink-800">
            <Link to="/puzzle">
              <span className="flex items-center gap-1">
                <span>🧩</span>
                <span className="hidden sm:inline">Puzzle</span>
                <span className="sm:hidden">Puzzle</span>
                <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full font-extrabold border border-pink-300">
                  Play
                </span>
              </span>
            </Link>
          </Button>
        )}
      </nav>
      <Button asChild size="sm" className="h-8 sm:h-9 text-xs sm:text-sm px-3 font-bold shrink-0">
        <Link to="/challenge">
          <span className="hidden sm:inline">Let's play</span>
          <span className="sm:hidden">Play</span> <ArrowUpRight size={14} className="ml-0.5" />
        </Link>
      </Button>
    </header>
  );
}
