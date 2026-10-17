// Generated from the supplied PDF booklets by scripts/import-yael-pdfs.py.
// These sources do not contain answer keys. A null answer must not be graded.
import importedExams from "./imported-exams.json";

export type ImportedQuestion = {
  id: string;
  number: number;
  type: "completion" | "restatement" | "reading";
  prompt: string;
  options: string[];
  passage?: string;
  /** One-based physical PDF page, including blank pages. */
  sourcePage: number;
  /** Zero-based option index when supplied by a source key; otherwise null. */
  answer: number | null;
};

export type ImportedExam = {
  id: string;
  title: string;
  sourceFilename: string;
  sections: ImportedQuestion[][];
  essayPrompt: string;
};

export const IMPORTED_EXAMS: ImportedExam[] = importedExams as ImportedExam[];
