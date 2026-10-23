import type { RulePack } from "./types";

import flightDelay from "../rule-packs/flight-delay.json";
import subscriptionCancel from "../rule-packs/subscription-cancel.json";
import surpriseBill from "../rule-packs/surprise-bill.json";

export function registerPacks(packs: unknown[]): Record<string, RulePack> {
  const registry: Record<string, RulePack> = Object.create(null);
  for (const value of packs) {
    if (!value || typeof value !== "object") throw new Error("Invalid rule pack");
    const p = value as RulePack;
    const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === "string" && x.trim());
    if (!/^[a-z]+(?:-[a-z]+)+$/.test(p.id) || !p.name || !p.version ||
      !strings(p.extractionSchema) || !strings(p.requiredFacts) ||
      !p.searchPlan || !strings(p.searchPlan.queries) || !strings(p.searchPlan.preferredDomains) ||
      typeof p.evaluationPrompt !== "string" || !p.evaluationPrompt.trim() ||
      typeof p.letterTemplate !== "string" || !p.letterTemplate.trim() ||
      !p.escalationLadder || !["IN", "EU", "US"].every(c => strings(p.escalationLadder[c as keyof typeof p.escalationLadder])) ||
      (p.lastReviewed !== null && (typeof p.lastReviewed !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.lastReviewed)))) {
      throw new Error("Invalid rule pack configuration");
    }
    if (Object.hasOwn(registry, p.id)) throw new Error("Duplicate rule pack ID");
    registry[p.id] = p;
  }
  return registry;
}

export const RULE_PACKS = registerPacks([flightDelay, subscriptionCancel, surpriseBill]);

export const COUNTRIES = [
  { code: "IN", label: "India" },
  { code: "EU", label: "European Union" },
  { code: "US", label: "United States" },
];

export const CASE_TYPES = Object.values(RULE_PACKS).map(pack => ({ id: pack.id, label: pack.name }));

export function getPack(id: string): RulePack | undefined {
  return Object.hasOwn(RULE_PACKS, id) ? RULE_PACKS[id] : undefined;
}
