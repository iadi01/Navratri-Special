export function DiyaIcon({
  size = 24,
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
      {/* Traditional Diya clay bowl */}
      <path d="M4 14c0 4.4 3.6 7 8 7s8-2.6 8-7H4z" />
      {/* Base ring */}
      <path d="M9 21h6" />
      {/* Pure eternal flame */}
      <path d="M12 3c-1.8 2.8-2.5 4.8-2.5 6.8a2.5 2.5 0 0 0 5 0C14.5 7.8 13.8 5.8 12 3z" />
    </svg>
  );
}
