export function LogoTipo({ className = "w-8 h-8 rounded-lg" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 bg-white shadow-sm overflow-hidden ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt=""
        draggable={false}
        className="w-full h-full object-contain"
      />
    </span>
  );
}