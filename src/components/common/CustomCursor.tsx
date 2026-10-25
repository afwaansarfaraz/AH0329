import { useEffect, useRef, useState } from 'react';

/**
 * Premium, subtle animated custom cursor for WindDesk.
 * 
 * Features:
 * - Electric-teal (#26D9C4) precision dot with luminous aura.
 * - Soft navy-compatible trailing ring using damped spring/lerp physics via requestAnimationFrame.
 * - Restrained interactive hover effect on buttons, links, selects, and cards.
 * - Preserves native cursor and fades out on text inputs, textareas, and contenteditable elements.
 * - Automatically disables on touch devices, coarse pointers, and when prefers-reduced-motion is active.
 * - Zero layout shift, GPU-accelerated translate3d transforms, pointer-events: none.
 */
export function CustomCursor() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isInputHover, setIsInputHover] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Coordinates refs for fluid RAF animation without React re-render overhead
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const dotPos = useRef({ x: -100, y: -100 });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // 1. Accessibility & Device Checks
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isTouch || prefersReducedMotion) {
      setIsEnabled(false);
      return;
    }

    setIsEnabled(true);

    // 2. Mouse Movement & Interaction Handlers
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      if (!isVisible) {
        setIsVisible(true);
        // Snap immediately on first entrance
        dotPos.current = { x: e.clientX, y: e.clientY };
        ringPos.current = { x: e.clientX, y: e.clientY };
      }

      // Check hovered element
      const target = e.target as HTMLElement | null;
      if (target) {
        // Text input / editable detection: preserve native text I-beam
        const isEditable =
          target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'range' && (target as HTMLInputElement).type !== 'checkbox' && (target as HTMLInputElement).type !== 'radio' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          window.getComputedStyle(target).cursor === 'text';

        setIsInputHover(Boolean(isEditable));

        // Interactive element detection: buttons, links, selects, tabs, cards
        const isInteractive = Boolean(
          target.closest('button, a, select, [role="button"], input[type="range"], .card-interactive, .nav-item')
        );
        setIsHovering(isInteractive);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // 3. Smooth Damped RAF Animation Loop
    const animate = () => {
      // Lerp ring towards mouse target: 18% per frame (~60-120fps smooth follow)
      const lerp = 0.18;
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * lerp;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * lerp;

      // Precision dot snaps directly with ultra-low damping
      dotPos.current.x = mousePos.current.x;
      dotPos.current.y = mousePos.current.y;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dotPos.current.x}px, ${dotPos.current.y}px, 0)`;
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isVisible]);

  if (!isEnabled) {
    return null;
  }

  // Ring dimension transitions
  const ringSize = isHovering ? 38 : isClicking ? 22 : 28;
  const ringOffset = ringSize / 2;
  const dotSize = isHovering ? 7 : isClicking ? 4 : 5.5;
  const dotOffset = dotSize / 2;

  // Fade out custom cursor when hovering inputs so native text cursor has 100% clarity
  const cursorOpacity = isVisible && !isInputHover ? 1 : 0;

  return (
    <>
      {/* Outer Glow & Trailing Ring */}
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${ringSize}px`,
          height: `${ringSize}px`,
          marginTop: `-${ringOffset}px`,
          marginLeft: `-${ringOffset}px`,
          borderRadius: '50%',
          border: isHovering
            ? '1.5px solid rgba(13, 148, 136, 0.75)'
            : '1px solid rgba(13, 148, 136, 0.3)',
          backgroundColor: isHovering
            ? 'rgba(13, 148, 136, 0.12)'
            : 'rgba(13, 148, 136, 0.04)',
          boxShadow: isHovering
            ? '0 0 16px rgba(13, 148, 136, 0.35), inset 0 0 8px rgba(13, 148, 136, 0.15)'
            : '0 0 10px rgba(13, 148, 136, 0.12)',
          pointerEvents: 'none',
          zIndex: 99998,
          opacity: cursorOpacity,
          transition: 'width 200ms cubic-bezier(0.16, 1, 0.3, 1), height 200ms cubic-bezier(0.16, 1, 0.3, 1), margin 200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms ease, background-color 200ms ease, box-shadow 200ms ease, opacity 180ms ease',
          willChange: 'transform',
        }}
      />

      {/* Center Precision Primary Teal Dot */}
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          marginTop: `-${dotOffset}px`,
          marginLeft: `-${dotOffset}px`,
          borderRadius: '50%',
          backgroundColor: '#0D9488',
          boxShadow: isHovering
            ? '0 0 6px #0D9488, 0 0 12px rgba(13, 148, 136, 0.7)'
            : '0 0 4px #0D9488, 0 0 8px rgba(13, 148, 136, 0.4)',
          pointerEvents: 'none',
          zIndex: 99999,
          opacity: cursorOpacity,
          transition: 'width 150ms ease, height 150ms ease, margin 150ms ease, box-shadow 200ms ease, opacity 150ms ease',
          willChange: 'transform',
        }}
      />
    </>
  );
}
