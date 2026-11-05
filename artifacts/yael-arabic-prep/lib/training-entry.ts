/** Opening a section is not an instruction to start a timer or replay a result. */
export function trainingEntry(
  round: { finished?: boolean; deadline: number | null } | null | undefined,
  now = Date.now(),
): 'new' | 'resume' | 'previous' {
  if (!round) return 'new';
  if (round.finished || (round.deadline !== null && round.deadline <= now)) return 'previous';
  return 'resume';
}
