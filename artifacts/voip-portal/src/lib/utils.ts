import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatZar(amount: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('ZAR', 'R');
}

export const PROVINCES = [
  "Western Cape",
  "Eastern Cape",
  "Northern Cape",
  "KwaZulu-Natal",
  "Gauteng",
  "Limpopo",
  "Mpumalanga",
  "Free State",
  "North West"
];
