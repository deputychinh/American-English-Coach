'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { referenceAudioUrl } from '@/features/practice/services/assessment.service';
import type { ReferenceAudio } from '@/interfaces/hooks.interface';
import { getCopy } from '@/locales';

/** Plays the cached reference WAV for a prompt; one element lives as long as the component. */
export const useReferenceAudio = (): ReferenceAudio => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const play = useCallback((text: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = referenceAudioUrl(text);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      setIsPlaying(false);
      setError(getCopy().practice.referenceFailedOffline);
    };
    setError(null);
    setIsPlaying(true);
    audio.play().catch(() => {
      setIsPlaying(false);
      setError(getCopy().practice.referenceFailed);
    });
  }, []);

  return { play, isPlaying, error };
};
