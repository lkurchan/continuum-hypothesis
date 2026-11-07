import { isOnchain, money, when } from "@/components/ui/format";
import { Hash, Icon } from "@/components/ui/kit";
import type { Activity } from "@/lib/domain/types";

export type Direction = "out" | "in" | "neutral";

export function describe(a: Activity, payerName: string): { title: string; direction: Direction; sign: string } {
  switch (a.kind) {
    case "withdraw": return { title: "Retiro", direction: "out", sign: "−" };
    case "agent_payment": return { title: "Pago del copiloto", direction: "out", sign: "−" };
    case "create": return { title: `${payerName} fondeó tu pago`, direction: "in", sign: "+" };
    case "topup": return { title: `${payerName} recargó tu pago`, direction: "in", sign: "+" };
    case "cancel": return { title: "Pago cancelado", direction: "neutral", sign: "" };
    // Fee rows are filtered out for providers in StreamService.activity; kept for exhaustiveness.
    case "fee": return { title: "Comisión Continuum", direction: "neutral", sign: "" };
  }
}

const tone: Record<Direction, { icon: string; amount: string; name: "out" | "in" | "flow" }> = {
  out: { icon: "bg-surface text-ink", amount: "text-ink", name: "out" },
  in: { icon: "bg-celeste-soft text-celeste-ink", amount: "text-celeste-ink", name: "in" },
  neutral: { icon: "bg-surface text-muted", amount: "text-subtle", name: "flow" },
};

export function ActivityRow({ activity, payerName, showHash = false, i = 0 }: { activity: Activity; payerName: string; showHash?: boolean; i?: number }) {
  const d = describe(activity, payerName);
  const t = tone[d.direction];
  return (
    <div className="animate-enter flex min-h-[58px] items-center gap-3 border-b border-line-soft last:border-0" style={{ "--i": i } as React.CSSProperties}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${t.icon}`}>
        <Icon name={t.name} size={16} />
      </span>
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{d.title}</span>
        <span className="flex items-center gap-1.5 text-xs text-subtle">
          {when(activity.createdAt)}
          {showHash && isOnchain(activity.txHash) && <><span aria-hidden="true">·</span><Hash hash={activity.txHash} /></>}
        </span>
      </span>
      <span className={`tnum whitespace-nowrap text-sm font-semibold ${t.amount}`}>
        {d.direction === "neutral" ? "" : `${d.sign}${money(activity.amount)}`}
      </span>
    </div>
  );
}
