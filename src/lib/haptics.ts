export async function selectionHaptic(): Promise<void> {
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.selectionAsync();
  } catch {
    // Haptics are best-effort and may be unavailable in old dev clients/simulators.
  }
}

export async function lightImpactHaptic(): Promise<void> {
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics are best-effort and may be unavailable in old dev clients/simulators.
  }
}

export async function notificationSuccessHaptic(): Promise<void> {
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics are best-effort and may be unavailable in old dev clients/simulators.
  }
}

export async function notificationErrorHaptic(): Promise<void> {
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Haptics are best-effort and may be unavailable in old dev clients/simulators.
  }
}
