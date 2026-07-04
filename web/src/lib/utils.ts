import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export {
  competencyLabel,
  jobRoleLabel,
  companySizeLabel,
  formatPercentile,
  thetaToLevel,
  dimensionLabel,
} from "./labels";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
