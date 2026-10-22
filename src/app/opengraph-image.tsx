import { ImageResponse } from "next/og";

export const alt = "System Design Atlas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#FFFFFF", color: "#172033", borderTop: "16px solid #2563EB" }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: "#2563EB" }}>System Design Atlas</div>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1, marginTop: 24 }}>Learn System Design, Step by Step</div>
        <div style={{ fontSize: 30, color: "#64748B", marginTop: 24 }}>Clear tutorials with interactive workflow diagrams.</div>
      </div>
    ),
    size,
  );
}
