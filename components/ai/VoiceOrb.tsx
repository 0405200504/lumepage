'use client';

import React, { useEffect, useRef } from 'react';

export type OrbState = 'connecting' | 'ready' | 'listening' | 'thinking' | 'speaking' | 'muted';

/**
 * A esfera da conversa por voz: uma nuvem de partículas em forma de globo,
 * com três órbitas inclinadas em volta. Ela respira sozinha e cresce, treme
 * e acende com o volume — o da profissional enquanto ela fala, o da
 * assistente enquanto ela responde (getLevel, 0 a 1, lido a cada quadro).
 *
 * Canvas 2D puro: ~1.300 pontos por quadro, sem WebGL, roda liso no celular.
 */
export const VoiceOrb: React.FC<{
  size: number;
  state: OrbState;
  getLevel: () => number;
  /** Versão miniatura (pílula): menos pontos, sem órbitas. */
  compact?: boolean;
}> = ({ size, state, getLevel, compact = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const levelRef = useRef(getLevel);
  // O laço de desenho lê sempre o estado e o volume mais recentes.
  useEffect(() => {
    stateRef.current = state;
    levelRef.current = getLevel;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const R = size * (compact ? 0.3 : 0.27);
    const cx = size / 2;
    const cy = size / 2;

    // Globo: pontos espalhados por igual (espiral de Fibonacci).
    const N = compact ? 260 : 950;
    const globe: [number, number, number, number][] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      globe.push([Math.cos(th) * r, y, Math.sin(th) * r, Math.random() * Math.PI * 2]);
    }
    // Órbitas: três anéis inclinados, um pouco maiores que o globo.
    const rings = compact ? [] : [
      { tiltX: 1.15, tiltZ: 0.35, n: 150, r: 1.34, speed: 1 },
      { tiltX: 1.35, tiltZ: -0.6, n: 130, r: 1.24, speed: -1.3 },
      { tiltX: 0.55, tiltZ: 1.1, n: 120, r: 1.42, speed: 0.8 },
    ];
    // Estrelas de fundo, fixas.
    const stars = compact ? [] : Array.from({ length: 70 }, () => [Math.random() * size, Math.random() * size, Math.random() * 0.5 + 0.15] as const);

    let rot = 0;
    let lvl = 0;
    let raf = 0;
    const t0 = performance.now();

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      const st = stateRef.current;
      const target = Math.min(1, Math.max(0, levelRef.current() || 0));
      lvl += (target - lvl) * (target > lvl ? 0.35 : 0.08); // sobe rápido, desce devagar

      const speed = reduce ? 0.0006
        : st === 'thinking' ? 0.012
        : st === 'speaking' ? 0.007 + lvl * 0.01
        : st === 'connecting' ? 0.003
        : 0.0035 + lvl * 0.006;
      rot += speed;

      ctx.clearRect(0, 0, size, size);

      // Brilho de fundo: vinho que acende com a voz.
      const glowA = (st === 'connecting' ? 0.18 : st === 'muted' ? 0.12 : 0.32) + lvl * 0.45;
      const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.3);
      g.addColorStop(0, `rgba(196, 92, 116, ${glowA})`);
      g.addColorStop(0.45, `rgba(140, 36, 60, ${glowA * 0.55})`);
      g.addColorStop(1, 'rgba(60, 10, 24, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      for (const [sx, sy, a] of stars) {
        ctx.fillStyle = `rgba(251, 244, 232, ${a * (0.6 + 0.4 * Math.sin(t * 1.3 + sx))})`;
        ctx.fillRect(sx, sy, 1, 1);
      }

      const breathe = reduce ? 0 : Math.sin(t * 1.6) * 0.012;
      const radius = R * (1 + breathe + lvl * 0.13);
      const persp = R * 3.2;
      const cosR = Math.cos(rot), sinR = Math.sin(rot);
      const tilt = 0.35, cosT = Math.cos(tilt), sinT = Math.sin(tilt);
      const wob = reduce ? 0 : 0.03 + lvl * 0.16;
      const dot = compact ? 1.4 : 1.6;

      ctx.globalCompositeOperation = 'lighter';

      // Globo
      for (const [x0, y0, z0, ph] of globe) {
        const k = 1 + Math.sin(t * 3.1 + ph) * wob;
        let x = x0 * k, y = y0 * k, z = z0 * k;
        const x1 = x * cosR + z * sinR; const z1 = -x * sinR + z * cosR; x = x1; z = z1;
        const y2 = y * cosT - z * sinT; const z2 = y * sinT + z * cosT; y = y2; z = z2;
        const s = persp / (persp - z * radius);
        const px = cx + x * radius * s;
        const py = cy + y * radius * s;
        const depth = (z + 1) / 2; // 0 = fundo, 1 = frente
        ctx.fillStyle = `rgba(251, 240, 232, ${0.12 + depth * 0.7})`;
        ctx.fillRect(px, py, dot * s, dot * s);
      }

      // Órbitas
      for (const ring of rings) {
        const ct = Math.cos(ring.tiltX), stt = Math.sin(ring.tiltX);
        const cz = Math.cos(ring.tiltZ), sz = Math.sin(ring.tiltZ);
        const spin = rot * ring.speed * 1.6;
        for (let i = 0; i < ring.n; i++) {
          const a = (i / ring.n) * Math.PI * 2 + spin;
          const jitter = 1 + Math.sin(a * 7 + t * 2) * (0.015 + lvl * 0.05);
          let x = Math.cos(a) * ring.r * jitter, y = 0, z = Math.sin(a) * ring.r * jitter;
          const y1 = y * ct - z * stt; const z1 = y * stt + z * ct; y = y1; z = z1;
          const x2 = x * cz - y * sz; const y2 = x * sz + y * cz; x = x2; y = y2;
          const s = persp / (persp - z * radius);
          const depth = (z / ring.r + 1) / 2;
          ctx.fillStyle = `rgba(233, 184, 196, ${0.1 + depth * 0.55})`;
          ctx.fillRect(cx + x * radius * s, cy + y * radius * s, 1.3 * s, 1.3 * s);
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, compact]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} aria-hidden />;
};

export default VoiceOrb;
