import { useRef, useState, useLayoutEffect } from "react";
import type { ReactNode } from "react";

/** Scale only physical signage; application text retains native CSS sizing. */
export function PhysicalFrame({
  portrait,
  children,
}: {
  portrait: boolean;
  children: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const referenceWidth = portrait ? 1080 : 1920;
  const referenceHeight = portrait ? 1920 : 1080;
  useLayoutEffect(() => {
    const el = host.current!;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [portrait]);
  return (
    <div
      ref={host}
      className={`physical-frame ${portrait ? "portrait-frame" : "landscape-frame"}`}
      style={{ aspectRatio: `${referenceWidth}/${referenceHeight}` }}
      data-reference-width={referenceWidth}
      data-reference-height={referenceHeight}
    >
      <div
        className={`physical-canvas ${portrait ? "player-portrait" : "player-landscape"}`}
        style={{
          width: referenceWidth,
          height: referenceHeight,
          transform: `scale(${width / referenceWidth})`,
          visibility: width ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
