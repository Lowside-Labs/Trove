interface StatusScreenProps {
  eyebrow: string;
  title: string;
  body: string;
  hint?: string;
}

export function StatusScreen({ body, eyebrow, hint, title }: StatusScreenProps) {
  return (
    <main className="flex min-h-full items-center justify-center px-8">
      <div className="max-w-md space-y-3 text-center">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground/60">
          {eyebrow}
        </p>
        <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{body}</p>
        {hint ? (
          <p className="pt-2 text-[13px] leading-relaxed text-muted-foreground/60">{hint}</p>
        ) : null}
      </div>
    </main>
  );
}
