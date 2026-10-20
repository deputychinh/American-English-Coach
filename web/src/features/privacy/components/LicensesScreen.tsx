'use client';

import type { ReactElement } from 'react';

import { Card } from '@/components/Card/Card';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { MODEL_NOTICE, THIRD_PARTY_NOTICES } from '@/constants/licenses.constant';
import { Language } from '@/enums/language.enum';
import { useCopy, useLanguage } from '@/hooks/useCopy';

import './PrivacyScreen.css';

/** Third-party components and their licences, plus the AI voice disclosure. */
export const LicensesScreen = (): ReactElement => {
  const copy = useCopy().licenses;
  const language = useLanguage();
  return (
    <div className="privacy-screen">
      <PageIntro title={copy.title} lead={copy.lead} />
      <Card as="section" aria-label={copy.voiceTitle} className="privacy-screen__card">
        <h2 className="privacy-screen__heading">{copy.voiceTitle}</h2>
        <p className="privacy-screen__text">{copy.voiceBody}</p>
      </Card>
      {THIRD_PARTY_NOTICES.map((notice) => (
        <Card
          as="section"
          key={notice.name}
          aria-label={notice.name}
          className="privacy-screen__card"
        >
          <h2 className="privacy-screen__heading">{notice.name}</h2>
          <p className="privacy-screen__text">
            {notice.author} · {notice.license}
          </p>
          <p className="privacy-screen__text">
            {language === Language.En ? notice.use.en : notice.use.vi}
          </p>
          <a className="privacy-screen__text" href={notice.url} target="_blank" rel="noreferrer">
            {notice.url}
          </a>
        </Card>
      ))}
      <Card as="section" aria-label={copy.noticeTitle} className="privacy-screen__card">
        <h2 className="privacy-screen__heading">{copy.noticeTitle}</h2>
        <p className="privacy-screen__text">{MODEL_NOTICE}</p>
      </Card>
    </div>
  );
};
