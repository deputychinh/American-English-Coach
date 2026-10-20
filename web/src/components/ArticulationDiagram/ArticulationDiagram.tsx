'use client';

import type { ReactElement } from 'react';

import { ARTICULATION } from '@/constants/articulation.constant';
import { useCopy } from '@/hooks/useCopy';
import type { ArticulationFrame, ArticulationSpec } from '@/interfaces/articulation.interface';
import {
  isVowelSpec,
  jawShift,
  lipShift,
  mouthOpening,
  tonguePath,
  vowelFeatures,
} from '@/utils/articulation.util';
import { cx } from '@/utils/cx.util';

import './ArticulationDiagram.css';

interface ArticulationDiagramProps {
  soundId: string;
  /** Smaller drawing for cards. */
  isCompact?: boolean;
}

const AIR_MOUTH = 'M 138 178 C 134 140 110 116 70 110 L 18 106';
const AIR_NOSE = 'M 138 178 C 134 120 132 82 100 72 L 30 74';

const Face = ({ frame, isGhost }: { frame: ArticulationFrame; isGhost: boolean }): ReactElement => {
  const lips = lipShift(frame);
  return (
    <g className={cx('articulation-diagram__frame', isGhost && 'articulation-diagram__frame--end')}>
      <path
        className="articulation-diagram__velum"
        d={frame.isNasal ? 'M 112 84 C 120 90 124 100 122 108' : 'M 112 84 C 122 85 132 86 140 84'}
      />
      <path className="articulation-diagram__tongue" d={tonguePath(frame)} />
      <g transform={jawShift(frame)}>
        <path className="articulation-diagram__teeth" d="M 41 110 L 45 110 L 46 120 L 42 121 Z" />
        <path
          className="articulation-diagram__line"
          d="M 35 121 C 33 138 48 150 70 152 L 128 156"
        />
      </g>
      <path
        className="articulation-diagram__lip"
        transform={lips.upper}
        d="M 34 80 C 27 84 24 92 28 99 C 31 101 37 101 42 99"
      />
      <path
        className="articulation-diagram__lip"
        transform={lips.lower}
        d="M 28 104 C 25 110 27 118 35 121 C 39 123 43 122 46 120"
      />
    </g>
  );
};

const describe = (
  spec: ArticulationSpec,
  copy: ReturnType<typeof useCopy>['articulation'],
): string => {
  const [first, last] = [spec.frames[0], spec.frames.at(-1)];
  const voicing = spec.isVoiced ? copy.voiced : copy.voiceless;
  if (!first || !last) return '';
  if (isVowelSpec(spec)) {
    const start = vowelFeatures(first);
    const parts = [copy.height[start.height], copy.backness[start.backness], copy.lips[first.lips]];
    const glide = spec.frames.length > 1 ? ` ${copy.glide}` : '';
    return `${parts.join(', ')}.${glide}`;
  }
  const place = spec.place ? copy.place[spec.place] : '';
  return `${place}, ${copy.airflow[spec.airflow]}, ${voicing}.`;
};

/** Side view (tongue, lips, jaw, velum, voicing, airflow) and front view of one of the 44 sounds. */
export const ArticulationDiagram = ({
  soundId,
  isCompact = false,
}: ArticulationDiagramProps): ReactElement | null => {
  const copy = useCopy().articulation;
  const spec = ARTICULATION[soundId];
  const first = spec?.frames[0];
  if (!spec || !first) return null;
  const end = spec.frames.length > 1 ? spec.frames.at(-1) : undefined;
  const description = describe(spec, copy);
  const front = mouthOpening(first);
  const frontEnd = end ? mouthOpening(end) : null;
  return (
    <figure className={cx('articulation-diagram', isCompact && 'articulation-diagram--compact')}>
      <div className="articulation-diagram__views">
        <svg
          className="articulation-diagram__side"
          viewBox="10 48 140 148"
          role="img"
          aria-label={`${copy.side}: ${description}`}
        >
          <defs>
            <marker
              id={`air-${soundId}`}
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 10 0 L 0 5 L 10 10 z" className="articulation-diagram__arrowhead" />
            </marker>
          </defs>
          <path
            className="articulation-diagram__line"
            d="M 34 80 C 28 75 21 71 20 65 C 19 59 24 55 31 52"
          />
          <path className="articulation-diagram__line" d="M 36 78 C 52 66 96 62 140 70" />
          <path className="articulation-diagram__line" d="M 140 70 C 142 110 142 150 144 190" />
          <path
            className="articulation-diagram__palate"
            d="M 47 95 C 50 91 54 89 60 88 C 78 84 98 82 112 84"
          />
          <path className="articulation-diagram__teeth" d="M 42 95 L 47 95 L 45 106 L 41 106 Z" />
          <path
            className="articulation-diagram__air"
            d={spec.airflow === 'nose' ? AIR_NOSE : AIR_MOUTH}
            markerEnd={`url(#air-${soundId})`}
          />
          <Face frame={first} isGhost={false} />
          {end ? <Face frame={end} isGhost /> : null}
          {spec.contact ? (
            <circle
              className="articulation-diagram__contact"
              cx={spec.contact[0]}
              cy={spec.contact[1]}
              r={spec.airflow === 'burst' ? 4 : 3}
            />
          ) : null}
          <path
            className={cx(
              'articulation-diagram__glottis',
              spec.isVoiced && 'articulation-diagram__glottis--voiced',
            )}
            d={
              spec.isVoiced
                ? 'M 130 186 l 3 -4 l 3 4 l 3 -4 l 3 4 l 3 -4 l 3 4'
                : 'M 132 180 L 138 188 M 148 180 L 142 188'
            }
          />
        </svg>
        <svg
          className="articulation-diagram__front"
          viewBox="0 0 80 56"
          role="img"
          aria-label={`${copy.front}: ${copy.lips[first.lips]}`}
        >
          <ellipse
            className="articulation-diagram__mouth"
            cx="40"
            cy="28"
            rx={front.rx}
            ry={Math.max(front.ry, 0.8)}
          />
          {first.lips === 'labiodental' ? (
            <rect className="articulation-diagram__teeth" x="30" y="24" width="20" height="4" />
          ) : null}
          {frontEnd ? (
            <ellipse
              className="articulation-diagram__mouth articulation-diagram__mouth--end"
              cx="40"
              cy="28"
              rx={frontEnd.rx}
              ry={frontEnd.ry}
            />
          ) : null}
        </svg>
      </div>
      <figcaption className="articulation-diagram__caption">
        {description}
        {end ? <span className="articulation-diagram__legend"> {copy.legend}</span> : null}
      </figcaption>
    </figure>
  );
};
