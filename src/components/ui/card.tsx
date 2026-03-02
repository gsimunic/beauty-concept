export function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-4 shadow-sm shadow-[#d8c7b4]/25">
      <p className="text-sm text-[var(--bc-muted)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--bc-text)]">{value}</p>
    </div>
  );
}
