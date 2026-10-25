import type { Country, PipelineResult } from "./types";

export type SavedCaseSummary = {
  id: string;
  company_name: string;
  pack_id: string;
  jurisdiction: Country;
  created_at: string;
  updated_at: string;
};

export type SavedCaseDetail = SavedCaseSummary & {
  documents: { label: string; text: string }[];
  analysis: PipelineResult;
  letter: string;
};

export type SaveCaseInput = {
  companyName: string;
  packId: string;
  jurisdiction: Country;
  documents: { label: string; text: string }[];
  analysis: PipelineResult;
  letter: string;
};

export function validateSaveCase(value: unknown): value is SaveCaseInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<SaveCaseInput>;
  if (typeof input.companyName !== "string" || input.companyName.trim().length < 1 || input.companyName.length > 200) return false;
  if (typeof input.packId !== "string" || !/^[a-z]+(?:-[a-z]+)+$/.test(input.packId)) return false;
  if (!("IN EU US".split(" ").includes(input.jurisdiction ?? ""))) return false;
  if (!Array.isArray(input.documents) || input.documents.length < 1 || input.documents.length > 20) return false;
  if (!input.documents.every((doc) => doc && typeof doc.label === "string" && doc.label.length <= 200 && typeof doc.text === "string")) return false;
  if (!input.documents.some((doc) => doc.label === "Primary document") || !input.documents.some((doc) => doc.label === "Company response")) return false;
  const documentCharacters = input.documents.reduce((total, doc) => total + doc.text.length, 0);
  if (documentCharacters > 30_000 || typeof input.letter !== "string" || input.letter.length > 30_000) return false;
  if (!input.analysis || typeof input.analysis !== "object" || JSON.stringify(input.analysis).length > 180_000) return false;
  return true;
}
