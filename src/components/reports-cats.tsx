import { money } from "../lib/format";
import { Bar, Card } from "./ui";

const CAT_COLORS = [
  "#1e4d3a",
  "#b97f1f",
  "#4a7c6f",
  "#b3541e",
  "#7a8b6f",
  "#5b6b60",
  "#8a978d",
  "#c9a227",
  "#3d4b42",
  "#a3b18a",
];

const ReportsCats = ({
  byCat,
  exp,
  currency,
}: {
  byCat: [string, number][];
  exp: number;
  currency: string;
}) => {
  const maxCat = byCat.length ? byCat[0][1] : 1;
  return (
    <Card className="p-5">
      <p className="font-display text-[15.5px] font-semibold text-[#1c2b23]">
        Where it went
      </p>
      {byCat.length === 0 ? (
        <p className="mt-2 text-[13.5px] text-[#5b6b60]">
          No spending recorded in this period - enjoy the quiet, or add an
          entry.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {byCat.slice(0, 7).map(([cat, v], i) => (
            <div key={cat}>
              <div className="mb-1 flex justify-between text-[13px]">
                <span className="font-medium text-[#3d4b42]">{cat}</span>
                <span className="font-semibold text-[#1c2b23]">
                  {money(v, currency)}{" "}
                  <span className="font-normal text-[#8a978d]">
                    · {exp ? Math.round((v / exp) * 100) : 0}%
                  </span>
                </span>
              </div>
              <Bar pct={(v / maxCat) * 100} color={CAT_COLORS[i % 10]} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ReportsCats;
