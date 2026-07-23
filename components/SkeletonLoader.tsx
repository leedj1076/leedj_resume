export default function SkeletonLoader() {
  return (
    <div className="flex justify-start">
      <div className="bg-[var(--color-surface-secondary)] border border-[var(--color-border-primary)] rounded-2xl px-4 py-3 max-w-[80%]">
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-[var(--color-border-secondary)] rounded w-3/4" />
          <div className="h-3 bg-[var(--color-border-secondary)] rounded w-full" />
          <div className="h-3 bg-[var(--color-border-secondary)] rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}
