type Rect = { left: number; top: number; width: number; height: number };

type AnnotateOptions = {
  /** Bounding box of the selected element, in CSS pixels (viewport-relative). */
  rect: Rect | null;
  /** Click position, in CSS pixels (viewport-relative). */
  click: { x: number; y: number } | null;
  /** Widget accent colour, used for the highlight and the pin. */
  color: string;
  /** CSS width of the viewport the screenshot was taken from, for scaling. */
  viewportWidth: number;
};

/**
 * Burns the reviewer's selection into the screenshot: a highlight box around
 * the clicked element and a pin at the click point. The image is what ends up
 * in the inbox, in GitHub/Jira/Linear issues, in Slack, and in front of the
 * coding agent via MCP, so the marker has to travel with it.
 *
 * Returns the original blob untouched if anything goes wrong.
 */
export async function annotateScreenshot(
  screenshot: Blob,
  { rect, click, color, viewportWidth }: AnnotateOptions,
): Promise<Blob> {
  if (!rect && !click) return screenshot;
  if (typeof document === "undefined") return screenshot;

  try {
    const image = await loadImage(screenshot);
    const scale = viewportWidth > 0 ? image.width / viewportWidth : 1;

    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return screenshot;

    ctx.drawImage(image, 0, 0);

    if (rect && rect.width > 0 && rect.height > 0) {
      const pad = 4 * scale;
      const x = rect.left * scale - pad;
      const y = rect.top * scale - pad;
      const w = rect.width * scale + pad * 2;
      const h = rect.height * scale + pad * 2;

      // Dim everything except the selected element so it reads at a glance.
      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      roundedRect(ctx, x, y, w, h, 6 * scale);
      ctx.fill("evenodd");
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 * scale;
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 6 * scale;
      ctx.beginPath();
      roundedRect(ctx, x, y, w, h, 6 * scale);
      ctx.stroke();
      ctx.restore();
    }

    if (click) {
      const cx = click.x * scale;
      const cy = click.y * scale;
      const r = 11 * scale;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 8 * scale;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx, cy, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    return out ?? screenshot;
  } catch {
    return screenshot;
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}
