export type PermissionOutcome = 'granted' | 'denied' | 'missing';

export interface MediaPermissions {
  microphone: PermissionOutcome;
  camera: PermissionOutcome;
}
