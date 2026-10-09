import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { Flower2, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
  const navigate = useNavigate();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

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
          पहचान कौन?
          <small>UNSUNG HEROINES OF INDIA</small>
        </span>
      </Link>
      <nav className="nav" aria-label="Main navigation">
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
      <Button asChild>
        <Link to="/challenge">
          Let's play <ArrowUpRight />
        </Link>
      </Button>
    </header>
  );
}
