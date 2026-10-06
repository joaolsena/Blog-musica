import React from "react";

// Marca do Ensine Música: uma colcheia dentro de um círculo vermelhão.
// O mesmo desenho é usado no favicon (public/favicon.svg).
export function LogoMark({ size = 32, className = "" }) {
  return (
    <svg
      className={`logo-mark${className ? ` ${className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" className="logo-mark__disc" />
      <g className="logo-mark__note">
        <ellipse cx="12.6" cy="21.2" rx="4.4" ry="3.2" transform="rotate(-24 12.6 21.2)" />
        <rect x="15.5" y="7.5" width="1.8" height="13.6" rx="0.9" />
        <path
          className="logo-mark__flag"
          d="M16.4 7.5c0 2.7 2.2 3.9 3.6 5.1 1.5 1.3 2.4 2.8 1.9 5.2-.1.6-.6.7-.7.1-.4-2-1.6-3.1-3-3.8-.8-.4-1.4-.6-1.8-.6z"
        />
      </g>
    </svg>
  );
}

function Logo({ size = 32 }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo__wordmark">
        Ensine <em>Música</em>
      </span>
    </span>
  );
}

export default Logo;
