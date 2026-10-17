'use client';

import type { ReactElement } from 'react';

import { VisemeGroup } from '@/api/coach.schema';
import { useCopy } from '@/hooks/useCopy';
import './TargetShape.css';

interface TargetShapeProps {
  group: VisemeGroup | null;
  size: number;
}

/** Schematic lips (front view) per viseme group: outer lip path, inner opening, teeth/tongue cues. */
const SHAPES: Record<VisemeGroup, { outer: string; inner: string; extra?: string }> = {
  [VisemeGroup.V1]: { outer: 'M20 60 Q60 48 100 60 Q60 72 20 60 Z', inner: 'M30 60 L90 60' },
  [VisemeGroup.V2]: {
    outer: 'M22 56 Q60 42 98 56 Q60 74 22 56 Z',
    inner: 'M36 56 Q60 52 84 56 Q60 60 36 56 Z',
    extra: 'M40 56 L80 56 M44 56 L44 62 M52 56 L52 63 M60 56 L60 63 M68 56 L68 63 M76 56 L76 62',
  },
  [VisemeGroup.V3]: {
    outer: 'M22 56 Q60 40 98 56 Q60 78 22 56 Z',
    inner: 'M36 56 Q60 48 84 56 Q60 66 36 56 Z',
    extra: 'M50 62 Q60 54 70 62 Q60 68 50 62 Z',
  },
  [VisemeGroup.V4]: {
    outer: 'M36 60 Q60 34 84 60 Q60 86 36 60 Z',
    inner: 'M50 60 Q60 50 70 60 Q60 70 50 60 Z',
  },
  [VisemeGroup.V5]: {
    outer: 'M30 58 Q60 38 90 58 Q60 80 30 58 Z',
    inner: 'M44 58 Q60 50 76 58 Q60 66 44 58 Z',
    extra: 'M46 58 L74 58',
  },
  [VisemeGroup.V6]: {
    outer: 'M14 60 Q60 46 106 60 Q60 72 14 60 Z',
    inner: 'M26 60 Q60 55 94 60 Q60 65 26 60 Z',
  },
  [VisemeGroup.V7]: {
    outer: 'M24 50 Q60 30 96 50 Q60 100 24 50 Z',
    inner: 'M36 52 Q60 40 84 52 Q60 86 36 52 Z',
  },
  [VisemeGroup.V8]: {
    outer: 'M18 58 Q60 44 102 58 Q60 76 18 58 Z',
    inner: 'M32 58 Q60 52 88 58 Q60 66 32 58 Z',
    extra: 'M40 58 L80 58',
  },
  [VisemeGroup.V9]: {
    outer: 'M26 54 Q60 36 94 54 Q60 88 26 54 Z',
    inner: 'M40 56 Q60 46 80 56 Q60 74 40 56 Z',
  },
  [VisemeGroup.V10]: {
    outer: 'M32 56 Q60 36 88 56 Q60 84 32 56 Z',
    inner: 'M46 56 Q60 48 74 56 Q60 70 46 56 Z',
  },
  [VisemeGroup.V11]: {
    outer: 'M24 56 Q60 42 96 56 Q60 78 24 56 Z',
    inner: 'M38 56 Q60 50 82 56 Q60 66 38 56 Z',
    extra: 'M52 56 Q60 52 68 56',
  },
  [VisemeGroup.V12]: {
    outer: 'M24 56 Q60 40 96 56 Q60 82 24 56 Z',
    inner: 'M38 56 Q60 48 82 56 Q60 70 38 56 Z',
  },
};

export const TargetShape = ({ group, size }: TargetShapeProps): ReactElement => {
  const copy = useCopy();
  const shape = group ? SHAPES[group] : null;
  return (
    <svg
      className="target-shape"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={group ? copy.mirror.targetAria(group) : copy.mirror.noTarget}
    >
      {shape ? (
        <>
          <path className="target-shape__outer" d={shape.outer} />
          <path className="target-shape__inner" d={shape.inner} />
          {shape.extra ? <path className="target-shape__extra" d={shape.extra} /> : null}
        </>
      ) : (
        <text className="target-shape__text" x="60" y="66" textAnchor="middle">
          —
        </text>
      )}
    </svg>
  );
};
