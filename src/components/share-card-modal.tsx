import React, { useEffect, useRef, useState } from 'react';
import {
  Share2,
  Download,
  Copy,
  ExternalLink,
  Check,
  X,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LotusIcon } from '@/components/lotus-icon';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: number;
  dayTitle: string;
  points: number;
  maxPoints: number;
  timeTaken: number;
  firstTryCount: number;
  totalQuestions: number;
  rank?: number;
  fullName: string;
  course?: string;
  year?: string;
  tier: string;
}

export function ShareCardModal({
  isOpen,
  onClose,
  day,
  dayTitle,
  points,
  maxPoints,
  timeTaken,
  firstTryCount,
  totalQuestions,
  rank = 1,
  fullName,
  course = 'BCA',
  year = '1st Sem',
  tier,
}: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const websiteUrl = 'https://navratri-event.vercel.app';
  const besocialUrl = 'https://besocial.amityonline.com/?tab=Posts';

  const shareCaption = `🏆 I scored ${points}/${maxPoints} points in Day ${String(day).padStart(2, '0')} (${dayTitle}) of "पहचानो कौन?" in ${timeTaken}s (Rank #${rank})! 🌸\n\nCan you beat my score? Test your knowledge of India's unsung heroines: ${websiteUrl}\n\n@aahanasahay @singhsimrangopal22542`;

  const drawCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 675;
    canvas.width = width;
    canvas.height = height;

    // 1. Background (Warm Scrapbook Cream / Petal #fcf8f8)
    ctx.fillStyle = '#fcf8f8';
    ctx.fillRect(0, 0, width, height);

    // Subtle paper pattern/texture background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#fcf8f8');
    bgGrad.addColorStop(0.5, '#fbf4f4');
    bgGrad.addColorStop(1, '#faeff0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Scrapbook Outer Dark Border (#1e3a34)
    ctx.strokeStyle = '#1e3a34';
    ctx.lineWidth = 3;
    ctx.strokeRect(26, 26, width - 52, height - 52);

    // Inner dashed border (#e5d3d6)
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = '#d9b8be';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(34, 34, width - 68, height - 68);
    ctx.setLineDash([]); // reset

    // 3. Top Washi-Tape style header
    const tapeW = 280;
    const tapeH = 34;
    const tapeX = (width - tapeW) / 2;
    const tapeY = 48;

    ctx.fillStyle = '#fef08a'; // Butter yellow
    ctx.strokeStyle = '#1e3a34';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(tapeX, tapeY, tapeW, tapeH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e3a34';
    ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '1.5px';
    ctx.fillText('🪔 NAVRATRI SPECIAL 🪔', width / 2, tapeY + 22);

    // 4. Branding Titles
    ctx.fillStyle = '#1e3a34';
    ctx.font = '900 42px "Baloo 2", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '0.5px';
    ctx.fillText('पहचानो कौन? · PEHCHAAN KAUN', width / 2, 134);

    ctx.fillStyle = '#c93b54'; // Site primary terracotta rose
    ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '1.2px';
    ctx.fillText(`UNSUNG HEROINES OF INDIA — DAY ${String(day).padStart(2, '0')}: ${dayTitle.toUpperCase()}`, width / 2, 166);

    // 5. Main Card Container (Scrapbook Card)
    const cardX = 90;
    const cardY = 192;
    const cardW = width - 180;
    const cardH = 386;

    // Card shadow
    ctx.fillStyle = '#e8d4d8';
    ctx.beginPath();
    ctx.roundRect(cardX + 6, cardY + 7, cardW, cardH, 18);
    ctx.fill();

    // Card face
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1e3a34';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 18);
    ctx.fill();
    ctx.stroke();

    // Participant Name
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e3a34';
    ctx.font = '900 36px "Baloo 2", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const cleanName = fullName || 'Anonymous Explorer';
    ctx.fillText(cleanName.toUpperCase(), width / 2, cardY + 52);

    ctx.fillStyle = '#5a7a73';
    ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${course} · ${year}`, width / 2, cardY + 80);

    // Score Circle Badge (Exact replica of site's .score-badge)
    const badgeY = cardY + 168;
    const badgeR = 64;

    // Badge shadow
    ctx.fillStyle = '#d9b8be';
    ctx.beginPath();
    ctx.arc(width / 2 + 5, badgeY + 6, badgeR, 0, Math.PI * 2);
    ctx.fill();

    // Badge circle (Butter yellow #fef08a)
    ctx.beginPath();
    ctx.arc(width / 2, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = '#fef08a';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1e3a34';
    ctx.stroke();

    // Score numbers inside badge
    ctx.fillStyle = '#1e3a34';
    ctx.font = '900 48px "Baloo 2", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(String(points), width / 2, badgeY + 12);

    ctx.fillStyle = '#8c5010';
    ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText(`OF ${maxPoints} PTS`, width / 2, badgeY + 32);

    // Tier badge below score
    ctx.fillStyle = '#c93b54';
    ctx.font = '800 20px "Baloo 2", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`🏆 ${tier.toUpperCase()}`, width / 2, badgeY + 98);

    // 6. Stat Pills (Time, Accuracy, Rank)
    const pillY = cardY + 298;
    const statBoxWidth = 260;
    const statBoxHeight = 56;
    const gap = 30;
    const totalStatsWidth = statBoxWidth * 3 + gap * 2;
    const startX = (width - totalStatsWidth) / 2;

    const stats = [
      { label: 'TIME TAKEN', val: `${timeTaken}s`, icon: '⏱️', bg: '#fbf4f4' },
      { label: 'ACCURACY', val: `${firstTryCount}/${totalQuestions}`, icon: '🎯', bg: '#fef08a' },
      { label: 'CAMPUS RANK', val: `#${rank}`, icon: '🏅', bg: '#fbf4f4' },
    ];

    stats.forEach((st, idx) => {
      const bx = startX + idx * (statBoxWidth + gap);

      // Shadow
      ctx.fillStyle = '#1e3a34';
      ctx.beginPath();
      ctx.roundRect(bx + 3, pillY + 3, statBoxWidth, statBoxHeight, 12);
      ctx.fill();

      // Box
      ctx.fillStyle = st.bg;
      ctx.strokeStyle = '#1e3a34';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, pillY, statBoxWidth, statBoxHeight, 12);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = '22px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(st.icon, bx + 16, pillY + 36);

      ctx.fillStyle = '#5a7a73';
      ctx.font = '800 11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(st.label, bx + 52, pillY + 24);

      ctx.fillStyle = '#1e3a34';
      ctx.font = '900 20px "Baloo 2", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(st.val, bx + 52, pillY + 46);
    });

    // 7. Bottom Call to Action Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e3a34';
    ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('⚡ CAN YOU BEAT MY SCORE? PLAY TODAY’S HUNT AT:', width / 2, 614);

    ctx.fillStyle = '#c93b54';
    ctx.font = '800 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '0.5px';
    ctx.fillText(websiteUrl, width / 2, 640);

    // Create preview data URL
    try {
      const url = canvas.toDataURL('image/png');
      setDataUrl(url);
    } catch (e) {
      console.error('Failed to create data URL from canvas', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawCard, 50);
    }
  }, [isOpen, points, timeTaken, firstTryCount, fullName, rank]);

  if (!isOpen) return null;

  // 📥 1. Download image
  const downloadCardImage = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `PehchaanKaun_Day${day}_${(fullName || 'ScoreCard').replace(/\s+/g, '_')}.png`;
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
      setTimeout(() => setCopiedText(false), 3000);
    } catch {}
  };

  // 🚀 4. One-Click: Share to BeSocial (Download + Copy + Open BeSocial)
  const handleShareToBeSocial = async () => {
    downloadCardImage();
    const imageCopied = await copyImageToClipboard();
    if (!imageCopied) {
      copyTextCaption();
    }
    setStatusMessage('Card downloaded! Redirecting to BeSocial...');

    setTimeout(() => {
      window.open(besocialUrl, '_blank', 'noopener,noreferrer');
      setStatusMessage('Card downloaded & ready! Paste or upload the image on your BeSocial post.');
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[var(--background)] border-[1.5px] border-[var(--foreground)] rounded-2xl shadow-[6px_7px_0_var(--border)] p-4 sm:p-6 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--butter)] border border-[var(--foreground)] text-[var(--foreground)] flex items-center justify-center font-bold shadow-[1.5px_1.5px_0_var(--foreground)]">
              <LotusIcon size={16} className="text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--foreground)] font-display">
                Your BeSocial Scorecard
              </h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Official scrapbook scorecard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-[var(--foreground)] bg-[var(--background)] hover:bg-[var(--butter)] text-[var(--foreground)] flex items-center justify-center cursor-pointer transition-colors shadow-[1px_1px_0_var(--foreground)]"
          >
            <X size={14} />
          </button>
        </div>

        {/* Hidden Canvas for High-Res Generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Card Image Preview */}
        <div className="my-3 rounded-xl overflow-hidden border-[1.5px] border-[var(--foreground)] shadow-[3px_4px_0_var(--border)] bg-[var(--background)] relative shrink-0">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="Pehchaan Kaun Scorecard"
              className="w-full h-auto object-contain max-h-[26vh] sm:max-h-[36vh] mx-auto block"
            />
          ) : (
            <div className="h-36 sm:h-48 flex items-center justify-center text-xs text-muted-foreground">
              Generating your scorecard...
            </div>
          )}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-[var(--mint)] border border-[var(--foreground)] text-[var(--foreground)] text-xs flex items-center gap-2 mb-3 shadow-[2px_2px_0_var(--foreground)] shrink-0">
            <Check size={14} className="shrink-0 text-emerald-700" /> {statusMessage}
          </div>
        )}

        {/* Quick Instructions */}
        <div className="bg-[var(--petal)] border border-[var(--border)] rounded-xl p-2.5 text-[11px] text-[var(--muted-foreground)] space-y-1 mb-3 shrink-0">
          <p className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
            <Trophy size={13} className="text-[var(--primary)]" /> How to post on BeSocial:
          </p>
          <p>
            1. Click <strong>"Share to BeSocial"</strong> below — scorecard image downloads &amp; BeSocial opens.
          </p>
          <p>
            2. Simply attach the downloaded image in your BeSocial post!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto space-y-2 pt-2 border-t border-[var(--border)] shrink-0">
          <Button
            size="lg"
            className="w-full gap-2 font-bold text-xs sm:text-sm h-11 bg-primary text-primary-foreground border-[1.5px] border-[var(--foreground)] shadow-[3px_3px_0_var(--foreground)] rounded-xl hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--foreground)] hover:bg-primary/95 transition-all cursor-pointer"
            onClick={handleShareToBeSocial}
          >
            <Share2 size={16} /> <span>Share to BeSocial (1-Click)</span> <span className="hidden sm:inline">(Auto-Download &amp; Open)</span> <ExternalLink size={14} className="opacity-80" />
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-9 font-bold border-[1.5px] border-[var(--foreground)] bg-[var(--background)] shadow-[2px_2px_0_var(--foreground)] rounded-lg hover:bg-[var(--butter)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
              onClick={downloadCardImage}
            >
              <Download size={14} /> Download Image
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-9 font-bold border-[1.5px] border-[var(--foreground)] bg-[var(--background)] shadow-[2px_2px_0_var(--foreground)] rounded-lg hover:bg-[var(--butter)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
              onClick={copyTextCaption}
            >
              {copiedText ? (
                <>
                  <Check size={14} className="text-emerald-600" /> Caption Copied!
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy Caption
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
