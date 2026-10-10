import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ArrowRight, CalendarDays, Compass, ScrollText, LockKeyhole, Trophy, BookOpen, Crown, MoveUpRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiyaIcon } from '@/components/diya-icon';
import art from '@/assets/heroines-cute.jpg';
import { getLiveDays, syncLiveDaysWithServer } from '@/lib/admin-store';
import { DAILY_QUIZZES } from '@/data/quiz';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'पहचानो कौन? — Unsung Heroines of India' },
      { name: 'description', content: 'A daily puzzle hunt celebrating the extraordinary women of India. October 11–20.' },
      { property: 'og:title', content: 'पहचानो कौन? — Unsung Heroines of India' },
      { property: 'og:description', content: 'Ten days. Extraordinary women. Discover the stories history forgot.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Index,
});

function Index() {
  const [liveDays, setLiveDays] = useState<number[]>([1]);

  useEffect(() => {
    setLiveDays(getLiveDays());
    syncLiveDaysWithServer().then(days => setLiveDays(days));
    const handleUpdate = () => {
      setLiveDays(getLiveDays());
    };
    window.addEventListener('pehchaan_live_days_changed', handleUpdate);
    return () => window.removeEventListener('pehchaan_live_days_changed', handleUpdate);
  }, []);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-wrap">
          <div className="hero-content">
            <div className="eyebrow">
              <Compass size={14} /> A LITTLE MYSTERY. A LOT OF HERSTORY.
            </div>
            <h1>
              Unsung Heroines
              <br />
              of <span>India.</span>
            </h1>
            <p>
              Some stories deserve a little more spotlight.
              <br />
              Follow the clues. Find her name. Celebrate the women who changed our world.
            </p>
            <div className="hero-actions">
              <Button size="lg" asChild>
                <Link to="/challenge">
                  Join the hunt <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/heroines">
                  Meet the heroines <BookOpen />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                type="button"
                onClick={() => window.dispatchEvent(new Event('pehchaan_replay_intro'))}
                className="gap-2 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
              >
                <Play size={16} className="fill-primary" /> Watch Intro
              </Button>
            </div>
            <div className="hero-date">
              <CalendarDays size={15} /> October 11–20, 2026 <span>•</span> 10 days of discovery
            </div>
          </div>
          <div className="hero-art-box">
            <img
              className="hero-art"
              src={art}
              alt="Cute illustrated Indian warrior, philosopher, and scientist"
              width={1536}
              height={1024}
            />
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="stats">
          {[
            [BookOpen, '65+ incredible heroines', 'Across three historical eras'],
            [ScrollText, 'A new mystery, daily', 'Three women. Three clues.'],
            [Trophy, 'One grand finale', 'Your biggest challenge yet'],
          ].map(([Icon, title, sub]) => {
            const I = Icon as typeof BookOpen;
            return (
              <div className="stat" key={String(title)}>
                <I size={25} />
                <div>
                  <strong>{String(title)}</strong>
                  <small>{String(sub)}</small>
                </div>
              </div>
            );
          })}
        </div>

        <section className="section">
          <div className="section-heading">
            <div>
              <div className="eyebrow mb-2">YOUR DAILY DOSE OF DISCOVERY</div>
              <h2>The hunt awaits</h2>
              <p>Ten chapters. Countless stories worth remembering.</p>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/challenge">
                Play the hunt <ArrowRight />
              </Link>
            </Button>
          </div>

          <div className="days">
            {DAILY_QUIZZES.map((quiz, i) => {
              const dayNum = quiz.day;
              const isLive = liveDays.includes(dayNum);
              const isFinale = i === 9;

              return (
                <article
                  key={dayNum}
                  className={`day ${isLive ? 'featured' : ''} ${isFinale && !isLive ? 'finale' : ''}`}
                >
                  <small>DAY {String(dayNum).padStart(2, '0')}</small>
                  {isLive && <span className="tag">PLAY NOW</span>}
                  {isFinale && !isLive && <span className="tag">THE BIG ONE</span>}

                  <div className="day-icon">
                    {isFinale && !isLive ? (
                      <Crown size={20} />
                    ) : isLive ? (
                      <DiyaIcon size={20} />
                    ) : (
                      <LockKeyhole size={17} />
                    )}
                  </div>

                  <h3>
                    {isLive
                      ? (dayNum === 1 ? 'Today’s hunt' : quiz.title)
                      : isFinale
                      ? 'The Grand Finale'
                      : 'A mystery awaits…'}
                  </h3>

                  <p>
                    {isLive
                      ? 'Open now · 3 clues · 30 points'
                      : `Unlocks October ${11 + i}${isFinale ? ' · 10 questions' : ''}`}
                  </p>

                  {isLive && (
                    <Button size="sm" className="mt-3" asChild>
                      <Link to="/challenge" search={{ day: dayNum }}>
                        Play <ArrowRight />
                      </Link>
                    </Button>
                  )}
                </article>
              );
            })}
          </div>

          <div className="info-band">
            <div>
              <h3>Her story is waiting to be discovered.</h3>
              <p>Philosophers, trailblazers, warriors. Get to know the women beyond the clues.</p>
            </div>
            <Button variant="secondary" asChild>
              <Link to="/heroines">
                Explore the Hall of Heroines <MoveUpRight />
              </Link>
            </Button>
          </div>
        </section>

        <footer className="footer">
          <span>पहचानो कौन? · Celebrating the extraordinary.</span>
          <span>Inspired by our amazing girl ambassadors. Thank you for this beautiful idea.</span>
        </footer>
      </div>
    </>
  );
}
