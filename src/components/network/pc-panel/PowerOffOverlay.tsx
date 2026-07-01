export function PowerOffOverlay() {
  return (
    <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-error-500/20 blur-3xl rounded-full animate-pulse" />
        <svg className="w-16 h-16 text-error-600 drop-shadow-xl relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
        </svg>
      </div>
    </div>
  );
}
