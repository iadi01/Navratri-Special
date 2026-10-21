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
  batch?: string;
  tier: string;
  puzzleBonus?: number;
}

// Helper to get ordinal suffix for numbers
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// Draw a 5-pointed star
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
  fillColor: string,
  strokeColor: string,
  lineWidth: number = 2
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

// Draw a 3-pointed royal crown for Rank 1
function drawCrown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  goldColor: string,
  darkColor: string
) {
  ctx.save();
  ctx.translate(cx, cy);

  // Crown base arc
  ctx.beginPath();
  ctx.moveTo(-w / 2, h / 2);
  ctx.lineTo(-w / 2 - 4, -h / 2 + 10); // left tip
  ctx.lineTo(-w / 5, -h / 6); // left dip
  ctx.lineTo(0, -h / 2 - 8); // center tall tip
  ctx.lineTo(w / 5, -h / 6); // right dip
  ctx.lineTo(w / 2 + 4, -h / 2 + 10); // right tip
  ctx.lineTo(w / 2, h / 2); // right bottom
  ctx.closePath();

  // Gradient fill
  const grad = ctx.createLinearGradient(0, -h, 0, h);
  grad.addColorStop(0, '#FEF08A');
  grad.addColorStop(0.5, '#F59E0B');
  grad.addColorStop(1, '#D97706');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Pearls / jewels on the tips
  const tips = [
    { x: -w / 2 - 4, y: -h / 2 + 10, r: 6 },
    { x: 0, y: -h / 2 - 8, r: 8 },
    { x: w / 2 + 4, y: -h / 2 + 10, r: 6 },
  ];
  tips.forEach((tip) => {
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, tip.r, 0, Math.PI * 2);
    ctx.fillStyle = '#FEF08A';
    ctx.fill();
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });

  // Crown base band
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 4, h / 2 - 8, w - 8, 9, 3);
  ctx.fillStyle = '#B45309';
  ctx.fill();
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

// Draw a scalloped rosette with petal lobes
function drawScallopedRosette(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseR: number,
  amplitude: number,
  petals: number,
  fillColor: string,
  strokeColor: string,
  lineWidth: number = 3
) {
  ctx.beginPath();
  const totalSteps = petals * 16;
  for (let i = 0; i <= totalSteps; i++) {
    const angle = (i * 2 * Math.PI) / totalSteps;
    const r = baseR + amplitude * Math.cos(petals * angle);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

// Draw laurel wreath leaves curving inside the disc
function drawLaurelWreath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  leafColor: string
) {
  ctx.save();
  ctx.fillStyle = leafColor;

  const numLeaves = 8;
  // Left branch
  for (let i = 0; i < numLeaves; i++) {
    const t = i / (numLeaves - 1);
    const angle = Math.PI * 0.75 + t * (Math.PI * 0.55); // from bottom-left to top-left
    const lx = cx + r * Math.cos(angle);
    const ly = cy + r * Math.sin(angle);

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 4.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -4, 7, 3.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Right branch
  for (let i = 0; i < numLeaves; i++) {
    const t = i / (numLeaves - 1);
    const angle = Math.PI * 0.25 - t * (Math.PI * 0.55); // from bottom-right to top-right
    const rx = cx + r * Math.cos(angle);
    const ry = cy + r * Math.sin(angle);

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle - Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 4.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-4, -4, 7, 3.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// Draw 3D folded horizontal ribbon banner
function drawFoldedBanner(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  text: string,
  bgColor: string,
  shadowColor: string,
  textColor: string,
  borderColor: string = '#1C332E'
) {
  ctx.save();

  const wingW = 54;
  const wingH = h - 6;
  const foldW = 20;

  // 1. Left wing (behind)
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy - wingH / 2 + 10);
  ctx.lineTo(cx - w / 2 - wingW, cy - wingH / 2 + 10);
  ctx.lineTo(cx - w / 2 - wingW + 16, cy + 10); // notch
  ctx.lineTo(cx - w / 2 - wingW, cy + wingH / 2 + 10);
  ctx.lineTo(cx - w / 2, cy + wingH / 2 + 10);
  ctx.closePath();
  ctx.fillStyle = shadowColor;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // 2. Right wing (behind)
  ctx.beginPath();
  ctx.moveTo(cx + w / 2, cy - wingH / 2 + 10);
  ctx.lineTo(cx + w / 2 + wingW, cy - wingH / 2 + 10);
  ctx.lineTo(cx + w / 2 + wingW - 16, cy + 10); // notch
  ctx.lineTo(cx + w / 2 + wingW, cy + wingH / 2 + 10);
  ctx.lineTo(cx + w / 2, cy + wingH / 2 + 10);
  ctx.closePath();
  ctx.fillStyle = shadowColor;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // 3. Fold shadow triangles
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy + wingH / 2 + 10);
  ctx.lineTo(cx - w / 2 - foldW, cy + wingH / 2 + 10);
  ctx.closePath();
  ctx.fillStyle = '#1C332E';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + w / 2, cy + h / 2);
  ctx.lineTo(cx + w / 2, cy + wingH / 2 + 10);
  ctx.lineTo(cx + w / 2 + foldW, cy + wingH / 2 + 10);
  ctx.closePath();
  ctx.fillStyle = '#1C332E';
  ctx.fill();

  // 4. Center main banner rectangle
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 6);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Text inside banner
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.font = '900 24px "DM Sans", -apple-system, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText(text, cx, cy);

  ctx.restore();
}

