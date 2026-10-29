import { useEffect, useRef, useState } from 'react';

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface UseBrushCursorOptions {
  enabled: boolean;
  stiffness?: number;
  damping?: number;
  mass?: number;
  ringRadius?: number;
}

export function useBrushCursor({
  enabled,
  stiffness = 0.2,
  damping = 0.15,
  mass = 0.5,
  ringRadius = 24,
}: UseBrushCursorOptions) {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pointRef = useRef<Point>({ x: 0, y: 0, vx: 0, vy: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  // Check for prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!enabled || prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      setMousePos({ x: clientX, y: clientY });
    };

    const animate = () => {
      const point = pointRef.current;
      const dx = mousePos.x - point.x;
      const dy = mousePos.y - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Apply spring force
      const force = stiffness * distance;
      const ax = (force * dx) / (distance || 1) / mass;
      const ay = (force * dy) / (distance || 1) / mass;

      // Update velocity with damping
      point.vx = (point.vx + ax) * (1 - damping);
      point.vy = (point.vy + ay) * (1 - damping);

      // Update position
      point.x += point.vx;
      point.y += point.vy;

      // Update ring position
      if (ringRef.current) {
        ringRef.current.style.left = `${point.x - ringRadius}px`;
        ringRef.current.style.top = `${point.y - ringRadius}px`;
      }

      // Update dot position (follows more closely)
      if (dotRef.current) {
        dotRef.current.style.left = `${mousePos.x - 6}px`;
        dotRef.current.style.top = `${mousePos.y - 6}px`;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, mousePos, stiffness, damping, mass, ringRadius, prefersReducedMotion]);

  return { ringRef, dotRef };
}
