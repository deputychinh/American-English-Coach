import { nativeShareFile } from '@/utils/native.util';

/** Hand a text file to the learner: a download on the web, the share sheet inside the iOS app. */
export const saveTextFile = async (name: string, text: string, mime: string): Promise<void> => {
  if (await nativeShareFile(name, text)) return;
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Read a learner-picked file as text (empty string when nothing was picked). */
export const readPickedFile = (file: File | null | undefined): Promise<string> =>
  file ? file.text() : Promise.resolve('');
