'use client';

import { type ReactElement, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { Tabs } from '@/components/Tabs/Tabs';
import { useToast } from '@/components/Toast/Toast';
import {
  DAILY_GOAL_OPTIONS,
  DEFAULT_DAILY_GOAL,
  DEFAULT_REMINDER_TIME,
} from '@/constants/plan.constant';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import { useCopy } from '@/hooks/useCopy';
import { useStoredState } from '@/hooks/useStoredState';
import { isNativeShell } from '@/utils/api-base.util';
import { nativeScheduleDailyReminder } from '@/utils/native.util';

/** Daily goal (drives the streak) and the iOS practice reminder. */
export const GoalCard = (): ReactElement => {
  const copy = useCopy().settings;
  const toast = useToast();
  const [goal, setGoal] = useStoredState<number>(StorageKey.DailyGoal, DEFAULT_DAILY_GOAL);
  const [reminder, setReminder] = useStoredState<string>(StorageKey.ReminderTime, '');
  const [time, setTime] = useState(reminder || DEFAULT_REMINDER_TIME);
  const [status, setStatus] = useState<string | null>(null);
  const isNative = isNativeShell();

  const apply = async (next: string | null): Promise<void> => {
    const outcome = await nativeScheduleDailyReminder(
      next,
      copy.reminderNotificationTitle,
      copy.reminderNotificationBody,
    );
    if (outcome === 'denied') {
      setStatus(copy.reminderDenied);
      return;
    }
    if (outcome === 'unsupported') {
      setStatus(copy.reminderWebOnly);
      return;
    }
    setReminder(next ?? '');
    const message = next ? copy.reminderSet(next) : copy.reminderOff;
    setStatus(message);
    toast.show(message, 'success');
  };

  return (
    <Card as="section" aria-labelledby="settings-goal">
      <SectionHeader id="settings-goal" title={copy.goalTitle} hint={copy.goalHint} />
      <div className="settings-screen__field">
        <span className="settings-screen__label" id="goal-label">
          {copy.goalLabel}
        </span>
        <Tabs
          label={copy.goalLabel}
          value={String(goal)}
          options={DAILY_GOAL_OPTIONS.map((count) => ({
            id: String(count),
            label: copy.goalOption(count),
          }))}
          onChange={(value) => setGoal(Number(value))}
        />
      </div>
      <div className="settings-screen__row">
        <label className="settings-screen__field">
          <span className="settings-screen__label">{copy.reminderLabel}</span>
          <input
            className="settings-screen__input"
            type="time"
            value={time}
            disabled={!isNative}
            onChange={(event) => setTime(event.target.value)}
          />
        </label>
        <Button isSmall disabled={!isNative} onClick={() => void apply(time)}>
          {copy.reminderOn}
        </Button>
        {reminder ? (
          <Button variant={ButtonVariant.Ghost} isSmall onClick={() => void apply(null)}>
            {copy.reminderOff.replace('Đã tắt', 'Tắt')}
          </Button>
        ) : null}
      </div>
      {!isNative ? <p className="settings-screen__muted">{copy.reminderWebOnly}</p> : null}
      {status ? (
        <p className="settings-screen__status" role="status">
          {status}
        </p>
      ) : null}
    </Card>
  );
};
