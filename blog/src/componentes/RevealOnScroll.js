import React, { useEffect, useRef, useState } from "react";

// Revela o conteúdo com um leve fade + deslize ao entrar na tela.
// Usa IntersectionObserver e para de observar assim que revela uma vez.
function RevealOnScroll({ children, delay = 0, as: Tag = "div", className = "", ...resto }) {
  const ref = useRef(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return undefined;

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          observer.unobserve(elemento);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(elemento);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal${visivel ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
      style={{ transitionDelay: visivel ? `${delay}ms` : "0ms" }}
      {...resto}
    >
      {children}
    </Tag>
  );
}

export default RevealOnScroll;
