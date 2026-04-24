import { cn } from "@/lib/utils";

/** Hero-style header with gradient background and polished CTA */
export function GradientHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#fd9a3d] to-[#f97316] px-4 py-4 text-white shadow-lg shadow-primary/20",
        className
      )}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight drop-shadow-sm">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 max-w-[240px] text-sm leading-relaxed text-white/90">
              {subtitle}
            </p>
          ) : null}
        </div>
        {right}
      </div>
    </header>
  );
}
