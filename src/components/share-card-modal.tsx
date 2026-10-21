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

// Get dynamic inspiring quote tailored to rank and unsung heroines
export function getInspirationalQuote(rank: number, day?: number, dayTitle?: string): string {
  // Rank-specific tailored quotes celebrating unsung heroines & Shakti
  if (rank === 1) {
    return '“Radiating Supreme Shakti: Crowned Champion of India’s Unsung Heroines.”';
  }
  if (rank === 2) {
    return '“Fearless Wisdom & Valor: Carrying the Torch of Begum Hazrat Mahal.”';
  }
  if (rank === 3) {
    return '“Resolute Courage & Pride: Honoring the Unyielding Spirit of Matangini Hazra.”';
  }
  if (rank === 4) {
    return '“Roaring Bravery: Echoing Rani Abbakka Chowta’s Fearless Defiance.”';
  }
  if (rank === 5) {
    return '“Light of Knowledge: Walking the Visionary Path of Savitribai Phule.”';
  }
  if (rank === 6) {
    return '“Steadfast Devotion & Grit: Inspired by Uda Devi & Jhalkari Bai.”';
  }
  if (rank === 7) {
    return '“Breaking Every Barrier: Embodying Dr. Janaki Ammal’s Brilliant Mind.”';
  }
  if (rank === 8) {
    return '“Voice of Truth & Equality: Upholding the Legacy of Tarabai Shinde.”';
  }
  if (rank === 9) {
    return '“Defending Freedom: Standing Strong with Rani Chennamma’s Fearless Heart.”';
  }
  if (rank === 10) {
    return '“Top 10 Vanguard: Leading with the Unbreakable Power of Indian Shakti.”';
  }

  // Ranks 11+: Inspiring rotating / rank-based quotes for participants
  const participantQuotes = [
    '“Learn from her courage. Carry the eternal Shakti forward.”',
    '“Every spark of curiosity honors the unsung daughters of our motherland.”',
    '“Proud Explorer: Continuing the timeless journey of courage and wisdom.”',
    '“In the footsteps of fearless women who shaped India’s glorious destiny.”',
    '“Unsung in history, immortal in heart: Celebrating India’s brave heroines.”',
    '“Knowledge is your greatest weapon: Igniting the sacred fire of truth.”',
    '“Her courage, our inspiration: Keeping the flame of freedom burning bright.”',
    '“Standing tall with the pride, strength, and grace of Bharat’s daughters.”',
  ];
  return participantQuotes[(rank + (day || 0)) % participantQuotes.length];
}

