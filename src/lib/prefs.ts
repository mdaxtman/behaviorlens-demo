import { uuid } from './id';
const DEVICE_KEY = 'bl_device';

/** Stable per-device id so each device's goal trial taps land in their own daily row. */
export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = uuid();
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}
