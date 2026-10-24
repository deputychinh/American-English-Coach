'use client';

import { type ReactElement, useCallback, useSyncExternalStore } from 'react';

import { Card } from '@/components/Card/Card';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { FluencyTrend } from '@/features/fluency/components/FluencyTrend';
import {
  loadFluencyDeck,
  serverSessions,
  sessionsSnapshot,
  subscribeSessions,
  trendSessions,
} from '@/features/fluency/services/fluency.service';
import { loadVocabState } from '@/features/vocab/services/vocab.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { activeProfileId } from '@/utils/api-base.util';

import './ProgressSpeaking.css';

/** Progress beyond sounds (plan v2 §3.1): words remembered and the fluency trend. */
export const ProgressSpeaking = (): ReactElement => {
  const copy = useCopy().fluency;
  const loadVocab = useCallback(() => loadVocabState(), []);
  const loadDeck = useCallback(() => loadFluencyDeck(), []);
  const vocab = useAsync(loadVocab).data;
  const deck = useAsync(loadDeck).data;
  const sessions = useSyncExternalStore(
    subscribeSessions,
    () => sessionsSnapshot(activeProfileId()),
    serverSessions,
  );
  return (
    <Card as="section" aria-labelledby="progress-speaking" className="progress-speaking">
      <SectionHeader id="progress-speaking" title={copy.progressTitle} />
      {vocab ? (
        <p className="progress-speaking__words">
          <strong>{copy.remembered(vocab.overview.remembered, vocab.overview.total)}</strong>
          <small className="progress-speaking__hint">{copy.rememberedHint}</small>
        </p>
      ) : null}
      <FluencyTrend sessions={trendSessions(sessions)} prompts={deck?.prompts ?? []} />
    </Card>
  );
};
