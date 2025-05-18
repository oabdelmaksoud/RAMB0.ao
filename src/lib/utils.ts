import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a unique ID string with an optional prefix.
 * Format: prefix-timestampInBase36-randomString
 * @param prefix - Optional prefix for the ID. Defaults to 'item'.
 * @returns A unique ID string.
 */
export const uid = (prefix: string = 'item'): string => {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
};