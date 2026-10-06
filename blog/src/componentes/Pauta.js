import React from "react";

// Pauta musical decorativa (cinco linhas) — o motivo visual do site.
// As linhas se desenham da esquerda para a direita e as notas surgem
// em sequência, como uma melodia sendo escrita.

// Posição das notas: x em % da largura, "linha" de 0 (linha de baixo) a 8 (linha de cima),
// contando linhas e espaços. Desenha uma frase ascendente que resolve na tônica.
const MELODIA = [
  { x: 8, linha: 0 },
  { x: 18, linha: 2 },
  { x: 28, linha: 4 },
  { x: 38, linha: 3 },
  { x: 48, linha: 5 },
  { x: 58, linha: 7 },
  { x: 68, linha: 6 },
  { x: 78, linha: 4 },
  { x: 90, linha: 8 },
];

const ESPACO = 10; // distância entre as linhas da pauta
const ALTURA = ESPACO * 4;
const MARGEM = 14;

function Pauta({ notas = true, className = "" }) {
  const largura = 600;
  const alturaTotal = ALTURA + MARGEM * 2;

  return (
    <svg
      className={`pauta${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${largura} ${alturaTotal}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <line
          key={index}
          className="pauta__linha"
          x1="0"
          x2={largura}
          y1={MARGEM + index * ESPACO}
          y2={MARGEM + index * ESPACO}
          pathLength="1"
          style={{ animationDelay: `${index * 70}ms` }}
        />
      ))}

      {notas &&
        MELODIA.map((nota, index) => {
          const cx = (nota.x / 100) * largura;
          const cy = MARGEM + ALTURA - nota.linha * (ESPACO / 2);
          const hasteParaBaixo = nota.linha >= 4;
          return (
            <g
              key={index}
              className="pauta__nota"
              style={{ animationDelay: `${420 + index * 70}ms`, transformOrigin: `${cx}px ${cy}px` }}
            >
              <ellipse cx={cx} cy={cy} rx="7" ry="5" transform={`rotate(-22 ${cx} ${cy})`} />
              <line
                x1={hasteParaBaixo ? cx - 6.4 : cx + 6.4}
                x2={hasteParaBaixo ? cx - 6.4 : cx + 6.4}
                y1={cy}
                y2={hasteParaBaixo ? cy + 30 : cy - 30}
              />
            </g>
          );
        })}
    </svg>
  );
}

export default Pauta;
