export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div data-testid="skeleton" className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 w-full animate-pulse rounded-md bg-raised"
        />
      ))}
    </div>
  );
}

export default Skeleton;
