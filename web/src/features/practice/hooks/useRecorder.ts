'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  MAX_RECORD_SECONDS,
  TARGET_SAMPLE_RATE,
  WORKLET_NAME,
  WORKLET_URL,
} from '@/constants/recorder.constant';
import { RecorderStatus } from '@/enums/recorder-status.enum';
import type { Recorder, RecorderSession } from '@/interfaces/hooks.interface';
import type { Recording } from '@/interfaces/practice.interface';
import { getCopy } from '@/locales';
import { nativeHaptic } from '@/utils/native.util';
import { concatChunks, encodeWav, resample, rmsLevel } from '@/utils/wav-encoder.util';

const permissionMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'NotAllowedError')
    return getCopy().practice.micDenied;
  if (error instanceof DOMException && error.name === 'NotFoundError')
    return getCopy().practice.noMedia;
  return error instanceof Error ? error.message : getCopy().practice.noMedia;
};

const openContext = (): AudioContext => {
  try {
    return new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  } catch {
    return new AudioContext();
  }
};

/** Captures mono PCM through an AudioWorklet (ScriptProcessor fallback) and encodes 16 kHz WAV. */
export const useRecorder = (): Recorder => {
  const [status, setStatus] = useState(RecorderStatus.Idle);
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<RecorderSession | null>(null);
  const stopRef = useRef<() => Promise<Recording | null>>(() => Promise.resolve(null));

  const onChunk = useCallback((chunk: Float32Array, sampleRate: number) => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.startedAt === null) {
      session.startedAt = performance.now() / 1000 - chunk.length / sampleRate;
    }
    session.chunks.push(chunk);
    setLevel(rmsLevel(chunk));
    setSeconds((performance.now() / 1000 - (session.startedAt ?? 0)) | 0);
  }, []);

  const attachNode = useCallback(
    async (
      context: AudioContext,
      source: MediaStreamAudioSourceNode,
    ): Promise<RecorderSession['node']> => {
      if (typeof AudioWorkletNode !== 'undefined') {
        await context.audioWorklet.addModule(WORKLET_URL);
        const node = new AudioWorkletNode(context, WORKLET_NAME, { numberOfOutputs: 0 });
        node.port.onmessage = (event: MessageEvent<Float32Array>) =>
          onChunk(event.data, context.sampleRate);
        source.connect(node);
        return node;
      }
      const node = context.createScriptProcessor(2048, 1, 1);
      node.onaudioprocess = (event: AudioProcessingEvent) =>
        onChunk(new Float32Array(event.inputBuffer.getChannelData(0)), context.sampleRate);
      source.connect(node);
      node.connect(context.destination);
      return node;
    },
    [onChunk],
  );

  const stop = useCallback(async (): Promise<Recording | null> => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return null;
    if (session.timer) clearTimeout(session.timer);
    session.node.disconnect();
    session.stream.getTracks().forEach((track) => track.stop());
    const sampleRate = session.context.sampleRate;
    await session.context.close().catch(() => undefined);
    setStatus(RecorderStatus.Idle);
    setLevel(0);
    void nativeHaptic('medium');
    const samples = resample(concatChunks(session.chunks), sampleRate);
    const blob = encodeWav(samples);
    return {
      blob,
      url: URL.createObjectURL(blob),
      startedAt: session.startedAt ?? performance.now() / 1000,
      durationSeconds: samples.length / TARGET_SAMPLE_RATE,
    };
  }, []);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setError(null);
    setSeconds(0);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(getCopy().practice.noMedia);
      setStatus(RecorderStatus.Error);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      const context = openContext();
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      const session: RecorderSession = {
        context,
        stream,
        node: source as never,
        chunks: [],
        startedAt: null,
        timer: null,
      };
      sessionRef.current = session;
      session.node = await attachNode(context, source);
      session.timer = setTimeout(() => void stopRef.current(), MAX_RECORD_SECONDS * 1000);
      setStatus(RecorderStatus.Recording);
      void nativeHaptic('light');
    } catch (cause) {
      setError(permissionMessage(cause));
      setStatus(RecorderStatus.Error);
    }
  }, [attachNode]);

  useEffect(
    () => () => {
      void stopRef.current();
    },
    [],
  );

  return { status, level, seconds, error, start, stop };
};
