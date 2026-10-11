export function LotusIcon({
  size = 16,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Sacred central petal */}
      <path d="M12 3c-1.8 3.5-2.7 7-2.7 10a2.7 2.7 0 0 0 5.4 0C14.7 10 13.8 6.5 12 3z" />
      {/* Left blossoming petal */}
      <path d="M9.3 13C7 10.5 4.5 10.5 3 12c-.5 2.5.5 5.5 3.5 6.5 1.5.5 2.5-.5 3-1.5" />
      {/* Right blossoming petal */}
      <path d="M14.7 13c2.3-2.5 4.8-2.5 6.3-1 .5 2.5-.5 5.5-3.5 6.5-1.5.5-2.5-.5-3-1.5" />
      {/* Lotus base pedestal */}
      <path d="M7 21c3-1 7-1 10 0" />
    </svg>
  );
}
