const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = 'artifacts/yael-arabic-prep/';
const exams = JSON.parse(fs.readFileSync(root + 'lib/imported-exams.json', 'utf8'));
assert.equal(exams.length, 14);
const ids = new Set();
let count = 0;
for (const exam of exams) {
  assert.equal(exam.sections.length, 3, exam.id);
  assert.ok(exam.essayPrompt.trim().length > 15, exam.id);
  for (const section of exam.sections) {
    assert.equal(section.length, 22, exam.id);
    section.forEach((q, index) => {
      assert.equal(q.number, index + 1);
      assert.ok(!ids.has(q.id), q.id);
      ids.add(q.id);
      assert.ok(q.prompt.trim().length > 4, q.id);
      assert.equal(q.options.length, 4, q.id);
      assert.equal(new Set(q.options).size, 4, q.id);
      q.options.forEach(option => assert.ok(option.trim(), q.id));
      assert.ok(q.answer === null || (Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4), q.id);
      if (q.type === 'reading') assert.ok(q.passage?.length > 100, q.id);
      count++;
    });
  }
}
assert.equal(count, 924);
const solutionFile = root + 'lib/imported-exam-solutions.json';
if (fs.existsSync(solutionFile)) {
  const solutions = JSON.parse(fs.readFileSync(solutionFile, 'utf8'));
  assert.equal(Object.keys(solutions).length, count);
  for (const id of ids) {
    const solution = solutions[id];
    assert.ok(solution, id);
    assert.ok(['high', 'review'].includes(solution.confidence), id);
    assert.ok(solution.answer === null || (Number.isInteger(solution.answer) && solution.answer >= 0 && solution.answer < 4), id);
    if (solution.confidence === 'high') assert.notEqual(solution.answer, null, id);
    assert.ok(solution.explanation.length > 15 && /[\u0600-\u06ff]/.test(solution.explanation), id);
  }
  console.log(`Validated ${Object.keys(solutions).length} app-generated Arabic explanations.`);
}
const memory = new Map();
const mock = {
  setItem: async (key, value) => { memory.set(key, value); },
  removeItem: async key => { memory.delete(key); },
  getItem: async key => memory.get(key) ?? null,
};
const code = ts.transpileModule(fs.readFileSync(root + 'lib/source-session.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const context = { exports: {}, require: () => mock, Date, Map, Promise };
vm.runInNewContext(code, context);
const s = context.exports;
const exam = exams[0];
const training = s.newSourceSession(exam, 'training', 1);
assert.equal(training.answers.length, 1);
assert.equal(training.answers[0].length, 22);
training.answers[0][0] = 2;
const restored = s.parseSourceSession(JSON.stringify(training), exam, 'training', 1);
assert.equal(restored.answers[0][0], 2);
assert.equal(restored.deadline, training.deadline);
assert.ok(s.isDone(s.catchUp(training, training.deadline)));
assert.equal(s.catchUp(training, training.deadline).deadline, null);
assert.throws(() => s.parseSourceSession(JSON.stringify(training), exam, 'training', 2));
assert.throws(() => s.parseSourceSession(JSON.stringify({ ...training, answers: [[9]] }), exam, 'training', 1));
const full = s.newSourceSession(exam, 'full', null);
assert.equal(full.answers.length, 3);
const essay = s.catchUp(full, full.deadline + 2 * s.SECTION_MS);
assert.ok(s.isEssayStage(essay));
assert.equal(essay.deadline, full.deadline + 2 * s.SECTION_MS + s.ESSAY_MS);
assert.ok(s.isDone(s.catchUp(full, full.deadline + 2 * s.SECTION_MS + s.ESSAY_MS)));
assert.notEqual(s.storageKey('user-a', exam.id, 'training', 0), s.storageKey('user-b', exam.id, 'training', 0));
assert.notEqual(s.storageKey(undefined, exam.id, 'training', 0), s.storageKey(undefined, exam.id, 'full', null));
(async () => {
  const key = s.storageKey(undefined, exam.id, 'training', 1);
  const first = s.saveSourceSession(key, training);
  const second = s.saveSourceSession(key, { ...training, question: 4 });
  await Promise.all([first, second]);
  assert.equal(JSON.parse(await s.loadSourceSession(key)).question, 4);
  await s.saveSourceSession(key, null);
  assert.equal(await s.loadSourceSession(key), null);
  console.log(`Validated ${exams.length} exams, ${count} questions, session resume, timed completion, isolation and serialized saves.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
