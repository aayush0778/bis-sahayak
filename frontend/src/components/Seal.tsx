/** The hexagonal seal — a repeated geometric motif echoing the ISI device. */
export function HexSeal({
  children,
  className = "",
  tone = "navy",
}: {
  children?: React.ReactNode;
  className?: string;
  tone?: "navy" | "brass" | "ink";
}) {
  const fills = { navy: "#1E3A5F", brass: "#B8860B", ink: "#1C1B19" } as const;
  return (
    <svg viewBox="0 0 36 40" className={className} aria-hidden="true">
      <path
        d="M18 1 L34.5 10.5 L34.5 29.5 L18 39 L1.5 29.5 L1.5 10.5 Z"
        fill="none"
        stroke={fills[tone]}
        strokeWidth="2"
      />
      <path
        d="M18 6 L30 13 L30 27 L18 34 L6 27 L6 13 Z"
        fill="none"
        stroke={fills[tone]}
        strokeWidth="0.75"
        opacity="0.55"
      />
      {children ? (
        <text
          x="18"
          y="24.5"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontWeight="700"
          fontSize="12"
          fill={fills[tone]}
        >
          {children}
        </text>
      ) : null}
    </svg>
  );
}
