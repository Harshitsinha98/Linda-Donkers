import { LogoMark } from "./Logo";

export function Marquee({ items, dark = false }: { items: string[]; dark?: boolean }) {
  const row = [...items, ...items];
  return (
    <div
      className={`relative overflow-hidden border-y py-6 ${
        dark ? "border-linen/10 bg-forest text-linen" : "border-forest/10 bg-sand/60 text-forest"
      }`}
      aria-hidden
    >
      <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap">
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center gap-10">
            {row.map((it, i) => (
              <span key={`${k}-${i}`} className="flex items-center gap-10">
                <span className={`font-display text-[clamp(1.8rem,4vw,3.4rem)] font-light ${i % 2 ? "italic" : ""}`}>
                  {it}
                </span>
                <LogoMark className="h-6 w-6 text-saffron" strokeWidth={4} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
