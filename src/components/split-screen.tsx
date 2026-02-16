import { useRef, useState, useLayoutEffect } from "react";

const separatorWidth = 4;

export function SplitScreen(props: {
  children: [React.ReactNode, React.ReactNode];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rightWidth, setRightWidth] = useState<number | null>(null);

  // Initialize right pane to 25% of container width
  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();

    if (rect.width > 0 && rightWidth === null) {
      setRightWidth(rect.width / 4);
    }
  }, [rightWidth]);

  function beginResize(e: React.PointerEvent<HTMLDivElement>) {
    const node = containerRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const minLeft = 200;
    const minRight = 260;

    const onMove = (ev: PointerEvent) => {
      const x = ev.clientX - rect.left; // position from container left
      let nextRight = rect.width - x - separatorWidth / 2;
      const maxRight = rect.width - separatorWidth - minLeft;
      if (Number.isFinite(nextRight)) {
        nextRight = Math.max(minRight, Math.min(nextRight, maxRight));
        setRightWidth(nextRight);
      }
    };

    const end = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  const rightPaneStyle =
    rightWidth !== null ? { width: rightWidth } : undefined;

  const handleStyle = { width: separatorWidth };

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1">
      <div className="flex min-w-[200px] flex-1">{props.children[0]}</div>
      <div
        className="shrink-0 cursor-col-resize bg-slate-400 hover:bg-cyan-500"
        style={handleStyle}
        onPointerDown={beginResize}
      />
      <div style={rightPaneStyle} className="flex min-w-[260px]">
        {props.children[1]}
      </div>
    </div>
  );
}
