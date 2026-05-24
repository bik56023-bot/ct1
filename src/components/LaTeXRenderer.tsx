import { useEffect, useState, useRef } from "react";

interface LaTeXRendererProps {
  text: string;
  block?: boolean;
}

// Global flag to track CDN injection status
let katexLoaded = false;
let katexLoadingPromise: Promise<void> | null = null;

function ensureKaTeX(): Promise<void> {
  if (katexLoaded) return Promise.resolve();
  if (typeof window !== "undefined" && (window as any).katex) {
    katexLoaded = true;
    return Promise.resolve();
  }

  if (katexLoadingPromise) return katexLoadingPromise;

  katexLoadingPromise = new Promise<void>((resolve) => {
    if (typeof document === "undefined") {
      resolve();
      return;
    }

    // 1. Inject KaTeX CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);

    // 2. Inject KaTeX JS
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      katexLoaded = true;
      resolve();
    };
    script.onerror = () => {
      console.warn("Failed to load KaTeX from CDN, falling back to basic styling.");
      resolve();
    };
    document.body.appendChild(script);
  });

  return katexLoadingPromise;
}

export default function LaTeXRenderer({ text, block = false }: LaTeXRendererProps) {
  const [loaded, setLoaded] = useState(katexLoaded);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    ensureKaTeX().then(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loaded && containerRef.current && (window as any).katex) {
      try {
        const katexObj = (window as any).katex;
        // Search and render all formulas in this container
        const rawContent = text || "";
        
        // Simple regex split to render mathematical blocks correctly
        // Supports: $...$, $$...$$, \[...\]
        const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\])/g;
        const parts = rawContent.split(regex);
        
        containerRef.current.innerHTML = "";
        
        parts.forEach((part) => {
          if (!part) return;
          
          let isMath = false;
          let formula = part;
          let isDisplayMode = false;

          if (part.startsWith("$$") && part.endsWith("$$")) {
            isMath = true;
            formula = part.slice(2, -2);
            isDisplayMode = true;
          } else if (part.startsWith("$") && part.endsWith("$")) {
            isMath = true;
            formula = part.slice(1, -1);
          } else if (part.startsWith("\\[") && part.endsWith("\\]")) {
            isMath = true;
            formula = part.slice(2, -2);
            isDisplayMode = true;
          }

          if (isMath) {
            const mathSpan = document.createElement("span");
            try {
              katexObj.render(formula.trim(), mathSpan, {
                displayMode: isDisplayMode,
                throwOnError: false,
                trust: true
              });
            } catch (err) {
              mathSpan.className = "font-mono px-1 py-0.5 bg-amber-50 rounded text-amber-800 text-xs italic break-all";
              mathSpan.textContent = part;
            }
            containerRef.current?.appendChild(mathSpan);
          } else {
            const textSpan = document.createElement("span");
            // Standard text can have line breaks
            textSpan.className = "whitespace-pre-wrap leading-relaxed";
            textSpan.textContent = part;
            containerRef.current?.appendChild(textSpan);
          }
        });
      } catch (e) {
        console.error("Renderer error", e);
      }
    }
  }, [text, loaded]);

  if (!loaded) {
    // Elegant fallback styling when network is waiting or KaTeX is offline
    return (
      <div className="whitespace-pre-wrap leading-relaxed font-sans" style={{ contentVisibility: "auto" }}>
        {text}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`inline-block w-full text-gray-800 font-sans tracking-wide leading-relaxed ${block ? "my-2" : ""}`}
    />
  );
}
