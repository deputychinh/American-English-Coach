'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { referenceAudioUrl } from '@/features/practice/services/assessment.service';
import type { ReferenceAudio } from '@/interfaces/hooks.interface';

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
      setError('Không phát được giọng mẫu (máy chấm chưa chạy?)');
    };
    setError(null);
    setIsPlaying(true);
    audio.play().catch(() => {
      setIsPlaying(false);
      setError('Không phát được giọng mẫu');
    });
  }, []);

  return { play, isPlaying, error };
};
