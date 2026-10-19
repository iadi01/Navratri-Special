import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { Search, Compass, BookOpen, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HEROINES_DATABASE, Heroine } from '@/data/heroines-data';
import { ShaktiReflection } from '@/components/shakti-reflection';

export const Route = createFileRoute('/heroines')({
  head: () => ({
    meta: [
      { title: 'Hall of Heroines — पहचानो कौन?' },
      {
        name: 'description',
        content: 'Explore the definitive archive of extraordinary Indian women across Ancient, Medieval, and Modern history.',
      },
      { property: 'og:title', content: 'Hall of Heroines — पहचानो कौन?' },
      { property: 'og:description', content: 'Meet the women who shaped India.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const [query, setQuery] = useState('');
  const [era, setEra] = useState<string>('All Eras');
  const [selectedHeroine, setSelectedHeroine] = useState<Heroine | null>(null);

  const eraCounts = useMemo(() => {
    return {
      all: HEROINES_DATABASE.length,
      ancient: HEROINES_DATABASE.filter(h => h.era === 'Ancient').length,
      medieval: HEROINES_DATABASE.filter(h => h.era === 'Medieval').length,
      modern: HEROINES_DATABASE.filter(h => h.era === 'Modern').length,
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return HEROINES_DATABASE.filter(w => {
      const matchesEra = era === 'All Eras' || w.era === era;
      if (!matchesEra) return false;
      if (!q) return true;

      return (
        w.name.toLowerCase().includes(q) ||
        w.field.toLowerCase().includes(q) ||
        w.text.toLowerCase().includes(q) ||
        (w.category && w.category.toLowerCase().includes(q)) ||
        (w.origin && w.origin.toLowerCase().includes(q))
      );
    });
  }, [query, era]);

  return (
    <main className="wrap section pb-20">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="eyebrow mb-2">
          <Compass size={14} className="inline mr-1" /> THE SACRED ARCHIVE
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
          Hall of Heroines
        </h1>
        <p className="text-sm md:text-base font-medium text-muted-foreground mt-3 max-w-xl mx-auto">
          Explore the stories of India’s philosophers, warriors, scientists, administrators, and cultural icons.
        </p>

        {/* Search & Filter Bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10 h-11 bg-background rounded-xl border-2 border-border font-medium text-sm shadow-xs"
              placeholder="Search by name, field, discovery, or origin…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Era Switcher Pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap mt-5">
          {[
            { label: 'All Eras', count: eraCounts.all },
            { label: 'Ancient', count: eraCounts.ancient },
            { label: 'Medieval', count: eraCounts.medieval },
            { label: 'Modern', count: eraCounts.modern },
          ].map(tab => {
            const active = era === tab.label;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setEra(tab.label)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold transition-all cursor-pointer border ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-muted/70 text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Heroines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(heroine => {
          const isAncient = heroine.era === 'Ancient';
          const isMedieval = heroine.era === 'Medieval';

          return (
            <article
              key={heroine.id}
              onClick={() => setSelectedHeroine(heroine)}
              className="group bg-card border-2 border-border rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Top badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      isAncient
                        ? 'bg-[var(--butter)] text-amber-950 dark:text-amber-200 border-amber-300'
                        : isMedieval
                        ? 'bg-[var(--petal)] text-rose-950 dark:text-rose-200 border-rose-300'
                        : 'bg-[var(--sky)] text-sky-950 dark:text-sky-200 border-sky-300'
                    }`}
                  >
                    {heroine.era} Era
                  </span>

                  {heroine.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-bold truncate max-w-[150px]">
                      {heroine.category}
                    </span>
                  )}
                </div>

                {/* Name & Origin */}
                <h3 className="font-black text-lg text-foreground group-hover:text-primary transition-colors">
                  {heroine.name}
                </h3>

                <div className="flex items-center gap-1.5 mt-1 mb-3 flex-wrap">
                  <span className="text-xs font-bold text-primary">{heroine.field}</span>
                  {heroine.origin && (
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      • {heroine.origin}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {heroine.text}
                </p>
              </div>

              {/* Card Footer */}
              <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="font-bold text-muted-foreground group-hover:text-foreground">
                  Read full story
                </span>
                <span className="text-primary font-extrabold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explore <ArrowRight size={13} />
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-muted/30 border-2 border-dashed border-border rounded-2xl max-w-xl mx-auto">
          <BookOpen size={32} className="mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="font-extrabold text-base text-foreground">No heroines found</h3>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query or era filter.</p>
          <Button variant="outline" size="sm" onClick={() => { setQuery(''); setEra('All Eras'); }} className="mt-4 text-xs font-bold">
            Reset Filters
          </Button>
        </div>
      )}

      {/* 🌸 SHAKTI REFLECTION: WHAT DID YOU LEARN? */}
      <div className="mt-16">
        <ShaktiReflection />
      </div>

      {/* Detailed Modal */}
      {selectedHeroine && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card text-card-foreground border-2 border-border rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                  {selectedHeroine.era} Era
                </span>
                <h2 className="text-2xl font-black text-foreground mt-2">{selectedHeroine.name}</h2>
                <p className="text-xs font-extrabold text-primary">{selectedHeroine.field}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                onClick={() => setSelectedHeroine(null)}
              >
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/60 p-4 rounded-2xl border border-border">
                <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">
                  Historical Significance &amp; Achievements
                </span>
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {selectedHeroine.text}
                </p>
              </div>

              {selectedHeroine.origin && (
                <div className="text-xs font-semibold text-muted-foreground">
                  <strong className="text-foreground">Region / Dynasty:</strong> {selectedHeroine.origin}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <Button
                className="w-full sm:flex-1 font-extrabold h-10 text-xs rounded-xl bg-[#B82348] hover:bg-[#961c3b] text-white cursor-pointer"
                onClick={() => {
                  setSelectedHeroine(null);
                  setTimeout(() => {
                    document.getElementById('shakti-reflection')?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }}
              >
                Reflect on Her Legacy 🌸
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto font-extrabold h-10 text-xs rounded-xl">
                <Link to="/challenge">
                  Play Challenge <ArrowRight size={13} className="ml-1" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full sm:w-auto font-bold h-10 text-xs rounded-xl"
                onClick={() => setSelectedHeroine(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
