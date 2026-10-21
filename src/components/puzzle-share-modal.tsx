import React, { useEffect, useRef, useState } from 'react';
import {
  Share2,
  Download,
  Copy,
  ExternalLink,
  Check,
  X,
  Trophy,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PuzzleShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedLevels: number; // 1, 2, or 3
  totalTimeSeconds: number;
  totalMoves: number;
  pointsEarned: number; // 15, 30, or 50
  rank?: number;
  fullName: string;
  course?: string;
  year?: string;
  rollNo?: string;
  levelImage?: string;
}

export function PuzzleShareModal({
  isOpen,
  onClose,
  completedLevels,
  totalTimeSeconds,
  totalMoves,
  pointsEarned,
  rank,
  fullName,
  course = 'BCA',
  year = '1st Sem',
  rollNo,
  levelImage,
}: PuzzleShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const websiteUrl = 'https://navratri-event.vercel.app';
  const besocialUrl = 'https://besocial.amityonline.com/?tab=Posts';

  // Resolved puzzle artwork image
  const resolvedArtImage =
    levelImage ||
    (completedLevels >= 3
      ? '/navratri-puzzle-art-2.jpg'
      : completedLevels === 2
      ? '/navratri-puzzle-art-1.jpg'
      : '/navratri-puzzle-art-0.jpg');

  // Share caption matching the leaderboard format cleanly
  const puzzleRankText = rank
    ? (rank === 1
        ? '👑 Secured 1st Rank (Puzzle Champion)'
        : rank === 2
        ? '🥈 Secured 2nd Rank (Runner-Up)'
        : rank === 3
        ? '🥉 Secured 3rd Rank (Podium Finisher)'
        : rank <= 10
        ? `🌟 Secured Rank #${rank} (Top 10)`
        : `🏆 Secured Rank #${rank}`)
    : `🧩 Completed Level ${completedLevels}/3`;

  const shareCaption = `${puzzleRankText} in the Navratri Sliding Puzzle of "पहचानो कौन?" with ${pointsEarned} points in ${totalTimeSeconds}s (${totalMoves} moves)! 🌸\n\nCan you solve it faster with fewer moves? Test your speed on the festive puzzle: ${websiteUrl}\n\n@aahanasahay @singhsimrangopal22542`;

  // Draw 4:5 High-Resolution Scorecard Canvas (1080 x 1350)
  const drawCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 4:5 aspect ratio
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    // 1. Festive Background (Warm Ivory with subtle gradient)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#FFFDF8');
    bgGrad.addColorStop(0.5, '#FFF7EE');
    bgGrad.addColorStop(1, '#FFF0F3');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Scrapbook Outer Dark Border (#1C332E) & Inner Festive Border
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 10;
    ctx.strokeRect(32, 32, width - 64, height - 64);

    // Inner dashed decorative border
    ctx.setLineDash([12, 12]);
    ctx.strokeStyle = '#E0A96D';
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, width - 96, height - 96);
    ctx.setLineDash([]); // Reset dash

    // 3. Top Washi-Tape Header Badge
    const tapeW = 420;
    const tapeH = 50;
    const tapeX = (width - tapeW) / 2;
    const tapeY = 75;

    ctx.fillStyle = '#FDF0CD'; // Warm butter yellow
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(tapeX, tapeY, tapeW, tapeH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1C332E';
    ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('🪔 NAVRATRI SPECIAL PUZZLE 🪔', width / 2, tapeY + 33);

    // 4. Main Event Brand Titles
    ctx.fillStyle = '#1C332E';
    ctx.font = '900 52px "Baloo 2", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('पहचानो कौन? · PEHCHAAN KAUN', width / 2, 190);

    ctx.fillStyle = '#B82348'; // Festive rose / deep pink
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '1.2px';
    ctx.fillText('“NAVSHAKTI: THE UNSUNG HEROINES OF INDIA”', width / 2, 230);

    // 5. Participant Profile Pill
    const pillW = 680;
    const pillH = 64;
    const pillX = (width - pillW) / 2;
    const pillY = 265;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1C332E';
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '0.5px';
    const rollPart = rollNo ? ` · ${rollNo}` : '';
    const studentInfo = `👤 ${fullName || 'Pehchaan Kaun Player'}  |  ${course} · ${year}${rollPart}`;
    ctx.fillText(studentInfo, width / 2, pillY + 41);

    // 6. Solved Artwork Image Container (Natural Aspect Ratio Preserving - Zero Compression)
    const artBoxMaxW = 860;
    const artBoxMaxH = 440;
    const artBoxAreaY = 350;

    // Load and draw the solved puzzle artwork
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const natW = img.naturalWidth || img.width || 1;
      const natH = img.naturalHeight || img.height || 1;
      const imgRatio = natW / natH;

      // Fit inside artBoxMaxW x artBoxMaxH while strictly preserving natural aspect ratio
      let drawW = artBoxMaxW;
      let drawH = drawW / imgRatio;

      if (drawH > artBoxMaxH) {
        drawH = artBoxMaxH;
        drawW = drawH * imgRatio;
      }

      const drawX = (width - drawW) / 2;
      const drawY = artBoxAreaY + (artBoxMaxH - drawH) / 2;

      // Artwork background drop shadow
      ctx.fillStyle = '#1C332E';
      ctx.beginPath();
      ctx.roundRect(drawX + 8, drawY + 8, drawW, drawH, 20);
      ctx.fill();

      // Artwork frame
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, drawW, drawH, 20);
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Artwork border
      ctx.strokeStyle = '#1C332E';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, drawW, drawH, 20);
      ctx.stroke();

      // Top corner badge on Artwork
      const badgeW = 260;
      const badgeH = 44;
      const badgeX = drawX + drawW - badgeW - 14;
      const badgeY = drawY + 14;

      ctx.fillStyle = '#B82348';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const badgeText =
        completedLevels >= 3
          ? '🏆 ALL 3 LEVELS SOLVED!'
          : completedLevels === 2
          ? '🌺 2 LEVELS COMPLETED'
          : '🪔 LEVEL 1 COMPLETED';
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 28);

      // Finish drawing bottom half
      drawBottomSection();
    };

    img.onerror = () => {
      // Fallback if image fails to load
      const fallbackW = 760;
      const fallbackH = 430;
      const fallbackX = (width - fallbackW) / 2;
      const fallbackY = 355;

      ctx.fillStyle = '#1C332E';
      ctx.beginPath();
      ctx.roundRect(fallbackX, fallbackY, fallbackW, fallbackH, 20);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 32px "Baloo 2", sans-serif';
      ctx.fillText('🌸 NAVRATRI PUZZLE SOLVED! 🌸', width / 2, fallbackY + 220);

      drawBottomSection();
    };

    img.src = resolvedArtImage;

    const drawBottomSection = () => {
      // 7. Stats Grid (3 Big Metric Cards)
      const statCardW = 280;
      const statCardH = 160;
      const gap = 20;
      const totalStatsW = statCardW * 3 + gap * 2;
      const startStatsX = (width - totalStatsW) / 2;
      const statsY = 820;

      // Card 1: Time
      drawStatBox(
        startStatsX,
        statsY,
        statCardW,
        statCardH,
        '⏱️ TIME TAKEN',
        `${totalTimeSeconds}s`,
        'Fastest Solver Speed',
        '#FBF0C8', // Yellow
        '#1C332E'
      );

      // Card 2: Moves
      drawStatBox(
        startStatsX + statCardW + gap,
        statsY,
        statCardW,
        statCardH,
        '🎯 TOTAL MOVES',
        `${totalMoves}`,
        'Precision Sliding',
        '#BAE6FD', // Sky Blue
        '#0369A1'
      );

      // Card 3: Points Earned
      drawStatBox(
        startStatsX + (statCardW + gap) * 2,
        statsY,
        statCardW,
        statCardH,
        '🏆 POINTS EARNED',
        `+${pointsEarned} PTS`,
        completedLevels >= 3 ? '50 Max Points!' : `${completedLevels}/3 Completed`,
        '#FCE7F3', // Light Pink
        '#BE185D'
      );

      // 8. Levels Completed Progress Pill
      const progBoxW = 760;
      const progBoxH = 75;
      const progBoxX = (width - progBoxW) / 2;
      const progBoxY = 1015;

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#1C332E';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(progBoxX, progBoxY, progBoxW, progBoxH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1C332E';
      ctx.font = '800 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const l1 = '✓ Easy (15 pts)';
      const l2 = completedLevels >= 2 ? '✓ Medium (15 pts)' : '○ Medium (15 pts)';
      const l3 = completedLevels >= 3 ? '✓ Hard (20 pts)' : '○ Hard (20 pts)';
      ctx.fillText(`${l1}    ·    ${l2}    ·    ${l3}`, width / 2, progBoxY + 46);

      // 9. Call to Action / Rank Badge
      if (rank && rank > 0) {
        ctx.fillStyle = '#B82348';
        ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`🏆 CURRENT STANDING: RANK #${rank} ON SPEED LEADERBOARD! 🏆`, width / 2, 1130);
      } else {
        ctx.fillStyle = '#B82348';
        ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('🌸 NAVRATRI SPEED CHALLENGE · VERIFIED SOLVER 🌸', width / 2, 1130);
      }

      // 10. Bottom Footer Card
      const footerY = 1170;
      ctx.fillStyle = '#1C332E';
      ctx.beginPath();
      ctx.roundRect(120, footerY, width - 240, 95, 20);
      ctx.fill();

      ctx.fillStyle = '#FDF0CD';
      ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Think you can solve it faster with fewer moves?', width / 2, footerY + 38);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`🔗 Play now at ${websiteUrl}`, width / 2, footerY + 72);

      // Save data URL for preview and download
      try {
        const url = canvas.toDataURL('image/png');
        setDataUrl(url);
      } catch (err) {
        console.error('Canvas export error:', err);
      }
    };

    const drawStatBox = (
      x: number,
      y: number,
      w: number,
      h: number,
      label: string,
      val: string,
      sub: string,
      bg: string,
      accent: string
    ) => {
      // Shadow
      ctx.fillStyle = '#1C332E';
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 5, w, h, 16);
      ctx.fill();

      // Card body
      ctx.fillStyle = bg;
      ctx.strokeStyle = '#1C332E';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 16);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#1C332E';
      ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(label, x + w / 2, y + 36);

      // Value
      ctx.fillStyle = accent;
      ctx.font = '900 44px "Baloo 2", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(val, x + w / 2, y + 92);

      // Subtitle
      ctx.fillStyle = '#4B5563';
      ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(sub, x + w / 2, y + 130);
    };
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawCard, 60);
    }
  }, [isOpen, completedLevels, totalTimeSeconds, totalMoves, pointsEarned, rank, fullName, resolvedArtImage]);

  if (!isOpen) return null;

  // 📥 1. Download 4:5 image
  const downloadCardImage = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Navratri_Puzzle_${(fullName || 'ScoreCard').replace(/\s+/g, '_')}_4x5.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 📋 2. Copy image to clipboard
  const copyImageToClipboard = async (): Promise<boolean> => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    try {
      if (typeof window !== 'undefined' && 'ClipboardItem' in window) {
        return new Promise<boolean>((resolve) => {
          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': blob }),
                ]);
                setCopiedImage(true);
                setTimeout(() => setCopiedImage(false), 3000);
                resolve(true);
              } catch {
                resolve(false);
              }
            } else {
              resolve(false);
            }
          }, 'image/png');
        });
      }
    } catch {}
    return false;
  };

  // 📝 3. Copy text caption
  const copyTextCaption = async () => {
    try {
      await navigator.clipboard.writeText(shareCaption);
      setCopiedText(true);
      setStatusMessage('Caption copied to clipboard!');
      setTimeout(() => {
        setCopiedText(false);
        setStatusMessage(null);
      }, 3000);
    } catch {}
  };

  // 🚀 4. Share to BeSocial (1-Click)
  const handleShareToBeSocial = async () => {
    downloadCardImage();
    const imgCopied = await copyImageToClipboard();
    if (!imgCopied) {
      copyTextCaption();
    }
    setStatusMessage('4:5 Scorecard downloaded! Opening BeSocial...');

    setTimeout(() => {
      window.open(besocialUrl, '_blank', 'noopener,noreferrer');
      setStatusMessage('Card downloaded! Simply attach the 4:5 image and paste your caption on BeSocial.');
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2.5 sm:p-5 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border-4 border-[#1C332E] rounded-3xl shadow-[8px_8px_0px_#B82348] p-3.5 sm:p-6 flex flex-col max-h-[92dvh] sm:max-h-[92vh] overflow-y-auto overscroll-contain space-y-3 sm:space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full border-2 border-[#1C332E] bg-muted/30 hover:bg-muted text-foreground transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1 pr-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pink-100 border-2 border-[#1C332E] text-pink-700 font-bold text-xs shadow-[2px_2px_0px_#1C332E]">
            <Sparkles size={12} /> 4:5 BeSocial Scorecard
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C332E] font-['Baloo_2']">
            Share Your Puzzle Victory! 🏆
          </h2>
          <p className="text-xs text-muted-foreground">
            Earned <strong className="text-pink-600 font-mono font-bold">+{pointsEarned} Points</strong> in {totalTimeSeconds}s & {totalMoves} moves.
          </p>
        </div>

        {/* Hidden Canvas used for high-res generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 4:5 Scorecard Visual Preview */}
        <div className="relative mx-auto w-full max-w-[260px] sm:max-w-[320px] aspect-[4/5] rounded-2xl overflow-hidden border-3 border-[#1C332E] shadow-[5px_5px_0px_#1C332E] bg-muted/20 flex items-center justify-center">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="4:5 BeSocial Scorecard Preview"
              className="w-full h-full object-contain select-none"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="w-8 h-8 border-3 border-pink-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground font-medium">Generating 4:5 high-res card...</span>
            </div>
          )}
        </div>

        {/* Status Toast message */}
        {statusMessage && (
          <div className="bg-emerald-50 border-2 border-emerald-500/40 rounded-xl p-2.5 text-center text-xs text-emerald-800 font-bold animate-in fade-in-50">
            {statusMessage}
          </div>
        )}

        {/* Quick Instructions like leaderboard modal */}
        <div className="bg-amber-50/70 border border-[#1C332E]/30 rounded-xl p-2.5 text-[11px] text-muted-foreground space-y-1 shrink-0 text-left">
          <p className="font-bold text-foreground">
            How to post on BeSocial:
          </p>
          <p>
            1. Click <strong>"Share on BeSocial"</strong> below — 4:5 scorecard image downloads &amp; BeSocial opens.
          </p>
          <p>
            2. Simply attach the downloaded scorecard image in your BeSocial post!
          </p>
        </div>

        {/* Action 1: One-Click BeSocial Share */}
        <Button
          size="lg"
          onClick={handleShareToBeSocial}
          className="w-full bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-sm sm:text-base py-3 rounded-2xl border-3 border-[#1C332E] shadow-[4px_4px_0px_#1C332E] hover:shadow-[2px_2px_0px_#1C332E] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Share2 size={18} />
          <span>Share on BeSocial (1-Click)</span>
          <span className="hidden sm:inline text-xs opacity-90">(Auto-Download &amp; Open)</span>
          <ExternalLink size={15} />
        </Button>

        {/* Action 2 & 3: Copy Caption & Download Image */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCardImage}
            className="border-2 border-[#1C332E] font-bold text-xs h-10 hover:bg-amber-50 rounded-xl cursor-pointer"
          >
            <Download size={14} className="mr-1 text-amber-600" /> Download Card
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={copyTextCaption}
            className="border-2 border-[#1C332E] font-bold text-xs h-10 hover:bg-pink-50 rounded-xl cursor-pointer"
          >
            {copiedText ? (
              <>
                <Check size={14} className="mr-1 text-emerald-600" /> Caption Copied!
              </>
            ) : (
              <>
                <Copy size={14} className="mr-1 text-pink-600" /> Copy Caption
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
