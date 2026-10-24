import { useSyncExternalStore } from 'react';

import { InstallPlatform } from '@/enums/install-platform.enum';
import {
  hasInstallPrompt,
  subscribeInstallPrompt,
} from '@/features/install/services/install-prompt.service';
import { isNativeShell } from '@/utils/api-base.util';
import { currentInstallEnvironment, installPlatform } from '@/utils/install.util';

const snapshot = (): InstallPlatform =>
  isNativeShell()
    ? InstallPlatform.None
    : installPlatform(currentInstallEnvironment(), hasInstallPrompt());

/** How this browser can add the app to the home screen (none in the iOS app or once installed). */
export const useInstallOffer = (): InstallPlatform =>
  useSyncExternalStore(subscribeInstallPrompt, snapshot, () => InstallPlatform.None);
