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