// Draw a 3D faceted metallic star (military / championship medal style)
function drawFacetedStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  lightColor: string,
  darkColor: string,
  strokeColor: string,
  lineWidth: number = 2.5
) {
  ctx.save();
  const spikes = 5;
  const rot = (Math.PI / 2) * 3; // start pointing straight up
  const step = Math.PI / spikes;

  const outerPts: { x: number; y: number }[] = [];
  const innerPts: { x: number; y: number }[] = [];

  for (let i = 0; i < spikes; i++) {
    const aOuter = rot + i * 2 * step;
    outerPts.push({
      x: cx + Math.cos(aOuter) * outerRadius,
      y: cy + Math.sin(aOuter) * outerRadius,
    });
    const aInner = aOuter + step;
    innerPts.push({
      x: cx + Math.cos(aInner) * innerRadius,
      y: cy + Math.sin(aInner) * innerRadius,
    });
  }

  // Draw 10 faceted triangles alternating highlight and shadow
  for (let i = 0; i < spikes; i++) {
    const tip = outerPts[i];
    const prevInner = innerPts[(i - 1 + spikes) % spikes];
    const nextInner = innerPts[i];

    // Left facet (Highlight side)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(prevInner.x, prevInner.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.closePath();
    ctx.fillStyle = lightColor;
    ctx.fill();

    // Right facet (Shadow side)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(nextInner.x, nextInner.y);
    ctx.closePath();
    ctx.fillStyle = darkColor;
    ctx.fill();
  }

  // Crisp perimeter stroke
  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    if (i === 0) ctx.moveTo(outerPts[i].x, outerPts[i].y);
    else ctx.lineTo(outerPts[i].x, outerPts[i].y);
    ctx.lineTo(innerPts[i].x, innerPts[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Subtle center gleam
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.restore();
}

// Draw a multi-faceted royal crown with jewels & sparkle for Rank 1
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

  // 1. Velvet backing behind crown (royal deep red)
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 8, h / 2 - 8);
  ctx.quadraticCurveTo(0, -h / 2 + 14, w / 2 - 8, h / 2 - 8);
  ctx.closePath();
  ctx.fillStyle = '#991B1B';
  ctx.fill();

  // 2. Crown body base arc
  ctx.beginPath();
  ctx.moveTo(-w / 2, h / 2);
  ctx.lineTo(-w / 2 - 4, -h / 2 + 8); // left tip
  ctx.lineTo(-w / 5, -h / 6); // left dip
  ctx.lineTo(0, -h / 2 - 10); // center tall tip
  ctx.lineTo(w / 5, -h / 6); // right dip
  ctx.lineTo(w / 2 + 4, -h / 2 + 8); // right tip
  ctx.lineTo(w / 2, h / 2); // right bottom
  ctx.closePath();

  // Multi-stop golden gradient
  const grad = ctx.createLinearGradient(0, -h / 2 - 10, 0, h / 2);
  grad.addColorStop(0, '#FEF08A');
  grad.addColorStop(0.35, '#F59E0B');
  grad.addColorStop(0.85, '#D97706');
  grad.addColorStop(1, '#92400E');
  ctx.fillStyle = grad;
  ctx.fill();

  // Facet creases running down from tips to base
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2 - 10);
  ctx.lineTo(0, h / 2 - 10);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
  ctx.beginPath();
  ctx.moveTo(-w / 5, -h / 6);
  ctx.lineTo(-w / 5, h / 2 - 10);
  ctx.moveTo(w / 5, -h / 6);
  ctx.lineTo(w / 5, h / 2 - 10);
  ctx.stroke();

  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 3. Pearls / Jewels on the 3 top tips
  const tips = [
    { x: -w / 2 - 4, y: -h / 2 + 8, r: 7 },
    { x: 0, y: -h / 2 - 10, r: 9.5 },
    { x: w / 2 + 4, y: -h / 2 + 8, r: 7 },
  ];
  tips.forEach((tip) => {
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, tip.r, 0, Math.PI * 2);
    const pearlGrad = ctx.createRadialGradient(
      tip.x - tip.r * 0.3,
      tip.y - tip.r * 0.3,
      1,
      tip.x,
      tip.y,
      tip.r
    );
    pearlGrad.addColorStop(0, '#FFFFFF');
    pearlGrad.addColorStop(0.55, '#FEF08A');
    pearlGrad.addColorStop(1, '#D97706');
    ctx.fillStyle = pearlGrad;
    ctx.fill();
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Specular gleam
    ctx.beginPath();
    ctx.arc(tip.x - tip.r * 0.3, tip.y - tip.r * 0.3, tip.r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  });

  // Sparkle cross on center pearl
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  const cpX = 0;
  const cpY = -h / 2 - 10;
  ctx.beginPath();
  ctx.moveTo(cpX - 8, cpY);
  ctx.lineTo(cpX + 8, cpY);
  ctx.moveTo(cpX, cpY - 8);
  ctx.lineTo(cpX, cpY + 8);
  ctx.stroke();

  // 4. Crown base band (Embossed gold band with gemstones)
  const bandY = h / 2 - 10;
  const bandH = 13;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 3, bandY, w - 6, bandH, 4);
  const bandGrad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  bandGrad.addColorStop(0, '#B45309');
  bandGrad.addColorStop(0.5, '#78350F');
  bandGrad.addColorStop(1, '#451A03');
  ctx.fillStyle = bandGrad;
  ctx.fill();
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 5. Gemstones on crown band
  const gems = [
    { x: -w / 3.4, color: '#3B82F6', border: '#1E3A8A' }, // Sapphire
    { x: 0, color: '#EF4444', border: '#7F1D1D' },        // Ruby
    { x: w / 3.4, color: '#10B981', border: '#064E3B' },  // Emerald
  ];
  gems.forEach((gem) => {
    ctx.beginPath();
    ctx.arc(gem.x, bandY + bandH / 2, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = gem.color;
    ctx.fill();
    ctx.strokeStyle = gem.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Specular highlight
    ctx.beginPath();
    ctx.arc(gem.x - 1.2, bandY + bandH / 2 - 1.2, 1.3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  });

  ctx.restore();
}

// Draw a detailed pleated ribbon rosette with radial flutes & ridges
function drawDetailedRosette(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseR: number,
  amplitude: number,
  petals: number,
  fillColor: string,
  darkColor: string,
  strokeColor: string,
  innerR: number = 82
) {
  ctx.save();

  // 1. Scalloped Outer Boundary Path
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

  // Radial gradient fill for the rosette ribbon
  const radGrad = ctx.createRadialGradient(cx, cy, innerR * 0.75, cx, cy, baseR + amplitude);
  radGrad.addColorStop(0, fillColor);
  radGrad.addColorStop(0.7, fillColor);
  radGrad.addColorStop(1, darkColor);
  ctx.fillStyle = radGrad;
  ctx.fill();

  // Outer dark contour
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  // 2. Radial Ribbon Pleats (3D folds between inner circle and outer scallops)
  const angleStep = (2 * Math.PI) / petals;
  for (let i = 0; i < petals; i++) {
    const peakAngle = i * angleStep;
    const valleyAngle = peakAngle + angleStep / 2;

    // Peak radius & position
    const rPeak = baseR + amplitude;
    const px = cx + rPeak * Math.cos(peakAngle);
    const py = cy + rPeak * Math.sin(peakAngle);

    // Inner point for peak
    const inPx = cx + (innerR - 2) * Math.cos(peakAngle);
    const inPy = cy + (innerR - 2) * Math.sin(peakAngle);

    // Valley radius & position
    const rValley = baseR - amplitude * 0.45;
    const vx = cx + rValley * Math.cos(valleyAngle);
    const vy = cy + rValley * Math.sin(valleyAngle);

    // Inner point for valley
    const inVx = cx + (innerR - 2) * Math.cos(valleyAngle);
    const inVy = cy + (innerR - 2) * Math.sin(valleyAngle);

    // Subtle shaded pleat facet
    ctx.beginPath();
    ctx.moveTo(inVx, inVy);
    ctx.lineTo(vx, vy);
    ctx.lineTo(px, py);
    ctx.lineTo(inPx, inPy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fill();

    // Crease line at the valley fold (dark shadow)
    ctx.beginPath();
    ctx.moveTo(inVx, inVy);
    ctx.lineTo(vx, vy);
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.stroke();

    // Highlight ridge line at the peak fold (bright crest)
    ctx.beginPath();
    ctx.moveTo(inPx, inPy);
    ctx.lineTo(px, py);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.45;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // 3. Concentric decorative rings on the pleated ribbon
  ctx.beginPath();
  ctx.arc(cx, cy, baseR - 8, 0, Math.PI * 2);
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, baseR - 14, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]); // reset dash

  ctx.restore();
}

// Draw a detailed laurel wreath with curved stems, double leaves, veins & berries
function drawDetailedLaurelWreath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  leafColor: string,
  berryColor: string = '#F59E0B'
) {
  ctx.save();

  const numLeaves = 8;
  const startAngleOffset = Math.PI * 0.18; // clearance at bottom
  const arcSpan = Math.PI * 0.58;

  // Left branch curved stem
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.5 + startAngleOffset, Math.PI * 0.5 + startAngleOffset + arcSpan);
  ctx.strokeStyle = leafColor;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Right branch curved stem
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.5 - startAngleOffset - arcSpan, Math.PI * 0.5 - startAngleOffset);
  ctx.strokeStyle = leafColor;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Left branch leaves & berries
  for (let i = 0; i < numLeaves; i++) {
    const t = i / (numLeaves - 1);
    const angle = Math.PI * 0.5 + startAngleOffset + t * arcSpan;
    const lx = cx + r * Math.cos(angle);
    const ly = cy + r * Math.sin(angle);

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle + Math.PI / 2);

    // Inner leaf
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 5, 0.4, 0, Math.PI * 2);
    ctx.fillStyle = leafColor;
    ctx.fill();
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Leaf spine
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Outer leaf
    ctx.beginPath();
    ctx.ellipse(5, -5, 8, 4, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = leafColor;
    ctx.fill();
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // Accent berry between leaf pairs
    if (i < numLeaves - 1) {
      const berryAngle = angle + (arcSpan / (numLeaves - 1)) * 0.5;
      const bx = cx + (r + 7) * Math.cos(berryAngle);
      const by = cy + (r + 7) * Math.sin(berryAngle);
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fillStyle = berryColor;
      ctx.fill();
      ctx.strokeStyle = '#1C332E';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Right branch leaves & berries
  for (let i = 0; i < numLeaves; i++) {
    const t = i / (numLeaves - 1);
    const angle = Math.PI * 0.5 - startAngleOffset - t * arcSpan;
    const rx = cx + r * Math.cos(angle);
    const ry = cy + r * Math.sin(angle);

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle - Math.PI / 2);

    // Inner leaf
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 5, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = leafColor;
    ctx.fill();
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Leaf spine
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Outer leaf
    ctx.beginPath();
    ctx.ellipse(-5, -5, 8, 4, 0.4, 0, Math.PI * 2);
    ctx.fillStyle = leafColor;
    ctx.fill();
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // Accent berry between leaf pairs
    if (i < numLeaves - 1) {
      const berryAngle = angle - (arcSpan / (numLeaves - 1)) * 0.5;
      const bx = cx + (r + 7) * Math.cos(berryAngle);
      const by = cy + (r + 7) * Math.sin(berryAngle);
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fillStyle = berryColor;
      ctx.fill();
      ctx.strokeStyle = '#1C332E';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Small ribbon tie at the bottom center of the wreath
  const bowY = cy + r + 2;
  ctx.beginPath();
  ctx.arc(cx, bowY, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = berryColor;
  ctx.fill();
  ctx.strokeStyle = '#1C332E';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tiny bow ribbon loops
  ctx.beginPath();
  ctx.ellipse(cx - 7, bowY, 5, 2.5, -0.2, 0, Math.PI * 2);
  ctx.ellipse(cx + 7, bowY, 5, 2.5, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = berryColor;
  ctx.fill();
  ctx.strokeStyle = '#1C332E';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.restore();
}

// Draw 3D folded horizontal ribbon banner with inner stitching
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

  const wingW = 60;
  const wingH = h - 6;
  const foldW = 24;

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

  // 3. Fold shadow triangles (under the wings)
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

  // 4. Center main banner rectangle with gradient
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 8);
  const banGrad = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  banGrad.addColorStop(0, bgColor);
  banGrad.addColorStop(1, shadowColor);
  ctx.fillStyle = banGrad;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Inner stitched dashed border
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2 + 4, cy - h / 2 + 4, w - 8, h - 8, 6);
  ctx.stroke();
  ctx.setLineDash([]); // reset dash

  // Text inside banner
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.font = '900 24px "DM Sans", -apple-system, sans-serif';
  ctx.letterSpacing = '1.5px';
  ctx.fillText(text, cx, cy);

  ctx.restore();
}

// Draw two striped hanging ribbon tails behind the banner with grosgrain texture
function drawDetailedRibbonTails(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color1: string,
  color2: string,
  borderColor: string = '#1C332E'
) {
  ctx.save();
  const tailWidth = 48;
  const tailLength = 126;

  // Drop shadow behind ribbon tails
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.beginPath();
  ctx.moveTo(cx - 30 + 4, cy + 4);
  ctx.lineTo(cx - 75 + 4, cy + tailLength + 4);
  ctx.lineTo(cx - 75 + tailWidth / 2 + 4, cy + tailLength - 18 + 4);
  ctx.lineTo(cx - 75 + tailWidth + 4, cy + tailLength + 4);
  ctx.lineTo(cx - 30 + tailWidth + 4, cy + 4);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 30 - tailWidth + 4, cy + 4);
  ctx.lineTo(cx + 75 - tailWidth + 4, cy + tailLength + 4);
  ctx.lineTo(cx + 75 - tailWidth / 2 + 4, cy + tailLength - 18 + 4);
  ctx.lineTo(cx + 75 + 4, cy + tailLength + 4);
  ctx.lineTo(cx + 30 + 4, cy + 4);
  ctx.closePath();
  ctx.fill();

  // Left tail base
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
  ctx.lineTo(cx - 75 + 22, cy + tailLength - 15);
  ctx.lineTo(cx - 30 + 22, cy);
  ctx.closePath();
  ctx.fillStyle = color2;
  ctx.fill();

  // Left fine grosgrain texture lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1;
  for (let s = 10; s < tailLength - 20; s += 8) {
    const frac = s / tailLength;
    const sx = cx - 30 - (45 * frac);
    ctx.beginPath();
    ctx.moveTo(sx + 4, cy + s);
    ctx.lineTo(sx + tailWidth - 4, cy + s);
    ctx.stroke();
  }

  // Right tail base
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
  ctx.moveTo(cx + 30 - 22, cy);
  ctx.lineTo(cx + 75 - 22, cy + tailLength - 15);
  ctx.lineTo(cx + 75 - 12, cy + tailLength - 4);
  ctx.lineTo(cx + 30 - 12, cy);
  ctx.closePath();
  ctx.fillStyle = color2;
  ctx.fill();

  // Right fine grosgrain texture lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1;
  for (let s = 10; s < tailLength - 20; s += 8) {
    const frac = s / tailLength;
    const sx = cx + 30 - tailWidth + (45 * frac);
    ctx.beginPath();
    ctx.moveTo(sx + 4, cy + s);
    ctx.lineTo(sx + tailWidth - 4, cy + s);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw alternating long & short radiating sunburst rays with sparkle tips
function drawSunburstRays(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerR: number,
  numRays: number,
  rayColor: string
) {
  ctx.save();
  ctx.strokeStyle = rayColor;
  ctx.fillStyle = rayColor;

  for (let i = 0; i < numRays; i++) {
    const angle = (i * 2 * Math.PI) / numRays;
    const isLong = i % 2 === 0;
    const rayLen = isLong ? 56 : 34;
    const lineWidth = isLong ? 2.5 : 1.6;

    const x1 = cx + (innerR + 8) * Math.cos(angle);
    const y1 = cy + (innerR + 8) * Math.sin(angle);
    const x2 = cx + (innerR + 8 + rayLen) * Math.cos(angle);
    const y2 = cy + (innerR + 8 + rayLen) * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Diamond sparkle or dot at the end of long rays
    if (isLong) {
      const tipX = cx + (innerR + 14 + rayLen) * Math.cos(angle);
      const tipY = cy + (innerR + 14 + rayLen) * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(tipX, tipY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

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

  const effectiveMaxPoints = puzzleBonus && puzzleBonus > 0 ? maxPoints + puzzleBonus : maxPoints;
  const safePoints = Math.min(points, effectiveMaxPoints);
  const safeAccuracy = Math.min(firstTryCount, totalQuestions);

  const isOverall = dayTitle.toLowerCase().includes('overall');
  const puzzleExtraText = puzzleBonus && puzzleBonus > 0 ? ` (+${puzzleBonus} Extra Points for Puzzle Challenge)` : '';

  const currentRank = Math.max(1, rank);
  let rankText = `🏆 Secured Rank #${currentRank}`;
  if (currentRank === 1) {
    rankText = `👑 Secured 1st Rank (Grand Champion)`;
  } else if (currentRank === 2) {
    rankText = `🥈 Secured 2nd Rank (Runner-Up)`;
  } else if (currentRank === 3) {
    rankText = `🥉 Secured 3rd Rank (Podium Finisher)`;
  } else if (currentRank <= 10) {
    rankText = `🌟 Secured Rank #${currentRank} (Top 10)`;
  }

  const shareCaption = isOverall
    ? `${rankText} in the Overall Championship of "पहचानो कौन?" with ${safePoints}/${maxPoints} points${puzzleExtraText} in ${timeTaken}s! 🌸\n\nCan you beat my rank and score? Test your knowledge of India's unsung heroines: ${websiteUrl}\n\n@aahanasahay @singhsimrangopal22542`
    : `${rankText} in Day ${String(day).padStart(2, '0')} (${dayTitle}) of "पहचानो कौन?" with ${safePoints}/${maxPoints} points in ${timeTaken}s! 🌸\n\nCan you beat my rank and score? Test your knowledge of India's unsung heroines: ${websiteUrl}\n\n@aahanasahay @singhsimrangopal22542`;

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
    // 3. Central Rosette Medal Centerpiece (Slightly increased size)
    // ==========================================
    const medalCenterX = width / 2;
    const medalCenterY = 388;
    const rosetteRadius = 126;
    const innerRadius = 94;
    const innerStitchRadius = 85;

    // A. Radiating Sunburst Rays behind medal
    drawSunburstRays(ctx, medalCenterX, medalCenterY, rosetteRadius, 32, rayColor);

    // B. Hanging Striped Ribbon Tails
    drawDetailedRibbonTails(
      ctx,
      medalCenterX,
      medalCenterY + 44,
      ribbonColor1,
      ribbonColor2,
      '#1C332E'
    );

    // C. Scalloped Rosette Outer Disc with radial pleats & flutes
    drawDetailedRosette(
      ctx,
      medalCenterX,
      medalCenterY,
      rosetteRadius,
      14,
      24,
      rosetteColor,
      rosetteDark,
      '#1C332E',
      innerRadius
    );

    // D. Inner White / Cream Disc
    ctx.beginPath();
    ctx.arc(medalCenterX, medalCenterY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerDiscColor;
    ctx.fill();
    ctx.strokeStyle = '#1C332E';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Stitched inner dashed circle
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(medalCenterX, medalCenterY, innerStitchRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // E. Laurel Wreath Leaves inside disc with berries
    const wreathBerryColor = currentRank === 2 ? '#94A3B8' : currentRank === 3 ? '#FB923C' : '#F59E0B';
    drawDetailedLaurelWreath(ctx, medalCenterX, medalCenterY, 69, wreathColor, wreathBerryColor);

    // F. Rank Number & Ordinal Suffix inside disc
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = numberColor;

    // Font size adapts for 1-digit vs 2-digit ranks
    const numberFontSize = currentRank < 10 ? 76 : currentRank < 100 ? 60 : 48;
    ctx.font = `900 ${numberFontSize}px "Baloo 2", -apple-system, sans-serif`;

    // Measure to place suffix neatly
    const numText = String(currentRank);
    const numMetrics = ctx.measureText(numText);
    const numOffset = suffix ? -numMetrics.width * 0.15 : 0;

    ctx.fillText(numText, medalCenterX + numOffset, medalCenterY + 4);

    // Suffix superscript
    if (suffix) {
      ctx.font = '800 27px "Baloo 2", -apple-system, sans-serif';
      ctx.fillText(
        suffix,
        medalCenterX + numOffset + numMetrics.width * 0.55 + 8,
        medalCenterY - numberFontSize * 0.28
      );
    }
    ctx.restore();

    // G. Top Crown or Stars Decoration
    if (currentRank === 1) {
      // 👑 Rank 1: Royal Gemmed Crown on top
      drawCrown(
        ctx,
        medalCenterX,
        medalCenterY - rosetteRadius - 22,
        98,
        54,
        '#F59E0B',
        '#1C332E'
      );
    } else if (currentRank === 2) {
      // 🥈 Rank 2: 3 Faceted 3D Silver Stars
      drawFacetedStar(ctx, medalCenterX, medalCenterY - rosetteRadius - 32, 25, 11.5, '#FFFFFF', '#94A3B8', '#1E293B', 2.5);
      drawFacetedStar(ctx, medalCenterX - 42, medalCenterY - rosetteRadius - 20, 17, 8, '#FFFFFF', '#94A3B8', '#1E293B', 2);
      drawFacetedStar(ctx, medalCenterX + 42, medalCenterY - rosetteRadius - 20, 17, 8, '#FFFFFF', '#94A3B8', '#1E293B', 2);
    } else if (currentRank === 3) {
      // 🥉 Rank 3: 3 Faceted 3D Bronze Stars
      drawFacetedStar(ctx, medalCenterX, medalCenterY - rosetteRadius - 32, 25, 11.5, '#FFEDD5', '#EA580C', '#7C2D12', 2.5);
      drawFacetedStar(ctx, medalCenterX - 42, medalCenterY - rosetteRadius - 20, 17, 8, '#FFEDD5', '#EA580C', '#7C2D12', 2);
      drawFacetedStar(ctx, medalCenterX + 42, medalCenterY - rosetteRadius - 20, 17, 8, '#FFEDD5', '#EA580C', '#7C2D12', 2);
    } else if (currentRank >= 4 && currentRank <= 10) {
      // 🌟 Rank 4-10: 3 Faceted 3D Emerald & Gold Stars
      drawFacetedStar(ctx, medalCenterX, medalCenterY - rosetteRadius - 32, 25, 11.5, '#FEF08A', '#F59E0B', '#064E3B', 2.5);
      drawFacetedStar(ctx, medalCenterX - 42, medalCenterY - rosetteRadius - 20, 17, 8, '#FEF08A', '#F59E0B', '#064E3B', 2);
      drawFacetedStar(ctx, medalCenterX + 42, medalCenterY - rosetteRadius - 20, 17, 8, '#FEF08A', '#F59E0B', '#064E3B', 2);
    } else {
      // 🎖️ Rank 11+: Single Faceted 3D Rose Star
      drawFacetedStar(ctx, medalCenterX, medalCenterY - rosetteRadius - 24, 26, 12, '#FFE4E6', '#FB7185', '#881337', 2.5);
    }

    // H. Folded Ribbon Banner
    const bannerW = currentRank > 99 ? 460 : 400;
    drawFoldedBanner(
      ctx,
      medalCenterX,
      medalCenterY + 112,
      bannerW,
      54,
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
    ctx.fillText(cleanName.toUpperCase(), width / 2, 665);

    // Course & Batch
    ctx.fillStyle = '#5A7A73';
    ctx.font = '700 22px "DM Sans", -apple-system, sans-serif';
    ctx.letterSpacing = '1px';
    const batchText = batch ? `Batch ${batch}` : year;
    ctx.fillText(`${course} · ${batchText} · AMITY ONLINE`, width / 2, 705);

    // ==========================================
    // 5. Rounded Score Box (Exact replica of image)
    // ==========================================
    const boxW = 460;
    const boxH = 120;
    const boxX = (width - boxW) / 2;
    const boxY = 745;

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

    // Dynamic quote tailored to rank and unsung heroines
    const quote = getInspirationalQuote(currentRank, day, dayTitle);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1C332E';
    let quoteFontSize = 20;
    ctx.font = `italic 700 ${quoteFontSize}px "DM Sans", -apple-system, sans-serif`;
    while (ctx.measureText(quote).width > footerW - 60 && quoteFontSize > 13) {
      quoteFontSize -= 1;
      ctx.font = `italic 700 ${quoteFontSize}px "DM Sans", -apple-system, sans-serif`;
    }
    ctx.fillText(quote, width / 2, footerY + 44);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2.5 sm:p-5 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[var(--background)] border-2 border-[var(--foreground)] rounded-3xl shadow-[8px_8px_0_var(--foreground)] p-3.5 sm:p-6 flex flex-col max-h-[92dvh] sm:max-h-[92vh] overflow-y-auto overscroll-contain">
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
        <div className="my-3 sm:my-4 rounded-2xl overflow-hidden border-2 border-[var(--foreground)] shadow-[4px_5px_0_var(--foreground)] bg-white relative shrink-0">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="Pehchaan Kaun Scorecard"
              className="w-full h-auto object-contain max-h-[32dvh] sm:max-h-[46vh] mx-auto block"
            />
          ) : (
            <div className="h-40 sm:h-56 flex items-center justify-center text-xs font-bold text-muted-foreground">
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
        <div className="bg-[var(--butter)]/60 border border-[var(--border)] rounded-xl p-2.5 sm:p-3 text-[11px] text-[var(--foreground)] space-y-1 mb-3 shrink-0">
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
            className="w-full gap-2 font-black text-xs sm:text-sm h-11 sm:h-12 bg-primary text-primary-foreground border-2 border-[var(--foreground)] shadow-[3px_3px_0_var(--foreground)] rounded-2xl hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--foreground)] hover:bg-primary/95 transition-all cursor-pointer"
            onClick={handleShareToBeSocial}
          >
            <Share2 size={16} /> <span>Share to BeSocial (1-Click)</span> <ExternalLink size={14} className="opacity-80" />
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-10 font-bold border-2 border-[var(--foreground)] bg-white shadow-[2px_2px_0_var(--foreground)] rounded-xl hover:bg-[var(--butter)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer px-2"
              onClick={downloadCardImage}
            >
              <Download size={14} className="shrink-0" /> <span className="truncate">Download PNG</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-10 font-bold border-2 border-[var(--foreground)] bg-white shadow-[2px_2px_0_var(--foreground)] rounded-xl hover:bg-[var(--butter)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer px-2"
              onClick={copyTextCaption}
            >
              {copiedText ? (
                <>
                  <Check size={14} className="text-emerald-600 shrink-0" /> <span className="truncate">Caption Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="shrink-0" /> <span className="truncate">Copy Caption</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
