/** A third-party component that ships inside the app, and the licence it comes under. */
export interface ThirdPartyNotice {
  name: string;
  author: string;
  license: string;
  url: string;
  /** What the app uses it for, per interface language. */
  use: { vi: string; en: string };
}
