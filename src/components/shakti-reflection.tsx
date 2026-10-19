import React, { useState } from 'react';
import {
  Sparkles,
  Flower2,
  Heart,
  BookOpen,
  ArrowRight,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getSavedUserProfile } from '@/lib/leaderboard-store';
import { ReflectionShareModal } from '@/components/reflection-share-modal';

const SHAKTI_QUALITIES = [
  { id: 'courage', label: 'Courage', emoji: '⚔️', desc: 'Bravery to stand up for truth' },
  { id: 'wisdom', label: 'Wisdom', emoji: '🪔', desc: 'Clarity of mind and purpose' },
  { id: 'confidence', label: 'Confidence', emoji: '👑', desc: 'Belief in one’s own potential' },
  { id: 'independence', label: 'Independence', emoji: '🦅', desc: 'Freedom of thought and action' },
  { id: 'equality', label: 'Equality', emoji: '⚖️', desc: 'Justice and dignity for all' },
  { id: 'determination', label: 'Determination', emoji: '🔥', desc: 'Resilience against all odds' },
  { id: 'never_stop_learning', label: 'Never Stop Learning', emoji: '📚', desc: 'Lifelong curiosity and growth' },
];

interface ShaktiReflectionProps {
  initialQuality?: string;
  className?: string;
  onCardCreated?: () => void;
}

export function ShaktiReflection({
  initialQuality = 'Courage',
  className = '',
  onCardCreated,
}: ShaktiReflectionProps) {
  const profile = getSavedUserProfile();

  const [selectedQuality, setSelectedQuality] = useState<string>(initialQuality);
  const [reflectionText, setReflectionText] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>(
    profile?.fullName || profile?.username || ''
  );
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleCreateCard = async () => {
    // Open the modal immediately for instant gratification
    setShowShareModal(true);
    if (onCardCreated) onCardCreated();

    // Optionally save privately in database for records
    if (reflectionText.trim()) {
      setIsSubmitting(true);
      fetch('/api/reflections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          quality: selectedQuality,
          reflectionText: reflectionText.trim(),
          authorName: authorName.trim() || 'A Seeker of Shakti',
          course: profile?.course || 'BCA',
          year: profile?.year || '1st Sem',
          rollNo: profile?.rollNo || '',
          isPublic: false,
        }),
      }).catch(() => {}).finally(() => {
        setIsSubmitting(false);
      });
    }
  };

  return (
    <section
      id="shakti-reflection"
      className={`relative bg-[#FFF7F8] border-4 border-[#1C332E] rounded-3xl p-6 sm:p-8 md:p-10 shadow-[8px_8px_0px_#B82348] text-foreground ${className}`}
    >
      {/* Decorative Washi Tape Top Tab */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FBF0C8] border-2 border-[#1C332E] px-5 py-1 rounded-sm shadow-[2px_2px_0px_#1C332E] text-[11px] font-extrabold uppercase tracking-wider text-[#1C332E] rotate-[-1deg]">
        🌸 Shakti Reflection · Navratri 2026
      </div>

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2 mb-8 mt-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 bg-[#FCE7F0] text-[#B82348] rounded-full border border-[#B82348]/25">
          <Sparkles size={13} /> REFLECTION &amp; INSPIRATION
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1C332E] font-['Baloo_2']">
          Shakti Reflection: What Did You Learn?
        </h2>
        <p className="text-sm sm:text-base font-medium text-muted-foreground max-w-lg mx-auto">
          “Every inspiring woman leaves us with a lesson. What's yours?”
        </p>
      </div>

      {/* 3 Prompts Guide Box */}
      <div className="bg-[#FDF2F4] border-2 border-[#1C332E]/30 rounded-2xl p-4 sm:p-5 mb-8 max-w-3xl mx-auto shadow-xs">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#B82348] block mb-2">
          💡 Guiding Prompts to Inspire Your Thoughts:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs sm:text-sm font-semibold text-[#1C332E]">
          <div className="flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-[#1C332E]/20">
            <span className="font-extrabold text-[#B82348] shrink-0">1.</span>
            <span>What inspired you the most?</span>
          </div>
          <div className="flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-[#1C332E]/20">
            <span className="font-extrabold text-[#B82348] shrink-0">2.</span>
            <span>What did you learn from these unsung heroines?</span>
          </div>
          <div className="flex items-start gap-2 bg-white/80 p-3 rounded-xl border border-[#1C332E]/20">
            <span className="font-extrabold text-[#B82348] shrink-0">3.</span>
            <span>Which quality of Shakti do you want in your own life?</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Quality Selector Tags */}
        <div className="space-y-2.5">
          <label className="text-xs sm:text-sm font-extrabold text-[#1C332E] block">
            Select a Quality of Shakti:
          </label>
          <div className="flex flex-wrap gap-2">
            {SHAKTI_QUALITIES.map((q) => {
              const isSelected = selectedQuality.toLowerCase() === q.label.toLowerCase();
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setSelectedQuality(q.label)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#B82348] text-white border-[#1C332E] shadow-[3px_3px_0px_#1C332E] scale-105'
                      : 'bg-white text-[#1C332E] border-[#1C332E]/30 hover:border-[#1C332E] hover:bg-[#FCE7F0]/40'
                  }`}
                >
                  <span>{q.emoji}</span>
                  <span>{q.label}</span>
                  {isSelected && <CheckCircle2 size={13} className="ml-1 text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Thought Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-extrabold text-[#1C332E]">
              Your Personal Thought / Reflection:
            </label>
            <span className="text-[11px] text-muted-foreground font-medium">
              {reflectionText.length}/350 chars
            </span>
          </div>
          <Textarea
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value.slice(0, 350))}
            placeholder="Write your own thought in a few words… (e.g. Rani Abbakka taught me to be fearless when facing overwhelming challenges.)"
            rows={4}
            className="w-full bg-white border-2 border-[#1C332E] rounded-2xl p-3.5 text-sm font-medium focus-visible:ring-[#B82348] shadow-[3px_3px_0px_#1C332E] resize-none"
          />
        </div>

        {/* Author Name (Optional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground block">
            Your Name on the Card (Optional):
          </label>
          <Input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="e.g. Amity Sharma"
            className="bg-white border-2 border-[#1C332E] rounded-xl text-sm font-semibold h-10 shadow-[2px_2px_0px_#1C332E]"
          />
        </div>

        {/* Action Button */}
        <div className="pt-2 text-center">
          <Button
            type="button"
            onClick={handleCreateCard}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#B82348] hover:bg-[#961c3b] text-white font-black text-sm sm:text-base rounded-2xl shadow-[4px_4px_0px_#1C332E] border-2 border-[#1C332E] transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            <Sparkles size={18} className="mr-2" />
            Create My Reflection Card
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium">
            Generates a high-quality 4:5 card you can download as PNG or share directly to BeSocial!
          </p>
        </div>
      </div>

      {/* Share Modal */}
      <ReflectionShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        quality={selectedQuality}
        reflectionText={reflectionText}
        authorName={authorName}
        course={profile?.course || 'BCA'}
        year={profile?.year || '1st Sem'}
        rollNo={profile?.rollNo || ''}
      />
    </section>
  );
}
