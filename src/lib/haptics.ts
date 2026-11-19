/** A short tap of vibration where the device supports it, so a recording is felt without looking. */
export function buzz(ms = 12): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not supported or not allowed: recording works the same without it.
  }
}
