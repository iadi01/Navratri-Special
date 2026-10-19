import React, { useEffect, useRef, useState } from 'react';
import {
  Share2,
  Download,
  Copy,
  ExternalLink,
  Check,
  X,
  Sparkles,
  Heart,
  Flower2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReflectionShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  quality: string;
  reflectionText: string;
  authorName?: string;
  course?: string;
  year?: string;
  rollNo?: string;
}

export function ReflectionShareModal({
  isOpen,
  onClose,
  quality,
  reflectionText,
  authorName,
  course = 'BCA',
  year = '1st Sem',
  rollNo,
}: ReflectionShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const websiteUrl = 'https://navratri-event.vercel.app';
  const besocialUrl = 'https://besocial.amityonline.com/?tab=Posts';

  const cleanName = authorName?.trim() || 'A Seeker of Shakti';
  const cleanQuality = quality?.trim() || 'Courage';
  const cleanReflection = reflectionText?.trim() || 'Every inspiring woman leaves us with a lesson to carry forward into our daily lives.';

  const shareCaption = `🌸 What Shakti Means to Me: "${cleanQuality}"\n\n"${cleanReflection}"\n\n— ${cleanName}\n\nLearn from the courage of India's unsung heroines & create your reflection card: ${websiteUrl}\n\n#Navshakti #UnsungHeroinesOfIndia #ShaktiReflection #AmityUniversity`;

  // Draw 4:5 High-Resolution Share Card Canvas (1080 x 1350)
  const drawCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    // 1. Warm Ivory Blush Background (#FFF7F8)
    ctx.fillStyle = '#FFF7F8';
    ctx.fillRect(0, 0, width, height);

    // Subtle paper texture gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#FFF7F8');
    bgGrad.addColorStop(0.5, '#FDF2F4');
    bgGrad.addColorStop(1, '#FCE7F0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Scrapbook Crisp Dark Border (#1C332E)
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, width - 72, height - 72);

    // Inner dashed decorative border (#B82348 with opacity)
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = '#D4A3AE';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(50, 50, width - 100, height - 100);
    ctx.setLineDash([]); // Reset line dash

    // 3. Top Washi-Tape Header (#FBF0C8 - Butter Yellow with spruce border)
    const tapeW = 460;
    const tapeH = 46;
    const tapeX = (width - tapeW) / 2;
    const tapeY = 22;

    ctx.save();
    ctx.translate(tapeX, tapeY);
    ctx.rotate(-0.012); // subtle playful scrapbook tilt
    ctx.fillStyle = '#FBF0C8';
    ctx.fillRect(0, 0, tapeW, tapeH);
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, tapeW, tapeH);

    ctx.fillStyle = '#1C332E';
    ctx.font = '700 16px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NAVSHAKTI · UNSUNG HEROINES OF INDIA', tapeW / 2, 28);
    ctx.restore();

    // 4. Series Title & Heading
    ctx.textAlign = 'center';

    // Sacred Lotus / Diya Motif at top
    drawLotusMotif(ctx, width / 2, 130, 32);

    // Series Eyebrow
    ctx.font = '700 19px "DM Sans", sans-serif';
    ctx.fillStyle = '#B82348';
    ctx.letterSpacing = '2px';
    ctx.fillText('SHAKTI REFLECTION · NAVRATRI SPECIAL', width / 2, 195);
    ctx.letterSpacing = '0px';

    // Main Heading
    ctx.font = '800 56px "Baloo 2", sans-serif';
    ctx.fillStyle = '#1C332E';
    ctx.fillText('What Shakti Means to Me', width / 2, 260);

    // 5. Selected Quality Ribbon Badge (Mint Green #D4F4E2 / Petal Pink with hard shadow)
    const badgeW = 480;
    const badgeH = 74;
    const badgeX = (width - badgeW) / 2;
    const badgeY = 300;

    // Hard offset shadow
    ctx.fillStyle = '#1C332E';
    ctx.beginPath();
    ctx.roundRect(badgeX + 6, badgeY + 6, badgeW, badgeH, 20);
    ctx.fill();

    // Badge face
    ctx.fillStyle = '#D4F4E2'; // Mint Green
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 20);
    ctx.fill();
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Quality text
    ctx.fillStyle = '#1C332E';
    ctx.font = '800 32px "Baloo 2", sans-serif';
    ctx.fillText(`✨ ${cleanQuality.toUpperCase()} ✨`, width / 2, badgeY + 48);

    // 6. Main Scrapbook Reflection Card Box
    const boxMargin = 90;
    const boxX = boxMargin;
    const boxY = 415;
    const boxW = width - boxMargin * 2;
    const boxH = 580;

    // Hard offset shadow
    ctx.fillStyle = '#1C332E';
    ctx.beginPath();
    ctx.roundRect(boxX + 8, boxY + 8, boxW, boxH, 28);
    ctx.fill();

    // Card Face: Soft Petal / Ivory Blush
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 28);
    ctx.fill();
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Subtle washi tape corner accent on the quote box
    ctx.save();
    ctx.fillStyle = '#BAE6FD'; // Sky cyan tape
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 2;
    ctx.translate(boxX - 10, boxY + 20);
    ctx.rotate(-0.4);
    ctx.fillRect(0, 0, 90, 24);
    ctx.strokeRect(0, 0, 90, 24);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#FCE7F0'; // Petal pink tape
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 2;
    ctx.translate(boxX + boxW - 70, boxY - 5);
    ctx.rotate(0.35);
    ctx.fillRect(0, 0, 85, 24);
    ctx.strokeRect(0, 0, 85, 24);
    ctx.restore();

    // Large Quotation Mark
    ctx.fillStyle = '#FCE7F0';
    ctx.font = '800 130px "Baloo 2", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('“', boxX + 40, boxY + 110);

    // Reflection Text (Wrapped cleanly with auto font scaling)
    ctx.fillStyle = '#1C332E';
    const textLen = cleanReflection.length;
    let fontSize = 34;
    let lineHeight = 50;

    if (textLen > 280) {
      fontSize = 24;
      lineHeight = 36;
    } else if (textLen > 180) {
      fontSize = 28;
      lineHeight = 42;
    } else if (textLen > 100) {
      fontSize = 32;
      lineHeight = 46;
    }

    ctx.font = `600 ${fontSize}px "DM Sans", sans-serif`;
    ctx.textAlign = 'center';

    const maxTextW = boxW - 100;
    const lines = wrapText(ctx, cleanReflection, maxTextW);
    const totalBlockH = lines.length * lineHeight;
    let startY = boxY + (boxH - totalBlockH) / 2 - 20;
    if (startY < boxY + 110) startY = boxY + 110;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], width / 2, startY + i * lineHeight);
    }

    // Closing Quote Mark (subtle watermark)
    ctx.fillStyle = '#FCE7F0';
    ctx.font = '800 120px "Baloo 2", Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText('”', boxX + boxW - 40, boxY + boxH - 60);

    // 7. Author Attribution & Details
    const authorY = boxY + boxH - 55;
    ctx.textAlign = 'center';

    // Divider line inside quote box
    ctx.strokeStyle = '#F0D5DC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boxX + 60, authorY - 35);
    ctx.lineTo(boxX + boxW - 60, authorY - 35);
    ctx.stroke();

    // Author Name
    ctx.fillStyle = '#B82348';
    ctx.font = '800 24px "Baloo 2", sans-serif';
    ctx.fillText(`— Written with Shakti by ${cleanName}`, width / 2, authorY);

    if (course || rollNo) {
      ctx.fillStyle = '#7A8C87';
      ctx.font = '600 15px "DM Sans", sans-serif';
      const meta = [course, year, rollNo].filter(Boolean).join(' • ');
      ctx.fillText(meta, width / 2, authorY + 26);
    }

    // 8. Bottom Decorative Diya / Floral Motifs
    drawDiyaMotif(ctx, width / 2, 1040, 24);

    // 9. Sacred Quote / Subtitle
    ctx.textAlign = 'center';
    ctx.fillStyle = '#B82348';
    ctx.font = '700 22px "Baloo 2", sans-serif';
    ctx.fillText('“Learn from her courage. Carry the Shakti forward.”', width / 2, 1100);

    // 10. Amity & Event Info Footer Box
    const footW = width - 160;
    const footH = 76;
    const footX = 80;
    const footY = 1145;

    ctx.fillStyle = '#FBF0C8'; // Butter yellow
    ctx.beginPath();
    ctx.roundRect(footX, footY, footW, footH, 18);
    ctx.fill();
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#1C332E';
    ctx.font = '700 17px "DM Sans", sans-serif';
    ctx.fillText('Amity University Online · Navratri Special 2026', width / 2, footY + 32);

    ctx.fillStyle = '#B82348';
    ctx.font = '800 16px "DM Sans", monospace';
    ctx.fillText(websiteUrl, width / 2, footY + 56);

    // Convert canvas to PNG data URL
    const pngUrl = canvas.toDataURL('image/png');
    setDataUrl(pngUrl);
  };

  // Helper: word-wrapping text on canvas
  function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = context.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }

  // Helper: Draw Sacred Lotus Motif
  function drawLotusMotif(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.save();
    ctx.strokeStyle = '#B82348';
    ctx.fillStyle = '#FCE7F0';
    ctx.lineWidth = 3;

    // Center petal
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.4, r * 0.45, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left petal
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.55, cy - r * 0.2, r * 0.4, r * 0.75, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right petal
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.55, cy - r * 0.2, r * 0.4, r * 0.75, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Golden center dot
    ctx.fillStyle = '#EAB308';
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Helper: Draw Festive Diya Motif
  function drawDiyaMotif(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    ctx.save();

    // Diya base (terracotta / crimson)
    ctx.fillStyle = '#B82348';
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Flame (golden yellow + bright orange)
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.35, cy - 2);
    ctx.quadraticCurveTo(cx - size * 0.4, cy - size * 1.1, cx, cy - size * 1.4);
    ctx.quadraticCurveTo(cx + size * 0.4, cy - size * 1.1, cx + size * 0.35, cy - 2);
    ctx.closePath();
    ctx.fill();

    // Inner flame
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.18, cy - 2);
    ctx.quadraticCurveTo(cx - size * 0.2, cy - size * 0.8, cx, cy - size * 1.1);
    ctx.quadraticCurveTo(cx + size * 0.2, cy - size * 0.8, cx + size * 0.18, cy - 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        drawCard();
      }, 60);
    }
  }, [isOpen, quality, reflectionText, authorName]);

  if (!isOpen) return null;

  // 1. Download PNG
  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `shakti-reflection-${cleanQuality.toLowerCase()}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    setStatusMessage('Reflection Card downloaded successfully!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // 2. Web Share API (Mobile / Native)
  const handleShare = async () => {
    if (!dataUrl) return;

    if (navigator.share) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'shakti-reflection.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'What Shakti Means to Me',
            text: shareCaption,
          });
          setStatusMessage('Shared successfully!');
          setTimeout(() => setStatusMessage(null), 3000);
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native file share failed, trying text share:', err);
        }
      }

      try {
        await navigator.share({
          title: 'What Shakti Means to Me',
          text: shareCaption,
          url: websiteUrl,
        });
        setStatusMessage('Shared successfully!');
        setTimeout(() => setStatusMessage(null), 3000);
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native share failed, falling back to download:', err);
        }
      }
    }

    // Fallback: download card & copy caption
    handleDownload();
    handleCopyText();
    setStatusMessage('Card downloaded & caption copied! Ready to post on BeSocial or WhatsApp 🌸');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // 3. Copy Caption Text
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareCaption);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
      setStatusMessage('Reflection text copied to clipboard!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Please select and copy the text manually.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FFF7F8] border-4 border-[#1C332E] rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-[8px_8px_0px_#B82348] space-y-4 my-auto max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-[#1C332E]/20 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 bg-[#FCE7F0] text-[#B82348] rounded-full border border-[#B82348]/30 mb-1">
              <Flower2 size={13} className="text-[#B82348]" /> Shakti Reflection Card
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C332E] font-['Baloo_2']">
              What Shakti Means to Me
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-[#FCE7F0] text-[#1C332E] cursor-pointer"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-[#D4F4E2] border-2 border-[#1C332E] text-xs font-bold text-[#1C332E] text-center animate-in fade-in duration-150">
            {statusMessage}
          </div>
        )}

        {/* 4:5 Card Preview */}
        <div className="relative mx-auto rounded-2xl overflow-hidden border-2 border-[#1C332E] shadow-[4px_4px_0px_#1C332E] bg-white max-w-sm sm:max-w-md aspect-[4/5] flex items-center justify-center">
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={handleDownload}
              className="bg-[#B82348] hover:bg-[#961c3b] text-white font-extrabold h-11 text-xs sm:text-sm rounded-xl shadow-[3px_3px_0px_#1C332E] border-2 border-[#1C332E] cursor-pointer"
            >
              <Download size={16} className="mr-1.5" /> Download Card (PNG)
            </Button>

            <Button
              onClick={handleShare}
              className="bg-[#D4F4E2] hover:bg-[#bbf0cf] text-[#1C332E] font-extrabold h-11 text-xs sm:text-sm rounded-xl shadow-[3px_3px_0px_#1C332E] border-2 border-[#1C332E] cursor-pointer"
            >
              <Share2 size={16} className="mr-1.5 text-[#1C332E]" /> Share Card
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleCopyText}
              className="font-bold text-xs h-9 rounded-xl border-2 border-[#1C332E] text-[#1C332E] hover:bg-[#FCE7F0] cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check size={13} className="mr-1.5 text-emerald-600" /> Copied Text!
                </>
              ) : (
                <>
                  <Copy size={13} className="mr-1.5" /> Copy Reflection Text
                </>
              )}
            </Button>

            <Button
              variant="outline"
              asChild
              className="font-bold text-xs h-9 rounded-xl border-2 border-[#1C332E] text-[#B82348] hover:bg-[#FCE7F0] cursor-pointer"
            >
              <a href={besocialUrl} target="_blank" rel="noopener noreferrer">
                Post on BeSocial <ExternalLink size={12} className="ml-1.5" />
              </a>
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-muted-foreground text-center font-medium">
          🌸 Share your reflection on BeSocial or WhatsApp to inspire fellow classmates with the courage of India's unsung heroines.
        </p>
      </div>
    </div>
  );
}
