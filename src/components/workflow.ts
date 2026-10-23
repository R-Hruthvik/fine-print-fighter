export const MAX_DOCUMENT_CHARACTERS = 30_000;
export const MAX_FILE_BYTES = 256 * 1024;

export function validateDocument(text: string): string | null {
  if (!text.trim()) return "Please paste your document text before analyzing.";
  if (text.length > MAX_DOCUMENT_CHARACTERS) return "Your document exceeds 30,000 characters. Shorten it before analyzing.";
  return null;
}

export function validateTextFile(name: string, type: string, size: number, text: string): string | null {
  if (!/\.(txt|md)$/i.test(name)) return "Choose a .txt or .md file. For PDF or images, paste the document text instead.";
  if (size > MAX_FILE_BYTES) return "Your file exceeds 256 KiB. Choose a smaller text file.";
  if (type && !type.startsWith("text/") && !["application/octet-stream", "application/markdown"].includes(type)) return "This file does not appear to contain plain text.";
  if (!text.trim()) return "This file is empty. Choose a document with text.";
  if (text.includes("\0") || text.includes("\uFFFD")) return "This file is not valid UTF-8 text. Save it as a UTF-8 .txt or .md file.";
  return validateDocument(text);
}

export function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function exportLetter(letter: string, citations: { id: number; title: string; url: string }[]): string {
  const sources = citations.filter((citation) => safeUrl(citation.url));
  return `${letter}${sources.length ? `\n\nSources\n${sources.map((citation) => `[${citation.id}] ${citation.title}\n${citation.url}`).join("\n\n")}` : ""}\n`;
}
