import { Link, useNavigate, useLocation } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { Flower2, ArrowUpRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
    <header className="header-wrapper border-b border-border/50 bg-background sticky top-0 z-40">
      <div className="wrap header">
        <Link to="/" className="brand">
          <span className="brand-mark" onClick={handleSecretTripleClick} title="पहचानो कौन?">
            <Flower2 size={24} />
          </span>
          <span>
            पहचानो कौन?
            <small>UNSUNG HEROINES OF INDIA</small>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="nav hidden md:flex items-center gap-2" aria-label="Main navigation">
          <Button variant="ghost" asChild className="font-bold text-sm">
            <Link to="/">The daily hunt</Link>
          </Button>
          <Button variant="ghost" asChild className="font-bold text-sm">
            <Link to="/heroines">Hall of Heroines</Link>
          </Button>
          <Button variant="ghost" asChild className="font-bold text-sm">
            <Link to="/leaderboard">Leaderboard</Link>
          </Button>
        </nav>

        {/* Desktop CTA Button */}
        <div className="hidden md:flex items-center">
          <Button asChild className="font-extrabold shadow-sm">
            <Link to="/challenge">Let's play <ArrowUpRight className="ml-1" size={16} /></Link>
          </Button>
        </div>

        {/* Mobile Action & Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Button asChild size="sm" className="h-9 px-3 text-xs font-bold shadow-xs">
            <Link to="/challenge">Play <ArrowUpRight size={13} className="ml-0.5" /></Link>
          </Button>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-9 h-9 rounded-xl border-1.5 border-foreground bg-muted flex items-center justify-center text-foreground cursor-pointer shadow-xs"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-1.5" aria-label="Mobile navigation">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl font-extrabold text-sm hover:bg-muted bg-muted/40 border border-border"
            >
              <span>The daily hunt</span>
              <ArrowUpRight size={15} className="text-muted-foreground" />
            </Link>
            <Link
              to="/heroines"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl font-extrabold text-sm hover:bg-muted bg-muted/40 border border-border"
            >
              <span>Hall of Heroines</span>
              <ArrowUpRight size={15} className="text-muted-foreground" />
            </Link>
            <Link
              to="/leaderboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl font-extrabold text-sm hover:bg-muted bg-muted/40 border border-border"
            >
              <span>Leaderboard</span>
              <ArrowUpRight size={15} className="text-muted-foreground" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}


