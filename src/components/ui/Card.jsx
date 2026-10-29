export default function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`} {...props}>
      {children}
    </div>
  );
}
