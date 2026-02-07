export function AppFooter() {
  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <span className="text-lg">❤️</span>
      <span className="text-lg text-muted-foreground/50">by</span>
      <a
        href="https://derianandre.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2"
      >
        <span className="text-2xl">🧔🏻‍♂️</span>
        <div className="text-xs flex flex-col">
          <span>Derian Castillo </span>
          <span className="text-[10px] text-muted-foreground/70">
            (@derianandre)
          </span>
        </div>
      </a>
      <span className="text-lg text-muted-foreground/50">&</span>
      <div className="flex items-center gap-2">
        <span className="text-2xl">🤖</span>
        <div className="text-xs flex flex-col">
          <span>Artificial Intelligence </span>
          <span className="text-[10px] text-muted-foreground/70">
            (Cluade / Gemini)
          </span>
        </div>
      </div>
    </div>
  );
}
