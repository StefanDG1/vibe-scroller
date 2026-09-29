import { ImageResponse } from "next/og";
import { company } from "@companynerve/company-config";
export const alt = company.product.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 75,
        width: "100%",
        height: "100%",
        background: "#f7f9fc",
        color: "#182331",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, color: "#2456d8" }}>
        {company.product.name}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 72,
          lineHeight: 1.1,
          maxWidth: 950,
        }}
      >
        {company.website.kind === "template"
          ? "A free foundation for your next SaaS."
          : "A workspace for work that matters."}
      </div>
      <div style={{ display: "flex", fontSize: 26 }}>
        {company.website.kind === "template"
          ? "MIT licensed. Your own product."
          : company.website.url}
      </div>
    </div>,
    size,
  );
}
