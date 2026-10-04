import {
  cardLine,
  looseEnds,
  nextBillLine,
  paceLine,
  sumIn,
  topCategory,
  usualSpend,
} from "./briefing-lines";
import { findCardBill } from "./card";
import { greeting, isoDay, money, monthKey, prettyDate } from "./format";
import type { InsightCtx } from "./types";

export interface BriefingFact {
  label: string;
  value: string;
}

export interface Briefing {
  facts: BriefingFact[];
  greeting: string;
  narrative: string;
  reviewed: number;
  span: string;
  updated: string;
}

/**
 * Pebble's opening note: the same numbers the cards use, said in sentences.
 * Deterministic and local - every figure comes from the entries on the device.
 */
export const buildBriefing = (ctx: InsightCtx): Briefing => {
  const { txns, settings, now } = ctx;
  const today = isoDay(now);
  const key = monthKey(today);
  const { exp, inc, n } = sumIn(txns, key);
  const usual = usualSpend(txns, now);
  const kept = inc - exp;
  const top = topCategory(txns, key);
  const months = new Set(txns.map((t) => monthKey(t.date))).size;
  const named = settings.name ? `, ${settings.name}` : "";

  const opening =
    n === 0
      ? "Nothing logged this month yet - once a few entries land, I can tell you something useful."
      : `So far you've brought in ${money(inc, settings.currency)} and spent ${money(exp, settings.currency)}, keeping ${money(kept, settings.currency)}.`;

  const lines = [
    opening,
    n > 0 ? paceLine(exp, usual, settings.currency) : "",
    top && n > 0
      ? `Most of it went to ${top.name} (${money(top.amount, settings.currency)}).`
      : "",
    cardLine(ctx),
    nextBillLine(ctx.recurrings, today, settings.currency),
    looseEnds(ctx),
  ];

  const facts: BriefingFact[] = [];
  if (n > 0) {
    facts.push(
      { label: "In", value: money(inc, settings.currency) },
      { label: "Out", value: money(exp, settings.currency) },
      { label: "Kept", value: money(kept, settings.currency) }
    );
  }
  if (top) {
    facts.push({ label: "Biggest", value: top.name });
  }
  const bill = findCardBill(ctx.recurrings);
  if (bill) {
    facts.push({ label: "Card bill", value: prettyDate(bill.nextDue) });
  }

  return {
    facts,
    greeting: `${greeting(now)}${named}`,
    narrative: lines.filter(Boolean).join(" "),
    reviewed: txns.length,
    span: months === 1 ? "1 month" : `${months} months`,
    updated: "just now",
  };
};
