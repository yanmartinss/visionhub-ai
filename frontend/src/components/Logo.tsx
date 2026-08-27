function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      <path
        d="M20 3 34.6 11.5v17L20 37 5.4 28.5v-17Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="20" cy="20" r="7" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="1.75" fill="currentColor" />
    </svg>
  );
}

export default Logo;
