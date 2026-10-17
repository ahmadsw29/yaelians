import { IMPORTED_EXAMS as sourceExams, type ImportedExam as SourceExam, type ImportedQuestion as SourceQuestion } from './imported-exams';
import generatedSolutions from './imported-exam-solutions.json';

export type Solution = {
  answer: number | null;
  explanation: string;
  confidence: 'high' | 'review';
};
export type ImportedQuestion = SourceQuestion & {
  explanation: string;
  solutionConfidence: Solution['confidence'];
};
export type ImportedExam = Omit<SourceExam, 'sections'> & { sections: ImportedQuestion[][] };
const solutions: Record<string, Solution> = generatedSolutions as Record<string, Solution>;

// Keep the original PDF transcription unchanged. These are app-generated
// teaching solutions, never an official source answer key.
export const IMPORTED_EXAMS: ImportedExam[] = sourceExams.map(exam => ({
  ...exam,
  sections: exam.sections.map(section => section.map(question => {
    const solution = solutions[question.id];
    if (!solution || !solution.explanation.trim()) throw new Error(`Missing solution: ${question.id}`);
    if (solution.answer !== null && (!Number.isInteger(solution.answer) || solution.answer < 0 || solution.answer >= question.options.length)) {
      throw new Error(`Invalid solution: ${question.id}`);
    }
    return {
      ...question,
      answer: solution.confidence === 'high' ? solution.answer : null,
      explanation: solution.explanation,
      solutionConfidence: solution.confidence,
    };
  })),
}));
