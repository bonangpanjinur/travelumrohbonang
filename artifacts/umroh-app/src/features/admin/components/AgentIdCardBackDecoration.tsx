const DARK_GREEN = "#075c39";

export function AgentIdCardBackDecoration() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polygon points="0,0 42,0 0,16" fill={DARK_GREEN} />
    </svg>
  );
}