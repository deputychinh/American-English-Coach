'use client';

import { type ReactElement, useState, useSyncExternalStore } from 'react';

import { Button } from '@/components/Button/Button';
import { DEFAULT_REMINDER_TIME } from '@/constants/plan.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { useCopy } from '@/hooks/useCopy';
import { useStoredState } from '@/hooks/useStoredState';
import { isNativeShell } from '@/utils/api-base.util';
import { nativeScheduleDailyReminder } from '@/utils/native.util';

const subscribeNever = (): (() => void) => () => undefined;

/**
 * After a finished lesson, the iOS app offers the daily reminder in one tap: the permission is
 * asked here, once the learner has seen what a session is like, never on first launch.
 */
export const LessonReminderOffer = (): ReactElement | null => {
  const copy = useCopy();
  const isNative = useSyncExternalStore(subscribeNever, isNativeShell, () => false);
  const [reminder, setReminder] = useStoredState<string>(StorageKey.ReminderTime, '');
  const [status, setStatus] = useState<string | null>(null);
  if (!isNative || (reminder && !status)) return null;

  const turnOn = async (): Promise<void> => {
    const outcome = await nativeScheduleDailyReminder(
      DEFAULT_REMINDER_TIME,
      copy.settings.reminderNotificationTitle,
      copy.settings.reminderNotificationBody,
    );
    if (outcome === 'scheduled') {
      setReminder(DEFAULT_REMINDER_TIME);
      setStatus(copy.settings.reminderSet(DEFAULT_REMINDER_TIME));
    } else {
      setStatus(
        outcome === 'denied' ? copy.settings.reminderDenied : copy.settings.reminderWebOnly,
      );
    }
  };

  return (
    <div className="lesson-summary__extra">
      {status ? (
        <p className="lesson-summary__line" role="status">
          {status}
        </p>
      ) : (
        <>
          <p className="lesson-summary__line">{copy.lesson.reminderLead}</p>
          <Button variant={ButtonVariant.Secondary} onClick={() => void turnOn()}>
            {copy.lesson.reminderOffer(DEFAULT_REMINDER_TIME)}
          </Button>
        </>
      )}
    </div>
  );
};
