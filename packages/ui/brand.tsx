import geometry from "./brand-geometry.json";

/** Selected 14C mark. Decorative beside the accessible product name. */
export function BrandMark({
  size = 28,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={geometry.viewBox}
      width={size}
      height={(size * 239) / 284}
      fill={color}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flexShrink: 0 }}
    >
      {geometry.paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
