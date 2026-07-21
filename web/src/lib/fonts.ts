import { IBM_Plex_Sans_KR, Outfit } from "next/font/google";
import localFont from "next/font/local";

export const pretendard = localFont({
  src: "../fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
  preload: true,
});

export const ibmPlexSansKr = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
  display: "swap",
  preload: false,
});

export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
  preload: false,
});

export const fontVariables = `${pretendard.variable} ${ibmPlexSansKr.variable} ${outfit.variable}`;
