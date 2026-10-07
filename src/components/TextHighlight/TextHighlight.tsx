import type { BoundingBox } from '../../types/pdf';

interface TextHighlightProps {
  boxes: BoundingBox[];
  scale: number;
  color: string;
  opacity: number;
}

/**
 * Renders one <div> per bounding box, absolutely positioned over the PDF
 * canvas at the current zoom scale. Multiple boxes are used when a
 * dictation unit (sentence/paragraph) spans several visual lines.
 */
export function TextHighlight({ boxes, scale, color, opacity }: TextHighlightProps) {
  return (
    <>
      {boxes.map((box, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: box.x * scale,
            top: box.y * scale,
            width: box.width * scale,
            height: box.height * scale,
            backgroundColor: color,
            opacity,
            borderRadius: 3,
            pointerEvents: 'none',
            transition: 'left 0.15s ease, top 0.15s ease, width 0.15s ease, height 0.15s ease',
          }}
        />
      ))}
    </>
  );
}
