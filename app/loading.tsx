export default function Loading() {
  return (
    <div className="space-y-5" aria-label="Loading page" role="status">
      <div className="h-8 w-56 animate-pulse rounded-xl bg-slate-200" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-lg bg-slate-100" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-[24px] border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-[28px] border border-slate-200 bg-white" />
    </div>
  );
}
