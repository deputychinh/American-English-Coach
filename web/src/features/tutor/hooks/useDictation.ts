'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Dictation, SpeechRecognizer } from '@/interfaces/feedback.interface';

type RecognitionConstructor = new () => SpeechRecognizer;

/** The browser's speech recogniser, if it has one (Chrome and Safari ship it prefixed). */
const recognizer = (): RecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  const scope = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
};

/**
 * Dictation into a text box (American English). The browser or the operating system does the
 * recognition; the app only receives the words, and the learner can correct them before sending.
 */
export const useDictation = (onText: (text: string) => void): Dictation => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognizer | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);
  useEffect(() => () => recognitionRef.current?.abort(), []);

  const start = useCallback((): void => {
    const Recognition = recognizer();
    if (!Recognition || recognitionRef.current) return;
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const said = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript.trim() ?? '')
        .filter(Boolean)
        .join(' ');
      if (said) onTextRef.current(said);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => recognition.stop();
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stop = useCallback((): void => recognitionRef.current?.stop(), []);

  return { isSupported: recognizer() !== null, isListening, start, stop };
};
