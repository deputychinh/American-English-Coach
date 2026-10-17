'use client';

import type { ReactElement } from 'react';

import { Card } from '@/components/Card/Card';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { useCopy } from '@/hooks/useCopy';

import './PrivacyScreen.css';

/** The privacy policy as a page (App Store needs a public URL; the same text ships in docs/release). */
export const PrivacyScreen = (): ReactElement => {
  const copy = useCopy().privacy;
  return (
    <div className="privacy-screen">
      <PageIntro title={copy.title} lead={copy.updated} />
      {copy.sections.map((section) => (
        <Card
          as="section"
          key={section.heading}
          aria-label={section.heading}
          className="privacy-screen__card"
        >
          <h2 className="privacy-screen__heading">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="privacy-screen__text">
              {paragraph}
            </p>
          ))}
        </Card>
      ))}
    </div>
  );
};
