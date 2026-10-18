'use client';

import type { ReactElement, ReactNode } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { Sheet } from '@/components/Sheet/Sheet';
import { IconName } from '@/enums/icon-name.enum';

import './SettingsRow.css';

interface SettingsRowProps {
  label: string;
  value?: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
}

/** iOS-style settings row: label, current value, chevron; the editor opens in a sheet. */
export const SettingsRow = ({
  label,
  value,
  isOpen,
  onOpen,
  onClose,
  children,
}: SettingsRowProps): ReactElement => (
  <li className="settings-row">
    <button type="button" className="settings-row__button" aria-haspopup="dialog" onClick={onOpen}>
      <span className="settings-row__label">{label}</span>
      {value ? <span className="settings-row__value">{value}</span> : null}
      <Icon name={IconName.ArrowRight} className="settings-row__chevron" />
    </button>
    <Sheet isOpen={isOpen} title={label} onClose={onClose}>
      <div className="settings-row__sheet">{children}</div>
    </Sheet>
  </li>
);
