import { createFileRoute, Link } from '@tanstack/react-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Trophy,
  Download,
  Share2,
  Copy,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Check,
  Medal,
  Award,
  Crown,
  Flower2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getOverallLeaderboard,
  syncLeaderboardWithServer,
  type OverallLeaderboardEntry,
} from '@/lib/leaderboard-store';

export const Route = createFileRoute('/cards')({
  component: ShareCardsPage,
});

export interface CardItem {
  id: string;
  rank: number;
  name: string;
  score: number;
  maxScore: number;
  timeSeconds: number;
  chapters: number;
  totalChapters: number;
  course: string;
  batch: string;
  puzzleBonus: number;
}

const DEFAULT_CARDS: CardItem[] = [
  {
    id: 'card-1',
    rank: 1,
    name: 'Ananya Sharma',
    score: 300,
    maxScore: 320,
    timeSeconds: 245,
    chapters: 10,
    totalChapters: 10,
    course: 'BCA',
    batch: '2025-28',
    puzzleBonus: 50,
  },
  {
    id: 'card-2',
    rank: 2,
    name: 'Rohit Verma',
    score: 288,
    maxScore: 320,
    timeSeconds: 310,
    chapters: 10,
    totalChapters: 10,
    course: 'MCA',
    batch: '2024-26',
    puzzleBonus: 30,
  },
  {
    id: 'card-3',
    rank: 3,
    name: 'Priya Singh',
    score: 275,
    maxScore: 320,
    timeSeconds: 340,
    chapters: 9,
    totalChapters: 10,
    course: 'BBA',
    batch: '2025-28',
    puzzleBonus: 20,
  },
  {
    id: 'card-4',
    rank: 4,
    name: 'Karan Mehta',
    score: 260,
    maxScore: 320,
    timeSeconds: 410,
    chapters: 9,
    totalChapters: 10,
    course: 'BCA',
    batch: '2025-28',
    puzzleBonus: 0,
  },
  {
    id: 'card-5',
    rank: 5,
    name: 'Sneha Patel',
    score: 251,
    maxScore: 320,
    timeSeconds: 460,
    chapters: 8,
    totalChapters: 10,
    course: 'B.Com',
    batch: '2025-28',
    puzzleBonus: 0,
  },
];

