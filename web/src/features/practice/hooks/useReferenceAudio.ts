'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { REFERENCE_CACHE_LIMIT, SILENT_WAV_DATA_URI } from '@/constants/recorder.constant';
import { fetchReferenceAudio } from '@/features/practice/services/assessment.service';
import {
  primeSystemVoice,
  speakWithSystemVoice,
  stopSystemVoice,
} from '@/features/practice/services/system-voice.service';
import { bundledClipUrl } from '@/features/practice/services/voice-library.service';
import type { ReferenceAudio } from '@/interfaces/hooks.interface';
import { getCopy } from '@/locales';
import { isLocalMode } from '@/utils/api-base.util';

/** Object URLs of clips already downloaded this session, oldest first. */
const clipUrls = new Map<string, string>();

const clipUrl = async (text: string): Promise<string> => {
  const cached = clipUrls.get(text);
  if (cached) return cached;
  // The voice shipped with the app first: works offline and needs no scoring server.
  const bundled = await bundledClipUrl(text);
  if (bundled) return bundled;
  const url = URL.createObjectURL(await fetchReferenceAudio(text));
  clipUrls.set(text, url);
  const oldest = clipUrls.keys().next().value;
  if (clipUrls.size > REFERENCE_CACHE_LIMIT && oldest !== undefined) {
    URL.revokeObjectURL(clipUrls.get(oldest) ?? '');
    clipUrls.delete(oldest);
  }
  return url;
};

/** Plays the reference pronunciation of a prompt; one element lives as long as the component. */
export const useReferenceAudio = (): ReferenceAudio => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    return () => {
      requestRef.current += 1;
      audio.pause();
      stopSystemVoice();
      audioRef.current = null;
    };
  }, []);

  const play = useCallback((text: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    requestRef.current += 1;
    const request = requestRef.current;
    setError(null);
    setIsPlaying(true);
    // Safari only lets an element play from a tap: start it silently now, swap the clip in later.
    if (!clipUrls.has(text)) {
      audio.src = SILENT_WAV_DATA_URI;
      audio.play().catch(() => undefined);
    }
    // Without a scoring server (web app, iOS app) the browser's own voice is the last resort.
    const hasSystemVoiceFallback = isLocalMode();
    if (hasSystemVoiceFallback) primeSystemVoice();
    const fail = (message: string): void => {
      if (request !== requestRef.current) return;
      if (hasSystemVoiceFallback && speakWithSystemVoice(text, () => setIsPlaying(false))) return;
      setIsPlaying(false);
      setError(message);
    };
    clipUrl(text)
      .then((url) => {
        if (request !== requestRef.current) return undefined;
        audio.src = url;
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => fail(getCopy().practice.referenceFailed);
        return audio.play();
      })
      .catch((cause: unknown) =>
        fail(cause instanceof Error ? cause.message : getCopy().practice.referenceFailed),
      );
  }, []);

  const stop = useCallback(() => {
    requestRef.current += 1;
    audioRef.current?.pause();
    stopSystemVoice();
    setIsPlaying(false);
  }, []);

  return { play, stop, isPlaying, error };
};
