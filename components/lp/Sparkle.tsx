type SparkleProps = {
  className?: string;
  size?: number;
};

/** Sparkle de 4 pontas — elemento decorativo da marca Lume. */
export default function Sparkle({ className = "", size = 24 }: SparkleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 0C12.6 6.3 17.7 11.4 24 12C17.7 12.6 12.6 17.7 12 24C11.4 17.7 6.3 12.6 0 12C6.3 11.4 11.4 6.3 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
