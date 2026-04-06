interface StatusScreenProps {
  eyebrow: string;
  title: string;
  body: string;
  hint?: string;
}

export function StatusScreen({ body, eyebrow, hint, title }: StatusScreenProps) {
  return (
    <main className="min-h-screen px-6 py-6 lg:px-8">
      <section className="trove-panel mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col justify-between rounded-[2rem] p-8 lg:p-12">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-600">
            {eyebrow}
          </p>
          <div className="space-y-4">
            <h1 className="max-w-[10ch] font-serif text-5xl leading-[0.92] tracking-[-0.05em] text-zinc-950 lg:text-7xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-700 lg:text-lg">{body}</p>
            {hint ? <p className="max-w-2xl text-sm leading-7 text-zinc-500">{hint}</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