function drawCardCanvas(canvas: HTMLCanvasElement, card: CardItem) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;

  // 1. Background - Warm festive ivory blush
  ctx.fillStyle = '#FFF7F8';
  ctx.fillRect(0, 0, width, height);

  // Subtle radial gradient for festive glow
  const bgGrad = ctx.createRadialGradient(width / 2, 400, 100, width / 2, 700, 800);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(0.6, '#FFF5F6');
  bgGrad.addColorStop(1, '#FCE8EE');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Scrapbook Borders
  // Outer deep spruce border
  ctx.strokeStyle = '#1C332E';
  ctx.lineWidth = 8;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // Inner dashed festive border
  ctx.setLineDash([14, 14]);
  ctx.strokeStyle = '#C93B54';
  ctx.lineWidth = 3;
  ctx.strokeRect(52, 52, width - 104, height - 104);
  ctx.setLineDash([]); // Reset dash

  // Corner floral embellishments
  const drawCornerDiya = (cx: number, cy: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#B82348';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawCornerDiya(52, 52);
  drawCornerDiya(width - 52, 52);
  drawCornerDiya(52, height - 52);
  drawCornerDiya(width - 52, height - 52);

  // 3. Top Washi Tape
  const tapeW = 440;
  const tapeH = 50;
  const tapeX = (width - tapeW) / 2;
  const tapeY = 80;

  ctx.fillStyle = '#FBF0C8'; // Butter yellow
  ctx.strokeStyle = '#1C332E';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(tapeX, tapeY, tapeW, tapeH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#1C332E';
  ctx.font = '800 20px "DM Sans", -apple-system, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('🪔 NAVSHAKTI · UNSUNG HEROINES 🪔', width / 2, tapeY + 32);

  // 4. Series Title & Heading
  ctx.fillStyle = '#B82348';
  ctx.font = '900 64px "Baloo 2", -apple-system, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('पहचानो कौन?', width / 2, 210);

  ctx.fillStyle = '#1C332E';
  ctx.font = '800 24px "DM Sans", -apple-system, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('OFFICIAL CHAMPIONSHIP HONORS', width / 2, 252);

  // 5. Distinctive Rank Badge
  const badgeY = 300;
  const badgeW = 600;
  const badgeH = 110;
  const badgeX = (width - badgeW) / 2;

  if (card.rank === 1) {
    // 👑 Rank 1: Regal Gold Champion Badge
    ctx.fillStyle = '#1C332E';
    ctx.beginPath();
    ctx.roundRect(badgeX + 8, badgeY + 8, badgeW, badgeH, 24);
    ctx.fill();

    const goldGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
    goldGrad.addColorStop(0, '#FEF08A');
    goldGrad.addColorStop(0.5, '#FDE047');
    goldGrad.addColorStop(1, '#EAB308');
    ctx.fillStyle = goldGrad;
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1C332E';
    ctx.font = '900 48px "Baloo 2", -apple-system, sans-serif';
    ctx.fillText('👑 #1 GRAND CHAMPION', width / 2, badgeY + 68);

    ctx.font = '800 16px "DM Sans", -apple-system, sans-serif';
    ctx.fillStyle = '#854D0E';
    ctx.letterSpacing = '2px';
    ctx.fillText('HIGHEST ACADEMIC & TIME ACCURACY', width / 2, badgeY + 95);
  } else if (card.rank === 2) {
    // 🥈 Rank 2: Metallic Silver Runner-Up Badge
    ctx.fillStyle = '#1C332E';
    ctx.beginPath();
    ctx.roundRect(badgeX + 8, badgeY + 8, badgeW, badgeH, 24);
    ctx.fill();

    const silverGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
    silverGrad.addColorStop(0, '#F8FAFC');
    silverGrad.addColorStop(0.5, '#E2E8F0');
    silverGrad.addColorStop(1, '#CBD5E1');
    ctx.fillStyle = silverGrad;
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1C332E';
    ctx.font = '900 48px "Baloo 2", -apple-system, sans-serif';
    ctx.fillText('🥈 #2 1ST RUNNER UP', width / 2, badgeY + 68);

    ctx.font = '800 16px "DM Sans", -apple-system, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.letterSpacing = '2px';
    ctx.fillText('OUTSTANDING PERFORMANCE & SPEED', width / 2, badgeY + 95);
  } else if (card.rank === 3) {
    // 🥉 Rank 3: Warm Bronze 2nd Runner-Up Badge
    ctx.fillStyle = '#1C332E';
    ctx.beginPath();
    ctx.roundRect(badgeX + 8, badgeY + 8, badgeW, badgeH, 24);
    ctx.fill();

    const bronzeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
    bronzeGrad.addColorStop(0, '#FFF7ED');
    bronzeGrad.addColorStop(0.5, '#FFEDD5');
    bronzeGrad.addColorStop(1, '#FDBA74');
    ctx.fillStyle = bronzeGrad;
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1C332E';
    ctx.font = '900 48px "Baloo 2", -apple-system, sans-serif';
    ctx.fillText('🥉 #3 2ND RUNNER UP', width / 2, badgeY + 68);

    ctx.font = '800 16px "DM Sans", -apple-system, sans-serif';
    ctx.fillStyle = '#9A3412';
    ctx.letterSpacing = '2px';
    ctx.fillText('SUPERLATIVE KNOWLEDGE & DEDICATION', width / 2, badgeY + 95);
  } else {
    // 🏅 Rank 4+: Clean Uniform Card with Rank
    ctx.fillStyle = '#1C332E';
    ctx.beginPath();
    ctx.roundRect(badgeX + 8, badgeY + 8, badgeW, badgeH, 24);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1C332E';
    ctx.font = '900 46px "Baloo 2", -apple-system, sans-serif';
    ctx.fillText(`🏅 CAMPUS RANK #${card.rank}`, width / 2, badgeY + 68);

    ctx.font = '800 16px "DM Sans", -apple-system, sans-serif';
    ctx.fillStyle = '#B82348';
    ctx.letterSpacing = '2px';
    ctx.fillText('TOP TIER FINALIST · PROUD PARTICIPANT', width / 2, badgeY + 95);
  }

  // 6. Student Name & Academic Details
  const studentCardY = 445;
  const studentCardW = 860;
  const studentCardH = 480;
  const studentCardX = (width - studentCardW) / 2;

  // Student Card Shadow & Face
  ctx.fillStyle = '#E8D4D8';
  ctx.beginPath();
  ctx.roundRect(studentCardX + 10, studentCardY + 12, studentCardW, studentCardH, 28);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#1C332E';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(studentCardX, studentCardY, studentCardW, studentCardH, 28);
  ctx.fill();
  ctx.stroke();

  // Participant Name
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1C332E';
  ctx.font = '900 52px "Baloo 2", -apple-system, sans-serif';
  const displayName = card.name.trim() || 'Anonymous Explorer';
  ctx.fillText(displayName.toUpperCase(), width / 2, studentCardY + 70);

  // Course / Semester Subtitle
  ctx.fillStyle = '#5A7A73';
  ctx.font = '700 22px "DM Sans", -apple-system, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText(`${card.course || 'BCA'} · ${card.batch || 'Batch 2025-28'} · AMITY UNIVERSITY ONLINE`, width / 2, studentCardY + 110);

  // Central Score Emblem
  const emblemY = studentCardY + 235;
  const emblemR = 85;

  // Shadow
  ctx.fillStyle = '#D9B8BE';
  ctx.beginPath();
  ctx.arc(width / 2 + 8, emblemY + 8, emblemR, 0, Math.PI * 2);
  ctx.fill();

  // Score Circle (Butter Yellow)
  ctx.beginPath();
  ctx.arc(width / 2, emblemY, emblemR, 0, Math.PI * 2);
  ctx.fillStyle = '#FBF0C8';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#1C332E';
  ctx.stroke();

  // Score Numbers
  ctx.fillStyle = '#1C332E';
  ctx.font = '900 60px "Baloo 2", -apple-system, sans-serif';
  ctx.fillText(String(card.score), width / 2, emblemY + 16);

  ctx.fillStyle = '#854D0E';
  ctx.font = '800 16px "DM Sans", -apple-system, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(`OUT OF ${card.maxScore} PTS`, width / 2, emblemY + 44);

  // Extra Puzzle Points Mention (Prominently requested by user)
  if (card.puzzleBonus && card.puzzleBonus > 0) {
    const pzW = 540;
    const pzH = 40;
    const pzX = (width - pzW) / 2;
    const pzY = studentCardY + 350;

    ctx.fillStyle = '#D4F4E2'; // Mint green
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pzX, pzY, pzW, pzH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#065F46';
    ctx.font = '800 17px "DM Sans", -apple-system, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText(`🧩 INCLUDES +${card.puzzleBonus} EXTRA PUZZLE CHALLENGE BONUS`, width / 2, pzY + 26);
  }

  // Tier Text below score
  const tierY = card.puzzleBonus > 0 ? studentCardY + 425 : studentCardY + 380;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#B82348';
  ctx.font = '900 28px "Baloo 2", -apple-system, sans-serif';
  ctx.fillText('✨ MASTER HERITAGE CHAMPION ✨', width / 2, tierY);

  // 7. Stat Pill Boxes (Time, Accuracy, Rank)
  const pillY = 955;
  const pillW = 270;
  const pillH = 90;
  const gap = 25;
  const totalPillsWidth = pillW * 3 + gap * 2;
  const pillStartX = (width - totalPillsWidth) / 2;

  const stats = [
    { label: 'COMPLETION TIME', val: `${card.timeSeconds}s`, icon: '⚡', bg: '#FCE7F0' },
    { label: 'ACCURACY', val: `${card.chapters}/${card.totalChapters} Days`, icon: '🎯', bg: '#FBF0C8' },
    { label: 'CAMPUS RANK', val: `#${card.rank}`, icon: card.rank === 1 ? '👑' : card.rank === 2 ? '🥈' : card.rank === 3 ? '🥉' : '🏅', bg: '#D4F4E2' },
  ];

  stats.forEach((st, idx) => {
    const px = pillStartX + idx * (pillW + gap);

    // Pill shadow
    ctx.fillStyle = '#1C332E';
    ctx.beginPath();
    ctx.roundRect(px + 6, pillY + 6, pillW, pillH, 18);
    ctx.fill();

    // Pill Face
    ctx.fillStyle = st.bg;
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, pillY, pillW, pillH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = '32px -apple-system, sans-serif';
    ctx.fillText(st.icon, px + 20, pillY + 56);

    ctx.fillStyle = '#5A7A73';
    ctx.font = '800 13px "DM Sans", -apple-system, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText(st.label, px + 70, pillY + 36);

    ctx.fillStyle = '#1C332E';
    ctx.font = '900 28px "Baloo 2", -apple-system, sans-serif';
    ctx.fillText(st.val, px + 70, pillY + 68);
  });

  // 8. Inspirational Footer Quote & Event Link
  const footerCardY = 1075;
  const footerCardW = 860;
  const footerCardH = 160;
  const footerCardX = (width - footerCardW) / 2;

  ctx.fillStyle = '#FBF0C8';
  ctx.strokeStyle = '#1C332E';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(footerCardX, footerCardY, footerCardW, footerCardH, 20);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#1C332E';
  ctx.font = 'italic 700 22px "DM Sans", -apple-system, sans-serif';
  ctx.fillText('“Learn from her courage. Carry the Shakti forward.”', width / 2, footerCardY + 48);

  ctx.fillStyle = '#B82348';
  ctx.font = '900 24px "Baloo 2", -apple-system, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('https://navratri-event.vercel.app', width / 2, footerCardY + 92);

  ctx.fillStyle = '#5A7A73';
  ctx.font = '700 16px "DM Sans", -apple-system, sans-serif';
  ctx.fillText('Organized with ❤️ for Amity University Online Community', width / 2, footerCardY + 128);
}

function ShareCardItem({
  card,
  onUpdate,
}: {
  card: CardItem;
  onUpdate: (updated: CardItem) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      drawCardCanvas(canvasRef.current, card);
    }
  }, [card]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Navshakti_Rank${card.rank}_${card.name.replace(/\s+/g, '_')}_Card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download failed', e);
    } finally {
      setTimeout(() => setDownloading(false), 400);
    }
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const shareText = `🏆 I achieved Rank #${card.rank} with ${card.score}/${card.maxScore} points in the Navshakti Unsung Heroines Championship! 🌸 Test your knowledge: https://navratri-event.vercel.app`;

    if (navigator.share) {
      try {
        canvas.toBlob(async (blob) => {
          if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'share.png', { type: 'image/png' })] })) {
            const file = new File([blob], `Navshakti_Rank${card.rank}.png`, { type: 'image/png' });
            await navigator.share({
              title: `Navshakti Rank #${card.rank}`,
              text: shareText,
              files: [file],
            });
          } else {
            await navigator.share({
              title: `Navshakti Rank #${card.rank}`,
              text: shareText,
              url: 'https://navratri-event.vercel.app',
            });
          }
        });
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error(err);
        }
      }
    }

    // Fallback: Copy caption
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      handleDownload();
    }
  };

  return (
    <div className="rounded-2xl border-2 border-foreground bg-card p-4 shadow-[6px_6px_0_var(--foreground)] flex flex-col justify-between">
      <div>
        {/* Canvas preview */}
        <div className="relative group">
          <canvas
            ref={canvasRef}
            className="w-full rounded-xl border-2 border-foreground aspect-[4/5] object-contain bg-[#FFF7F8]"
            width="1080"
            height="1350"
          />
          {card.rank <= 3 && (
            <div className="absolute top-3 right-3 shadow-md">
              {card.rank === 1 && (
                <span className="bg-yellow-400 text-yellow-950 font-black text-xs px-2.5 py-1 rounded-full border border-yellow-800 flex items-center gap-1">
                  👑 Winner
                </span>
              )}
              {card.rank === 2 && (
                <span className="bg-slate-200 text-slate-800 font-black text-xs px-2.5 py-1 rounded-full border border-slate-600 flex items-center gap-1">
                  🥈 Runner Up
                </span>
              )}
              {card.rank === 3 && (
                <span className="bg-orange-200 text-orange-900 font-black text-xs px-2.5 py-1 rounded-full border border-orange-600 flex items-center gap-1">
                  🥉 3rd Place
                </span>
              )}
            </div>
          )}
        </div>

        {/* Edit fields */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="col-span-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
              Participant Name
            </label>
            <input
              type="text"
              aria-label="Participant Name"
              className="w-full rounded-md border-2 border-foreground bg-background px-2.5 py-1.5 font-bold text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={card.name}
              onChange={(e) => onUpdate({ ...card, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
              Score (pts)
            </label>
            <input
              type="number"
              aria-label="Score"
              className="w-full rounded-md border-2 border-foreground bg-background px-2.5 py-1.5 font-bold text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={card.score}
              onChange={(e) => onUpdate({ ...card, score: Number(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
              Max Score (pts)
            </label>
            <input
              type="number"
              aria-label="Max Score"
              className="w-full rounded-md border-2 border-foreground bg-background px-2.5 py-1.5 font-bold text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={card.maxScore}
              onChange={(e) => onUpdate({ ...card, maxScore: Number(e.target.value) || 100 })}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
              Rank (#)
            </label>
            <input
              type="number"
              aria-label="Rank"
              className="w-full rounded-md border-2 border-foreground bg-background px-2.5 py-1.5 font-bold text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={card.rank}
              onChange={(e) => onUpdate({ ...card, rank: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
              Puzzle Extra (pts)
            </label>
            <input
              type="number"
              aria-label="Puzzle Extra Points"
              className="w-full rounded-md border-2 border-foreground bg-background px-2.5 py-1.5 font-bold text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={card.puzzleBonus}
              onChange={(e) => onUpdate({ ...card, puzzleBonus: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 rounded-full border-2 border-foreground bg-primary py-2.5 px-3 font-display font-bold text-xs sm:text-sm text-primary-foreground shadow-[3px_3px_0_var(--foreground)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <Download size={15} />
          <span>{downloading ? 'Preparing...' : `⬇ Download #${card.rank} Card`}</span>
        </button>

        <button
          onClick={handleShare}
          title="Share or Copy text"
          className="rounded-full border-2 border-foreground bg-white py-2.5 px-3 font-bold text-xs text-foreground shadow-[2px_2px_0_var(--foreground)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none flex items-center justify-center gap-1 cursor-pointer shrink-0"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
        </button>
      </div>
    </div>
  );
}

function ShareCardsPage() {
  const [cards, setCards] = useState<CardItem[]>(DEFAULT_CARDS);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Sync actual real student records from leaderboard
  const handleSyncFromLeaderboard = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      await syncLeaderboardWithServer(true);
      const overall = getOverallLeaderboard();
      if (overall && overall.length > 0) {
        const topOverall = overall.slice(0, 10);
        const mappedCards: CardItem[] = topOverall.map((entry, idx) => ({
          id: `student-${entry.rollNo || entry.username || idx}`,
          rank: idx + 1,
          name: entry.fullName || entry.username,
          score: entry.totalPoints,
          maxScore: 360,
          timeSeconds: Math.round(entry.totalTimeSeconds),
          chapters: entry.daysCompleted || 10,
          totalChapters: 10,
          course: entry.course || 'BCA',
          batch: entry.batch || '2025-28',
          puzzleBonus: entry.puzzleBonus || 0,
        }));
        setCards(mappedCards);
        setSyncMessage(`Loaded top ${mappedCards.length} students from live leaderboard!`);
      } else {
        setSyncMessage('Leaderboard is currently empty or loading.');
      }
    } catch (e) {
      console.error(e);
      setSyncMessage('Failed to load leaderboard data.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const handleUpdateCard = (updated: CardItem) => {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleAddCard = () => {
    const nextRank = cards.length + 1;
    const newCard: CardItem = {
      id: `custom-${Date.now()}`,
      rank: nextRank,
      name: `Participant #${nextRank}`,
      score: Math.max(100, 320 - nextRank * 15),
      maxScore: 320,
      timeSeconds: 400 + nextRank * 20,
      chapters: 10,
      totalChapters: 10,
      course: 'BCA',
      batch: '2025-28',
      puzzleBonus: 0,
    };
    setCards((prev) => [...prev, newCard]);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={16} /> Back to Leaderboard
          </Link>
          <span className="text-xs font-bold text-muted-foreground bg-[#FBF0C8] border border-foreground/20 px-3 py-1 rounded-full">
            High-Res 1080×1350 PNG Export
          </span>
        </div>

        {/* Heading & Subtitle as requested by user */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FBF0C8] border border-foreground rounded-full text-xs font-black uppercase tracking-wider mb-3 shadow-[2px_2px_0_var(--foreground)]">
            <Sparkles size={13} className="text-amber-600" />
            Celebratory Share Card Studio
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-primary">
            🏆 Leaderboard Share Cards
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground font-medium">
            1st, 2nd, 3rd ko special badge — baaki sab ko same card with rank.
          </p>
        </div>

        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border-2 border-foreground shadow-[4px_4px_0_var(--foreground)] mb-8">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSyncFromLeaderboard}
              disabled={syncing}
              variant="outline"
              size="sm"
              className="border-2 border-foreground font-bold text-xs h-9 gap-1.5 shadow-[2px_2px_0_var(--foreground)] cursor-pointer"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Syncing...' : 'Load from Live Leaderboard'}</span>
            </Button>

            <Button
              onClick={handleAddCard}
              variant="outline"
              size="sm"
              className="border-2 border-foreground font-bold text-xs h-9 gap-1.5 shadow-[2px_2px_0_var(--foreground)] cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Custom Card</span>
            </Button>
          </div>

          <div className="text-xs font-bold text-muted-foreground">
            Total Cards: <span className="text-primary font-black">{cards.length}</span>
          </div>
        </div>

        {syncMessage && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-100 border-2 border-emerald-600 text-emerald-900 font-bold text-xs sm:text-sm text-center">
            {syncMessage}
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <ShareCardItem
              key={card.id}
              card={card}
              onUpdate={handleUpdateCard}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
