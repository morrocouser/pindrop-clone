import { Link } from 'react-router-dom';

export function PinMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M16 2a9 9 0 0 0-9 9c0 7 9 19 9 19s9-12 9-19a9 9 0 0 0-9-9z" fill="var(--blue)" />
      <circle cx="16" cy="11" r="3.6" fill="#fff" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Pindrop, accueil">
      <PinMark />
      <span>pindrop</span>
    </Link>
  );
}
