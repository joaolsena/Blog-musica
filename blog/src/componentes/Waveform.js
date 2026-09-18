import React from "react";

// Pequena forma de onda decorativa — o motivo sonoro usado como
// divisor de seção em todo o site, no lugar de uma linha simples.
const ALTURAS = [7, 15, 23, 11, 19, 27, 13, 21, 9, 17];

function Waveform({ className = "" }) {
  return (
    <svg
      className={`waveform${className ? ` ${className}` : ""}`}
      viewBox="0 0 120 28"
      preserveAspectRatio="xMinYMid meet"
      aria-hidden="true"
    >
      {ALTURAS.map((altura, index) => (
        <rect key={index} x={index * 12} y={(28 - altura) / 2} width="6" height={altura} rx="3" />
      ))}
    </svg>
  );
}

export default Waveform;
