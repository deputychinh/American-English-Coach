import { expect, type Page } from '@playwright/test';

/**
 * Records every reference-clip response of the page. Call before the screen loads, then
 * `expectModelVoice` after tapping play: at least one clip came back and none failed (in phone
 * mode a missing token shows up here as a 401).
 */
export const watchModelVoice = (page: Page): number[] => {
  const statuses: number[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/v1/audio')) statuses.push(response.status());
  });
  return statuses;
};

export const expectModelVoice = async (page: Page, statuses: number[]): Promise<void> => {
  await expect.poll(() => statuses.length).toBeGreaterThan(0);
  expect(statuses.filter((status) => status !== 200)).toEqual([]);
  await expect(page.getByText(/phát được giọng mẫu/)).toHaveCount(0);
};
