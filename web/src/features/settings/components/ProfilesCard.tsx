'use client';

import { type ChangeEvent, type ReactElement, useCallback, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { useToast } from '@/components/Toast/Toast';
import { DEFAULT_PROFILE_ID, PROFILE_EXPORT_FORMAT } from '@/constants/api.constant';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import {
  createProfile,
  deleteProfile,
  exportProfile,
  importProfile,
  listProfiles,
  noteProfileRenamed,
  renameProfile,
  setActiveProfile,
} from '@/features/settings/services/profile.service';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import type { Profile, ProfileExport } from '@/interfaces/practice.interface';
import { readPickedFile, saveTextFile } from '@/utils/download.util';
import { formatDate, slugify } from '@/utils/format.util';

import './ProfilesCard.css';

const isSnapshot = (value: unknown): value is ProfileExport =>
  typeof value === 'object' &&
  value !== null &&
  (value as { format?: unknown }).format === PROFILE_EXPORT_FORMAT &&
  Array.isArray((value as { runs?: unknown }).runs);

/** List, switch, create, rename, delete, export and import learner profiles. */
export const ProfilesCard = (): ReactElement => {
  const copy = useCopy().settings.profiles;
  const toast = useToast();
  const active = useActiveProfile();
  const profiles = useAsync(listProfiles);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const report = useCallback(
    (message: string, tone: 'success' | 'error' = 'success'): void => {
      setStatus(message);
      if (tone === 'success') toast.show(message, 'success');
    },
    [toast],
  );
  const failed = (error: unknown): void =>
    report(error instanceof Error ? error.message : copy.loadFailed, 'error');

  const use = (profile: Profile): void => {
    setActiveProfile({ id: profile.id, name: profile.name });
    report(copy.switched(profile.name));
  };
  const create = async (): Promise<void> => {
    const name = newName.trim();
    if (!name) return;
    try {
      const created = await createProfile(name);
      setNewName('');
      setActiveProfile({ id: created.id, name: created.name });
      profiles.reload();
      report(copy.createdDone(created.name));
    } catch (error) {
      failed(error);
    }
  };
  const saveName = async (): Promise<void> => {
    if (!editing || !editing.name.trim()) return;
    try {
      const renamed = await renameProfile(editing.id, editing.name.trim());
      noteProfileRenamed({ id: renamed.id, name: renamed.name });
      setEditing(null);
      profiles.reload();
      report(copy.renamed);
    } catch (error) {
      failed(error);
    }
  };
  const remove = async (profile: Profile): Promise<void> => {
    try {
      await deleteProfile(profile.id);
      setRemoving(null);
      if (active.id === profile.id) setActiveProfile({ id: DEFAULT_PROFILE_ID, name: '' });
      profiles.reload();
      report(copy.removed);
    } catch (error) {
      failed(error);
    }
  };
  const exportOne = async (profile: Profile): Promise<void> => {
    try {
      const snapshot = await exportProfile(profile.id);
      const day = snapshot.exported_at.slice(0, 10);
      await saveTextFile(
        `aec-${slugify(profile.name)}-${day}.json`,
        JSON.stringify(snapshot, null, 2),
        'application/json',
      );
      report(copy.exported);
    } catch (error) {
      failed(error);
    }
  };
  const importFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const text = await readPickedFile(event.target.files?.[0]);
    event.target.value = '';
    if (!text) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      report(copy.importFailed, 'error');
      return;
    }
    if (!isSnapshot(parsed)) {
      report(copy.importFailed, 'error');
      return;
    }
    try {
      const result = await importProfile(parsed);
      profiles.reload();
      report(copy.imported(result.profile.name, result.imported_runs));
    } catch (error) {
      failed(error);
    }
  };

  const displayName = (profile: Profile): string =>
    profile.id === DEFAULT_PROFILE_ID && !profile.name ? copy.defaultName : profile.name;

  return (
    <Card as="section" aria-labelledby="settings-profiles" id="profiles">
      <SectionHeader id="settings-profiles" title={copy.title} hint={copy.hint} />
      {profiles.status === AsyncStatus.Loading ? <Skeleton lines={2} /> : null}
      {profiles.status === AsyncStatus.Error ? (
        <ErrorState message={profiles.error ?? copy.loadFailed} onRetry={profiles.reload} />
      ) : null}
      {profiles.data ? (
        <ul className="profiles-card__list">
          {profiles.data.map((profile) => {
            const isActive = profile.id === active.id;
            return (
              <li
                key={profile.id}
                className={`profiles-card__row${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'true' : undefined}
              >
                {editing?.id === profile.id ? (
                  <form
                    className="profiles-card__edit"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveName();
                    }}
                  >
                    <label className="profiles-card__field">
                      <span className="visually-hidden">{copy.nameLabel}</span>
                      <input
                        className="profiles-card__input"
                        value={editing.name}
                        maxLength={80}
                        onChange={(event) =>
                          setEditing({ id: profile.id, name: event.target.value })
                        }
                      />
                    </label>
                    <Button type="submit" isSmall>
                      {copy.save}
                    </Button>
                    <Button variant={ButtonVariant.Ghost} isSmall onClick={() => setEditing(null)}>
                      {copy.cancel}
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="profiles-card__text">
                      <span className="profiles-card__name">
                        {displayName(profile)}
                        {isActive ? (
                          <span className="badge badge--success">{copy.active}</span>
                        ) : null}
                      </span>
                      <span className="profiles-card__meta">
                        {copy.runs(profile.runs)} · {copy.created(formatDate(profile.created_at))}
                      </span>
                    </div>
                    <div className="profiles-card__actions">
                      {!isActive ? (
                        <Button isSmall onClick={() => use(profile)}>
                          {copy.use}
                        </Button>
                      ) : null}
                      <Button
                        variant={ButtonVariant.Ghost}
                        isSmall
                        onClick={() => setEditing({ id: profile.id, name: displayName(profile) })}
                      >
                        {copy.rename}
                      </Button>
                      <Button
                        variant={ButtonVariant.Ghost}
                        isSmall
                        onClick={() => void exportOne(profile)}
                      >
                        {copy.export}
                      </Button>
                      {profile.id !== DEFAULT_PROFILE_ID ? (
                        <Button
                          variant={ButtonVariant.Ghost}
                          isSmall
                          onClick={() => setRemoving(profile.id)}
                        >
                          {copy.remove}
                        </Button>
                      ) : null}
                    </div>
                    {removing === profile.id ? (
                      <div className="profiles-card__confirm" role="alertdialog" aria-live="polite">
                        <span>{copy.confirmRemove(displayName(profile))}</span>
                        <Button
                          variant={ButtonVariant.Secondary}
                          isSmall
                          onClick={() => void remove(profile)}
                        >
                          {copy.confirmYes}
                        </Button>
                        <Button
                          variant={ButtonVariant.Ghost}
                          isSmall
                          onClick={() => setRemoving(null)}
                        >
                          {copy.cancel}
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      <form
        className="profiles-card__new"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <label className="profiles-card__field">
          <span className="profiles-card__label">{copy.newName}</span>
          <input
            className="profiles-card__input"
            value={newName}
            maxLength={80}
            autoCapitalize="words"
            onChange={(event) => setNewName(event.target.value)}
          />
        </label>
        <Button type="submit" isSmall disabled={!newName.trim()}>
          {copy.create}
        </Button>
        <label className="button button--ghost button--small profiles-card__import">
          {copy.import}
          <input
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(event) => void importFile(event)}
          />
        </label>
      </form>
      <p className="profiles-card__meta">{copy.importHint}</p>
      {status ? (
        <p className="profiles-card__status" role="status">
          {status}
        </p>
      ) : null}
    </Card>
  );
};
