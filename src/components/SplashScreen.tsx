interface Props {
  visible: boolean;
}

export default function SplashScreen({ visible }: Props) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none pointer-events-none"
      style={{
        background: "radial-gradient(ellipse at 50% 35%, #1E4D33 0%, #0C1F16 100%)",
        opacity: visible ? 1 : 0,
        transition: "opacity 500ms ease-out",
      }}
    >
      {/* Logo */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1024 1024"
        width="96"
        height="96"
        style={{ borderRadius: "22px" }}
      >
        <defs>
          <radialGradient id="splash-bg" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#1E4D33" />
            <stop offset="100%" stopColor="#0C1F16" />
          </radialGradient>
        </defs>
        <rect width="1024" height="1024" rx="210" ry="210" fill="url(#splash-bg)" />
        <g stroke="white" strokeLinecap="round" fill="none">
          <line x1="512" y1="810" x2="512" y2="545" strokeWidth="56" />
          <path d="M 512 545 Q 426 418 268 268" strokeWidth="46" />
          <line x1="512" y1="545" x2="512" y2="220" strokeWidth="46" />
          <path d="M 512 545 Q 598 418 756 268" strokeWidth="46" />
        </g>
        <circle cx="512" cy="810" r="54" fill="white" />
        <circle cx="512" cy="545" r="50" fill="white" />
        <circle cx="268" cy="268" r="58" fill="#6EE7A0" />
        <circle cx="512" cy="220" r="58" fill="#6EE7A0" />
        <circle cx="756" cy="268" r="58" fill="#6EE7A0" />
      </svg>

      {/* App name */}
      <p
        className="mt-5 text-2xl font-bold tracking-tight"
        style={{ color: "rgba(255,255,255,0.95)" }}
      >
        Grove
      </p>

      {/* Tagline */}
      <p
        className="mt-1 text-sm"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        Git Repository Dashboard
      </p>

      {/* Subtle loading dots */}
      <div className="mt-8 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{
              animation: `splash-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splash-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
