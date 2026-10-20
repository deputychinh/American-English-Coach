'use client';

import { type ReactElement, useEffect, useState } from 'react';

import { pitchContours } from '@/features/practice/services/pitch-contour.service';
import { useCopy } from '@/hooks/useCopy';
import type { ContourEnding, PitchContours } from '@/interfaces/contour.interface';
import { contourEnding, contourPath } from '@/utils/contour.util';

import './PitchCompare.css';

interface PitchCompareProps {
  text: string;
  recording: Blob;
}

const BOX = { width: 300, height: 96 };

/** The model's and the learner's pitch on one time axis, with the ending put into words. */
export const PitchCompare = ({ text, recording }: PitchCompareProps): ReactElement => {
  const copy = useCopy();
  const [contours, setContours] = useState<PitchContours | null>(null);

  useEffect(() => {
    let isActive = true;
    pitchContours(text, recording)
      .then((value) => {
        if (isActive) setContours(value);
      })
      .catch(() => {
        if (isActive) setContours({ learner: [], model: null });
      });
    return () => {
      isActive = false;
    };
  }, [text, recording]);

  const word = (ending: ContourEnding | null): string => (ending ? copy.contour[ending] : '');
  const youEnding = contours ? contourEnding(contours.learner) : null;
  const modelEnding = contours?.model ? contourEnding(contours.model) : null;
  let description = copy.contour.loading;
  if (contours && contours.learner.length === 0) description = copy.contour.unclear;
  else if (contours && youEnding && modelEnding) {
    description = `${copy.contour.compare(word(modelEnding), word(youEnding))} ${
      modelEnding === youEnding ? copy.contour.match : copy.contour.mismatch
    }`;
  } else if (contours && youEnding) description = copy.contour.youOnly(word(youEnding));

  return (
    <figure className="pitch-compare">
      <figcaption className="pitch-compare__title">{copy.contour.title}</figcaption>
      <svg
        className="pitch-compare__chart"
        viewBox={`0 0 ${String(BOX.width)} ${String(BOX.height)}`}
        role="img"
        aria-label={description}
        preserveAspectRatio="none"
      >
        <line
          className="pitch-compare__axis"
          x1="0"
          x2={BOX.width}
          y1={BOX.height / 2}
          y2={BOX.height / 2}
        />
        {contours?.model ? (
          <path
            className="pitch-compare__line pitch-compare__line--model"
            d={contourPath(contours.model, BOX)}
          />
        ) : null}
        {contours ? (
          <path
            className="pitch-compare__line pitch-compare__line--you"
            d={contourPath(contours.learner, BOX)}
          />
        ) : null}
      </svg>
      <div className="pitch-compare__legend" aria-hidden="true">
        {contours?.model ? (
          <span className="pitch-compare__key pitch-compare__key--model">{copy.contour.model}</span>
        ) : null}
        <span className="pitch-compare__key pitch-compare__key--you">{copy.contour.you}</span>
      </div>
      <p className="pitch-compare__text" aria-live="polite">
        {description}
      </p>
      <p className="pitch-compare__hint">{copy.contour.hint}</p>
    </figure>
  );
};
