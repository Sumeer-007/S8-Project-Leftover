import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Mask phone for display (e.g. "+44 *** *** 1234") */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "*** *** ****"
  return "*** *** " + phone.slice(-4)
}
