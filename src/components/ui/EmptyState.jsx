export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-zinc-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
