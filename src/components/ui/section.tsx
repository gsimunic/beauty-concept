export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-5 shadow-sm shadow-[#d8c7b4]/25">
      <h2 className="mb-4 text-lg font-semibold text-[var(--bc-text)]">{title}</h2>
      {children}
    </section>
  );
}
