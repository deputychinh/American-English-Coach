'use client';

import { type ReactElement, useEffect, useRef } from 'react';

import { useCopy } from '@/hooks/useCopy';
import type { Point2 } from '@/interfaces/mouth.interface';

import './LipOutlineCanvas.css';

interface LipOutlineCanvasProps {
  outline: Point2[];
  size: number;
}

/** Draws a normalised 40-point lip outline (outer 20, inner 20) centred in a square canvas. */
export const LipOutlineCanvas = ({ outline, size }: LipOutlineCanvasProps): ReactElement => {
  const copy = useCopy();
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, size, size);
    if (outline.length < 40) return;
    const scale = size * 1.4;
    const draw = (points: Point2[]): void => {
      context.beginPath();
      points.forEach((point, index) => {
        // Mirror horizontally so the learner sees the same orientation as in the camera panel.
        const x = size / 2 - point.x * scale;
        const y = size / 2 + point.y * scale;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
      context.stroke();
    };
    context.lineWidth = 2;
    context.strokeStyle = '#c2410c';
    draw(outline.slice(0, 20));
    context.strokeStyle = '#78716c';
    draw(outline.slice(20, 40));
  }, [outline, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className="lip-outline-canvas"
      role="img"
      aria-label={outline.length > 0 ? copy.mirror.lipOutline : copy.mirror.noMouth}
    />
  );
};
