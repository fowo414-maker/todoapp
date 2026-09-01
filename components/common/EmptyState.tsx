export function EmptyState({ message }: { message: string }) {
  return (
    <div
      data-testid="empty-state"
      className="rounded-lg border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-sm text-ink-soft"
    >
      {message}
    </div>
  );
}

export default EmptyState;
