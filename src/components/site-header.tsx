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
    <header className="wrap header relative z-40">
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
      <nav className="nav hidden md:flex" aria-label="Main navigation">
        <Button variant="ghost" asChild>
          <Link to="/">The daily hunt</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/heroines">Hall of Heroines</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/leaderboard">Leaderboard</Link>
        </Button>
      </nav>

      {/* Desktop CTA */}
      <Button asChild className="hidden md:inline-flex">
        <Link to="/challenge">Let's play <ArrowUpRight /></Link>
      </Button>

      {/* Mobile Actions */}
      <div className="flex md:hidden items-center gap-2">
        <Button asChild size="sm" className="h-8.5 px-3 text-xs font-bold">
          <Link to="/challenge">Play <ArrowUpRight size={13} className="ml-0.5" /></Link>
        </Button>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-8.5 h-8.5 rounded-lg border border-border bg-muted flex items-center justify-center text-foreground cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="w-full md:hidden pt-3 pb-2 border-t border-dashed border-border flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-150">
          <Link
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="px-3 py-2 rounded-lg font-bold text-sm hover:bg-muted bg-muted/30"
          >
            The daily hunt
          </Link>
          <Link
            to="/heroines"
            onClick={() => setIsMobileMenuOpen(false)}
            className="px-3 py-2 rounded-lg font-bold text-sm hover:bg-muted bg-muted/30"
          >
            Hall of Heroines
          </Link>
          <Link
            to="/leaderboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className="px-3 py-2 rounded-lg font-bold text-sm hover:bg-muted bg-muted/30"
          >
            Leaderboard
          </Link>
        </div>
      )}
    </header>
  );
}