// Draw two striped hanging ribbon tails behind the banner
function drawRibbonTails(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color1: string,
  color2: string,
  borderColor: string = '#1C332E'
) {
  ctx.save();
  const tailWidth = 44;
  const tailLength = 110;

  // Left tail
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy);
  ctx.lineTo(cx - 75, cy + tailLength);
  ctx.lineTo(cx - 75 + tailWidth / 2, cy + tailLength - 18); // V notch
  ctx.lineTo(cx - 75 + tailWidth, cy + tailLength);
  ctx.lineTo(cx - 30 + tailWidth, cy);
  ctx.closePath();
  ctx.fillStyle = color1;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Left inner stripe
  ctx.beginPath();
  ctx.moveTo(cx - 30 + 12, cy);
  ctx.lineTo(cx - 75 + 12, cy + tailLength - 4);
  ctx.lineTo(cx - 75 + 24, cy + tailLength - 16);
  ctx.lineTo(cx - 30 + 24, cy);
  ctx.closePath();
  ctx.fillStyle = color2;
  ctx.fill();

  // Right tail
  ctx.beginPath();
  ctx.moveTo(cx + 30 - tailWidth, cy);
  ctx.lineTo(cx + 75 - tailWidth, cy + tailLength);
  ctx.lineTo(cx + 75 - tailWidth / 2, cy + tailLength - 18); // V notch
  ctx.lineTo(cx + 75, cy + tailLength);
  ctx.lineTo(cx + 30, cy);
  ctx.closePath();
  ctx.fillStyle = color1;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Right inner stripe
  ctx.beginPath();
  ctx.moveTo(cx + 30 - 24, cy);
  ctx.lineTo(cx + 75 - 24, cy + tailLength - 16);
  ctx.lineTo(cx + 75 - 12, cy + tailLength - 4);
  ctx.lineTo(cx + 30 - 12, cy);
  ctx.closePath();
  ctx.fillStyle = color2;
  ctx.fill();

  ctx.restore();
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
  batch,
  tier,
  puzzleBonus,
}: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const websiteUrl = 'https://navratri-event.vercel.app';
  const besocialUrl = 'https://besocial.amityonline.com/?tab=Posts';

  const safePoints = Math.min(points, maxPoints);
  const safeAccuracy = Math.min(firstTryCount, totalQuestions);

  const isOverall = dayTitle.toLowerCase().includes('overall');
  const puzzleExtraText = puzzleBonus && puzzleBonus > 0 ? ` (+${puzzleBonus} Extra Points for Puzzle Challenge)` : '';
  const shareCaption = isOverall
    ? `🏆 I scored ${safePoints}/${maxPoints} points${puzzleExtraText} in the Overall Championship of "पहचानो कौन?" in ${timeTaken}s (Rank #${rank})! 🌸\n\nCan you beat my score? Test your knowledge of India's unsung heroines: ${websiteUrl}\n\n@aahanasahay @singhsimrangopal22542`
    : `🏆 I scored ${safePoints}/${maxPoints} points in Day ${String(day).padStart(2, '0')} (${dayTitle}) of "पहचानो कौन?" in ${timeTaken}s (Rank #${rank})! 🌸\n\nCan you beat my score? Test your knowledge of India's unsung heroines: ${websiteUrl}\n\n@aahanasahay @singhsimrangopal22542`;

  const drawCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-res portrait dimensions (4:5 Aspect Ratio)
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    const currentRank = Math.max(1, rank);
    const suffix = getOrdinalSuffix(currentRank);

    // ==========================================
    // 🎨 TIER COLOR & THEME CONFIGURATION
    // ==========================================
    let bgGradientStart = '#FFFDF7';
    let bgGradientEnd = '#FFF5EB';
    let rosetteColor = '#F59E0B';
    let rosetteDark = '#78350F';
    let innerDiscColor = '#FFFDF2';
    let wreathColor = '#B45309';
    let numberColor = '#78350F';
    let rayColor = '#FDE68A';
    let bannerBg = '#FDE047';
    let bannerShadow = '#CA8A04';
    let bannerText = '#1C332E';
    let bannerTitle = '#1 WINNER';
    let ribbonColor1 = '#991B1B';
    let ribbonColor2 = '#F59E0B';
    let dashedBorderColor = '#D97706';

    if (currentRank === 1) {
      // 👑 Rank 1: Gold Crown Champion
      bgGradientStart = '#FFFDF7';
      bgGradientEnd = '#FFF5EB';
      rosetteColor = '#F59E0B';
      rosetteDark = '#78350F';
      innerDiscColor = '#FFFDF2';
      wreathColor = '#B45309';
      numberColor = '#78350F';
      rayColor = '#FDE68A';
      bannerBg = '#FDE047';
      bannerShadow = '#CA8A04';
      bannerText = '#1C332E';
      bannerTitle = '#1 WINNER';
      ribbonColor1 = '#991B1B';
      ribbonColor2 = '#F59E0B';
      dashedBorderColor = '#D97706';
    } else if (currentRank === 2) {
      // 🥈 Rank 2: Silver 3-Star Runner Up
      bgGradientStart = '#F8FAFC';
      bgGradientEnd = '#F1F5F9';
      rosetteColor = '#64748B';
      rosetteDark = '#1E293B';
      innerDiscColor = '#F8FAFC';
      wreathColor = '#64748B';
      numberColor = '#1E293B';
      rayColor = '#CBD5E1';
      bannerBg = '#E2E8F0';
      bannerShadow = '#94A3B8';
      bannerText = '#1E293B';
      bannerTitle = '#2 RUNNER UP';
      ribbonColor1 = '#991B1B';
      ribbonColor2 = '#64748B';
      dashedBorderColor = '#64748B';
    } else if (currentRank === 3) {
      // 🥉 Rank 3: Bronze 3-Star 3rd Place
      bgGradientStart = '#FFF7ED';
      bgGradientEnd = '#FFEDD5';
      rosetteColor = '#C2410C';
      rosetteDark = '#7C2D12';
      innerDiscColor = '#FFF7ED';
      wreathColor = '#C2410C';
      numberColor = '#7C2D12';
      rayColor = '#FED7AA';
      bannerBg = '#FED7AA';
      bannerShadow = '#FB923C';
      bannerText = '#7C2D12';
      bannerTitle = '#3 3RD PLACE';
      ribbonColor1 = '#991B1B';
      ribbonColor2 = '#EA580C';
      dashedBorderColor = '#C2410C';
    } else if (currentRank >= 4 && currentRank <= 10) {
      // 🌟 Rank 4 to 10: Consistent "Top 10 Finalist" Badge
      bgGradientStart = '#F0FDF4';
      bgGradientEnd = '#DCFCE7';
      rosetteColor = '#059669';
      rosetteDark = '#064E3B';
      innerDiscColor = '#ECFDF5';
      wreathColor = '#047857';
      numberColor = '#064E3B';
      rayColor = '#A7F3D0';
      bannerBg = '#A7F3D0';
      bannerShadow = '#34D399';
      bannerText = '#064E3B';
      bannerTitle = `#${currentRank} TOP 10`;
      ribbonColor1 = '#991B1B';
      ribbonColor2 = '#059669';
      dashedBorderColor = '#059669';
    } else {
      // 🎖️ Rank 11+: Distinct Participant / Campus Explorer Badge
      bgGradientStart = '#FFF7F8';
      bgGradientEnd = '#FCE7F0';
      rosetteColor = '#BE123C';
      rosetteDark = '#881337';
      innerDiscColor = '#FFF1F2';
      wreathColor = '#BE123C';
      numberColor = '#881337';
      rayColor = '#FECDD3';
      bannerBg = '#FCE7F0';
      bannerShadow = '#FDA4AF';
      bannerText = '#881337';
      bannerTitle = `RANK #${currentRank}`;
      ribbonColor1 = '#BE123C';
      ribbonColor2 = '#FDE047';
      dashedBorderColor = '#BE123C';
    }

    // ==========================================
    // 1. Background Fill & Festive Border
    // ==========================================
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, bgGradientStart);
    bgGrad.addColorStop(1, bgGradientEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Outer dark spruce border
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, width - 72, height - 72);

    // Inner dashed festive line
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = dashedBorderColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(50, 50, width - 100, height - 100);
    ctx.setLineDash([]); // Reset dash

    // Corner decorative flower dots
    const cornerRadius = 7;
    [
      { x: 50, y: 50 },
      { x: width - 50, y: 50 },
      { x: 50, y: height - 50 },
      { x: width - 50, y: height - 50 },
    ].forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, cornerRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#1C332E';
      ctx.fill();
    });

    // ==========================================
    // 2. Top Header & Series Titles
    // ==========================================
    // Washi Tape
    const tapeW = 400;
    const tapeH = 38;
    const tapeX = (width - tapeW) / 2;
    const tapeY = 66;

    ctx.fillStyle = '#FBF0C8';
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(tapeX, tapeY, tapeW, tapeH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1C332E';
    ctx.font = '800 15px "DM Sans", -apple-system, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('🪔 NAVSHAKTI · UNSUNG HEROINES 🪔', width / 2, tapeY + 24);

    // Series Title
    ctx.fillStyle = '#B82348';
    ctx.font = '900 42px "Baloo 2", -apple-system, sans-serif';
    ctx.letterSpacing = '0.5px';
    ctx.fillText('पहचानो कौन? · NAVSHAKTI', width / 2, 146);

    // Subtitle
    ctx.fillStyle = '#5A7A73';
    ctx.font = '800 18px "DM Sans", -apple-system, sans-serif';
    ctx.letterSpacing = '2.5px';
    const subTitleStr = isOverall
      ? 'OVERALL TOURNAMENT CHAMPIONSHIP'
      : `DAY ${String(day).padStart(2, '0')}: ${dayTitle.toUpperCase()}`;
    ctx.fillText(subTitleStr, width / 2, 180);

    // ==========================================
    // 3. Central Rosette Medal Centerpiece
    // ==========================================
    const medalCenterX = width / 2;
    const medalCenterY = 380;
    const rosetteRadius = 110;

    // A. Radiating Sunburst Rays behind medal
    ctx.save();
    ctx.strokeStyle = rayColor;
    ctx.lineWidth = 2.5;
    const numRays = 24;
    for (let i = 0; i < numRays; i++) {
      const angle = (i * 2 * Math.PI) / numRays;
      const x1 = medalCenterX + (rosetteRadius + 10) * Math.cos(angle);
      const y1 = medalCenterY + (rosetteRadius + 10) * Math.sin(angle);
      const x2 = medalCenterX + (rosetteRadius + 50) * Math.cos(angle);
      const y2 = medalCenterY + (rosetteRadius + 50) * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // B. Hanging Striped Ribbon Tails
    drawRibbonTails(
      ctx,
      medalCenterX,
      medalCenterY + 40,
      ribbonColor1,
      ribbonColor2,
      '#1C332E'
    );

    // C. Scalloped Rosette Outer Disc
    drawScallopedRosette(
      ctx,
      medalCenterX,
      medalCenterY,
      rosetteRadius,
      12,
      24,
      rosetteColor,
      rosetteDark,
      4
    );

    // Concentric inner line
    ctx.beginPath();
    ctx.arc(medalCenterX, medalCenterY, rosetteRadius - 16, 0, Math.PI * 2);
    ctx.strokeStyle = rosetteDark;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // D. Inner White / Cream Disc
    ctx.beginPath();
    ctx.arc(medalCenterX, medalCenterY, 82, 0, Math.PI * 2);
    ctx.fillStyle = innerDiscColor;
    ctx.fill();
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Stitched inner dashed circle
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(medalCenterX, medalCenterY, 74, 0, Math.PI * 2);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // E. Laurel Wreath Leaves inside disc
    drawLaurelWreath(ctx, medalCenterX, medalCenterY, 60, wreathColor);

    // F. Rank Number & Ordinal Suffix inside disc
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = numberColor;

    // Font size adapts for 1-digit vs 2-digit ranks
    const numberFontSize = currentRank < 10 ? 66 : currentRank < 100 ? 52 : 44;
    ctx.font = `900 ${numberFontSize}px "Baloo 2", -apple-system, sans-serif`;

    // Measure to place suffix neatly
    const numText = String(currentRank);
    const numMetrics = ctx.measureText(numText);
    const numOffset = suffix ? -numMetrics.width * 0.15 : 0;

    ctx.fillText(numText, medalCenterX + numOffset, medalCenterY + 4);

    // Suffix superscript
    if (suffix) {
      ctx.font = '800 24px "Baloo 2", -apple-system, sans-serif';
      ctx.fillText(
        suffix,
        medalCenterX + numOffset + numMetrics.width * 0.55 + 8,
        medalCenterY - numberFontSize * 0.28
      );
    }
    ctx.restore();

    // G. Top Crown or Stars Decoration
    if (currentRank === 1) {
      // 👑 Rank 1: Crown on top
      drawCrown(
        ctx,
        medalCenterX,
        medalCenterY - rosetteRadius - 18,
        86,
        48,
        '#F59E0B',
        '#1C332E'
      );
    } else if (currentRank === 2 || currentRank === 3 || (currentRank >= 4 && currentRank <= 10)) {
      // ⭐ Rank 2, 3, and 4-10: 3 Stars on top
      const starColor = currentRank === 2 ? '#E2E8F0' : currentRank === 3 ? '#FED7AA' : '#FDE047';
      const starBorder = currentRank === 2 ? '#475569' : currentRank === 3 ? '#9A3412' : '#047857';

      // Center taller star
      drawStar(ctx, medalCenterX, medalCenterY - rosetteRadius - 28, 5, 20, 9, starColor, starBorder, 2.5);
      // Left side star
      drawStar(ctx, medalCenterX - 36, medalCenterY - rosetteRadius - 18, 5, 14, 6.5, starColor, starBorder, 2);
      // Right side star
      drawStar(ctx, medalCenterX + 36, medalCenterY - rosetteRadius - 18, 5, 14, 6.5, starColor, starBorder, 2);
    } else {
      // 🎖️ Rank 11+: Single Star on top
      drawStar(ctx, medalCenterX, medalCenterY - rosetteRadius - 20, 5, 22, 10, '#FDA4AF', '#881337', 2.5);
    }

    // H. Folded Ribbon Banner
    const bannerW = currentRank > 99 ? 440 : 380;
    drawFoldedBanner(
      ctx,
      medalCenterX,
      medalCenterY + 98,
      bannerW,
      50,
      bannerTitle,
      bannerBg,
      bannerShadow,
      bannerText,
      '#1C332E'
    );

    // ==========================================
    // 4. Participant Name & Academic Subtitle
    // ==========================================
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1C332E';
    ctx.font = '900 46px "Baloo 2", -apple-system, sans-serif';
    const cleanName = (fullName || 'Anonymous Explorer').trim();
    ctx.fillText(cleanName.toUpperCase(), width / 2, 655);

    // Course & Batch
    ctx.fillStyle = '#5A7A73';
    ctx.font = '700 22px "DM Sans", -apple-system, sans-serif';
    ctx.letterSpacing = '1px';
    const batchText = batch ? `Batch ${batch}` : year;
    ctx.fillText(`${course} · ${batchText} · AMITY ONLINE`, width / 2, 695);

    // ==========================================
    // 5. Rounded Score Box (Exact replica of image)
    // ==========================================
    const boxW = 460;
    const boxH = 120;
    const boxX = (width - boxW) / 2;
    const boxY = 740;

    // Box shadow
    ctx.fillStyle = '#E8D4D8';
    ctx.beginPath();
    ctx.roundRect(boxX + 6, boxY + 6, boxW, boxH, 24);
    ctx.fill();

    // Box face
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 24);
    ctx.fill();
    ctx.stroke();

    // Label: SCORE
    ctx.textAlign = 'center';
    ctx.fillStyle = '#718096';
    ctx.font = '800 16px "DM Sans", -apple-system, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('SCORE', width / 2, boxY + 36);

    // Value: 300 / 320
    ctx.fillStyle = '#B82348';
    ctx.font = '900 54px "Baloo 2", -apple-system, sans-serif';
    ctx.fillText(`${safePoints} / ${maxPoints}`, width / 2, boxY + 92);

    // Extra Puzzle Points Tag (if applicable)
    let currentY = boxY + boxH + 20;
    if (puzzleBonus && puzzleBonus > 0) {
      const pzW = 540;
      const pzH = 40;
      const pzX = (width - pzW) / 2;

      ctx.fillStyle = '#D4F4E2';
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(pzX, currentY, pzW, pzH, 20);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#065F46';
      ctx.font = '800 17px "DM Sans", -apple-system, sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(`🧩 INCLUDES +${puzzleBonus} EXTRA PUZZLE CHALLENGE BONUS`, width / 2, currentY + 26);

      currentY += 56;
    }

    // ==========================================
    // 6. Stat Pills (Time, Accuracy, Rank)
    // ==========================================
    const pillY = currentY + 10;
    const pillW = 270;
    const pillH = 80;
    const pillGap = 24;
    const totalPillW = pillW * 3 + pillGap * 2;
    const startPillX = (width - totalPillW) / 2;

    const stats = [
      { label: 'TIME TAKEN', val: `${timeTaken}s`, icon: '⚡', bg: '#FCE7F0' },
      { label: 'ACCURACY', val: `${safeAccuracy}/${totalQuestions}`, icon: '🎯', bg: '#FBF0C8' },
      { label: 'CAMPUS RANK', val: `#${currentRank}`, icon: currentRank === 1 ? '👑' : currentRank <= 3 ? '🥈' : '🏅', bg: '#D4F4E2' },
    ];

    stats.forEach((st, idx) => {
      const px = startPillX + idx * (pillW + pillGap);

      // Pill Shadow
      ctx.fillStyle = '#1C332E';
      ctx.beginPath();
      ctx.roundRect(px + 4, pillY + 4, pillW, pillH, 16);
      ctx.fill();

      // Pill Box
      ctx.fillStyle = st.bg;
      ctx.strokeStyle = '#1C332E';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(px, pillY, pillW, pillH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = '28px -apple-system, sans-serif';
      ctx.fillText(st.icon, px + 18, pillY + 50);

      ctx.fillStyle = '#5A7A73';
      ctx.font = '800 12px "DM Sans", -apple-system, sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(st.label, px + 62, pillY + 32);

      ctx.fillStyle = '#1C332E';
      ctx.font = '900 24px "Baloo 2", -apple-system, sans-serif';
      ctx.fillText(st.val, px + 62, pillY + 60);
    });

    // ==========================================
    // 7. Bottom Inspirational Footer & Link
    // ==========================================
    const footerY = 1120;
    const footerW = 860;
    const footerH = 140;
    const footerX = (width - footerW) / 2;

    ctx.fillStyle = '#FBF0C8';
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(footerX, footerY, footerW, footerH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1C332E';
    ctx.font = 'italic 700 20px "DM Sans", -apple-system, sans-serif';
    ctx.fillText('“Learn from her courage. Carry the Shakti forward.”', width / 2, footerY + 44);

    ctx.fillStyle = '#B82348';
    ctx.font = '900 24px "Baloo 2", -apple-system, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('https://navratri-event.vercel.app', width / 2, footerY + 84);

    ctx.fillStyle = '#5A7A73';
    ctx.font = '700 15px "DM Sans", -apple-system, sans-serif';
    ctx.fillText('Organized with ❤️ for Amity University Online Community', width / 2, footerY + 116);

    // Generate PNG Data URL
    try {
      const url = canvas.toDataURL('image/png');
      setDataUrl(url);
    } catch (e) {
      console.error('Failed to generate scorecard canvas image', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawCard, 50);
    }
  }, [isOpen, points, timeTaken, firstTryCount, fullName, rank, puzzleBonus, batch, course, year]);

  if (!isOpen) return null;

  // 📥 1. Download image
  const downloadCardImage = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `PehchaanKaun_Rank${rank}_${(fullName || 'ScoreCard').replace(/\s+/g, '_')}.png`;
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
    setStatusMessage('Scorecard downloaded! Redirecting to BeSocial...');

    setTimeout(() => {
      window.open(besocialUrl, '_blank', 'noopener,noreferrer');
      setStatusMessage('Scorecard downloaded! Upload the downloaded image on your BeSocial post.');
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[var(--background)] border-2 border-[var(--foreground)] rounded-3xl shadow-[8px_8px_0_var(--foreground)] p-4 sm:p-6 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[var(--border)] shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[var(--foreground)] font-display flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              Your BeSocial Scorecard
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)] font-medium">
              Official scrapbook scorecard · Rank #{rank}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-2 border-[var(--foreground)] bg-[var(--background)] hover:bg-[var(--butter)] text-[var(--foreground)] flex items-center justify-center cursor-pointer transition-colors shadow-[2px_2px_0_var(--foreground)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Hidden Canvas for High-Res Generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Card Image Preview */}
        <div className="my-4 rounded-2xl overflow-hidden border-2 border-[var(--foreground)] shadow-[4px_5px_0_var(--foreground)] bg-white relative shrink-0">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="Pehchaan Kaun Scorecard"
              className="w-full h-auto object-contain max-h-[38vh] sm:max-h-[48vh] mx-auto block"
            />
          ) : (
            <div className="h-44 sm:h-56 flex items-center justify-center text-xs font-bold text-muted-foreground">
              Drawing your custom rosette scorecard...
            </div>
          )}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-[var(--mint)] border-2 border-[var(--foreground)] text-[var(--foreground)] text-xs flex items-center gap-2 mb-3 shadow-[2px_2px_0_var(--foreground)] shrink-0 font-bold">
            <Check size={14} className="shrink-0 text-emerald-700" /> {statusMessage}
          </div>
        )}

        {/* Quick Instructions */}
        <div className="bg-[var(--butter)]/60 border border-[var(--border)] rounded-xl p-3 text-[11px] text-[var(--foreground)] space-y-1 mb-3 shrink-0">
          <p className="font-black text-xs text-[var(--foreground)] flex items-center gap-1.5">
            <span>✨</span> How to post on BeSocial:
          </p>
          <p className="text-muted-foreground font-medium">
            Click <strong>"Share to BeSocial"</strong> below — your official high-res scorecard PNG will download and BeSocial will open. Attach the downloaded image to your post!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto space-y-2 pt-2 border-t-2 border-[var(--border)] shrink-0">
          <Button
            size="lg"
            className="w-full gap-2 font-black text-xs sm:text-sm h-12 bg-primary text-primary-foreground border-2 border-[var(--foreground)] shadow-[3px_3px_0_var(--foreground)] rounded-2xl hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--foreground)] hover:bg-primary/95 transition-all cursor-pointer"
            onClick={handleShareToBeSocial}
          >
            <Share2 size={16} /> <span>Share to BeSocial (1-Click)</span> <ExternalLink size={14} className="opacity-80" />
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-10 font-bold border-2 border-[var(--foreground)] bg-white shadow-[2px_2px_0_var(--foreground)] rounded-xl hover:bg-[var(--butter)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
              onClick={downloadCardImage}
            >
              <Download size={14} /> Download PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-10 font-bold border-2 border-[var(--foreground)] bg-white shadow-[2px_2px_0_var(--foreground)] rounded-xl hover:bg-[var(--butter)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
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
