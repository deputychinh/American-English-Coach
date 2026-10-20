export enum StorageKey {
  Theme = 'coach.theme',
  // v2: the practice camera now starts on for everyone; the old key held the opt-in default.
  CameraDefault = 'coach.camera.v2',
  Muted = 'coach.muted',
  Calibration = 'coach.calibration',
  ApiBaseUrl = 'coach.apiBaseUrl',
  DeviceToken = 'coach.deviceToken',
  DeviceName = 'coach.deviceName',
  OnDeviceScoring = 'coach.onDeviceScoring',
  ProfileId = 'coach.profileId',
  ProfileName = 'coach.profileName',
  DailyGoal = 'coach.dailyGoal',
  ReminderTime = 'coach.reminderTime',
  Language = 'coach.language',
  Onboarded = 'coach.onboarded',
  Listening = 'coach.listening',
  Placement = 'coach.placement',
}
