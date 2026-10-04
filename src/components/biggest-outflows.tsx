import { money } from "../lib/format";
import type { Txn } from "../lib/types";
import { Card } from "./ui";

const BiggestOutflows = ({
  biggest,
  currency,
}: {
  biggest: Txn[];
  currency: string;
}) => {
  if (biggest.length === 0) {
    return null;
  }
  return (
    <Card className="p-5">
      <p className="font-display text-[15.5px] font-semibold text-[#1c2b23]">
        Largest outflows
      </p>
      <div className="mt-2 divide-y divide-[#1c2b23]/6">
        {biggest.map((t) => (
          <div key={t.uid} className="flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-[#1c2b23]">
                {t.note || t.category}
              </p>
              <p className="text-[12px] text-[#8a978d]">
                {t.category} · {t.date}
              </p>
            </div>
            <p className="font-display shrink-0 text-[15px] font-bold text-[#1c2b23]">
              {money(t.amount, currency)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default BiggestOutflows;
