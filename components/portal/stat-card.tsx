interface StatCardProps {
  label: string;
  value: string;
  detail: string;
}

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="rounded-card border border-neutral-200 bg-mist p-5">
      <p className="text-sm font-medium text-neutral-600">{label}</p>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-3 text-sm leading-6 text-neutral-600">{detail}</p>
    </article>
  );
}