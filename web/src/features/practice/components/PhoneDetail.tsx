import type { ReactElement } from 'react';

import { LipOutlineCanvas } from '@/features/mirror/components/LipOutlineCanvas';
import { TargetShape } from '@/features/mirror/components/TargetShape';
import { useCopy } from '@/hooks/useCopy';
import type { Copy } from '@/interfaces/copy.interface';
import type { Point2 } from '@/interfaces/mouth.interface';
import type { PhoneResult } from '@/interfaces/practice.interface';
import { verdictGlyph, verdictLabel } from '@/utils/verdict.util';

import './PhoneDetail.css';

interface PhoneDetailProps {
  phone: PhoneResult;
  outline: Point2[];
}

const heard = (phone: PhoneResult, copy: Copy): string | null => {
  if (phone.heard === '') return copy.practice.dropped;
  if (phone.heard === phone.symbol) return null;
  return `${copy.practice.heardAs} /${phone.heard_ipa}/`;
};

export const PhoneDetail = ({ phone, outline }: PhoneDetailProps): ReactElement => {
  const copy = useCopy();
  return (
    <div
      className="phone-detail"
      role="region"
      aria-live="polite"
      aria-label={copy.practice.phoneAria(phone.ipa)}
    >
      <div className="phone-detail__text">
        <p className="phone-detail__head">
          <span className="phone-detail__ipa">/{phone.ipa}/</span>
          <span className="phone-detail__verdict">
            {verdictGlyph(phone.verdict)} {verdictLabel(phone.verdict)}
          </span>
          {heard(phone, copy) ? (
            <span className="phone-detail__muted">{heard(phone, copy)}</span>
          ) : null}
        </p>
        {phone.hint_vi ? <p>{phone.hint_vi}</p> : null}
        {phone.mouth_tip_vi ? <p className="phone-detail__tip">{phone.mouth_tip_vi}</p> : null}
        <p className="phone-detail__muted">
          {(phone.start * 1000).toFixed(0)}–{(phone.end * 1000).toFixed(0)} ms · GOP{' '}
          {phone.gop.toFixed(2)}
        </p>
      </div>
      <div className="phone-detail__mouth">
        <figure className="phone-detail__figure">
          <LipOutlineCanvas outline={outline} size={120} />
          <figcaption className="phone-detail__muted">
            {outline.length > 0 ? copy.practice.mouthTitle : copy.practice.mouthUnavailable}
          </figcaption>
        </figure>
        <figure className="phone-detail__figure">
          <TargetShape group={phone.viseme_group} size={120} />
          <figcaption className="phone-detail__muted">
            {phone.viseme_group ? copy.practice.mouthTarget : copy.practice.mouthNotVisible}
          </figcaption>
        </figure>
      </div>
    </div>
  );
};
