/**
 * AXHRD Logo Components
 *
 * Uses `currentColor` for outline — theme with `color` on wrapper or `color` prop.
 */

import * as React from "react";

export interface LogoProps extends Omit<React.SVGProps<SVGSVGElement>, "color"> {
  /** Height in px. Width auto-scales. Default: 32 */
  size?: number;
  /** Outline / wordmark color. Default: currentColor (inherits) */
  color?: string;
  /** Signal (dot center) color. Default: #0066FF */
  signal?: string;
  /** 'primary' shows the signal-blue dot. 'mono' uses `color` for everything. */
  variant?: "primary" | "mono";
  /** Ally label. Default: 'AXHRD' */
  title?: string;
}

/** Horizontal signature: symbol + AXHRD wordmark. */
export const Logo: React.FC<LogoProps> = ({
  size = 32,
  color = "currentColor",
  signal = "#0066FF",
  variant = "primary",
  title = "AXHRD",
  ...rest
}) => {
  const dotFill = variant === "mono" ? color : signal;
  const width = size * 3.5;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 560 160"
      width={width}
      height={size}
      fill="none"
      role="img"
      aria-label={title}
      {...rest}
    >
      <title>{title}</title>
      <g stroke={color} strokeWidth={8} fill="none">
        <path d="M 80 16 L 80 80 L 24 48" />
        <path d="M 142 48 L 80 80 L 142 112" />
        <path d="M 80 80 L 24 112 L 80 144" />
        <path d="M 80 80 L 80 144 L 142 112" />
        <path d="M 80 80 L 142 48 L 80 16" />
        <path d="M 80 80 L 24 48 L 24 112" />
      </g>
      <circle cx="80" cy="80" r="70" stroke={color} strokeWidth={6} fill="none" opacity={0.35} />
      <circle cx="80" cy="80" r="16" fill={dotFill} />
      <text
        x="190"
        y="112"
        fill={color}
        fontFamily="Inter, -apple-system, 'Segoe UI', sans-serif"
        fontWeight={500}
        fontSize={112}
        letterSpacing={-6}
      >
        AXHRD
      </text>
    </svg>
  );
};

/** Symbol only (aperture). Square. */
export const LogoMark: React.FC<LogoProps> = ({
  size = 40,
  color = "currentColor",
  signal = "#0066FF",
  variant = "primary",
  title = "AXHRD",
  ...rest
}) => {
  const dotFill = variant === "mono" ? color : signal;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label={title}
      {...rest}
    >
      <title>{title}</title>
      <g stroke={color} strokeWidth={8} fill="none">
        <path d="M 100 20 L 100 100 L 30 60" />
        <path d="M 178 60 L 100 100 L 178 140" />
        <path d="M 100 100 L 30 140 L 100 180" />
        <path d="M 100 100 L 100 180 L 178 140" />
        <path d="M 100 100 L 178 60 L 100 20" />
        <path d="M 100 100 L 30 60 L 30 140" />
      </g>
      <circle cx="100" cy="100" r="88" stroke={color} strokeWidth={6} fill="none" opacity={0.35} />
      <circle cx="100" cy="100" r="20" fill={dotFill} />
    </svg>
  );
};

/** Wordmark only. No symbol. */
export const LogoWordmark: React.FC<Omit<LogoProps, "signal" | "variant">> = ({
  size = 32,
  color = "currentColor",
  title = "AXHRD",
  ...rest
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 370 130"
    width={size * (370 / 130)}
    height={size}
    fill={color}
    role="img"
    aria-label={title}
    {...rest}
  >
    <title>{title}</title>
    <text
      x="0"
      y="112"
      fontFamily="Inter, -apple-system, 'Segoe UI', sans-serif"
      fontWeight={500}
      fontSize={112}
      letterSpacing={-6}
    >
      AXHRD
    </text>
  </svg>
);

export default Logo;
