/** Raw practice accuracy, never a standardized YAEL score or an essay grade. */
export function scoreExamSections(
  sections: readonly (readonly { answer: number }[])[],
  answers: readonly (readonly (number | null)[])[],
) {
  return sections.map((questions, section) => {
    let correct = 0;
    let skipped = 0;
    questions.forEach((question, index) => {
      const selected = answers[section]?.[index];
      if (selected === null || selected === undefined) skipped++;
      else if (selected === question.answer) correct++;
    });
    return {
      correct, skipped, wrong: questions.length - correct - skipped,
      total: questions.length,
      percent: questions.length ? Math.round(correct / questions.length * 100) : 0,
    };
  });
}
