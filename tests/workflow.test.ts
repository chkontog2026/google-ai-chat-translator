import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSRT, inspectSRT, cuesToSRT, cuesToVTT, cuesToBilingualSRT, secondsToTimecode, timecodeToSeconds } from '../src/utils/srtParser';
import { analyzeTranslation, applyTranslation, getBatch, qualityIssues, requestId } from '../src/utils/translationWorkflow';
import { defaultConfig, decodeProject } from '../src/utils/projectStorage';
import { generateBatchPrompt } from '../src/utils/promptGenerator';

const raw = '51\n00:00:01,000 --> 00:00:04,000\nHello.\n\n52\n00:00:05,000 --> 00:00:08,000\nGoodbye.\n';
const source = () => parseSRT(raw);
const response = (rows: unknown[], cues = source(), targets = cues) => JSON.stringify({ requestId: requestId(cues, targets), translations: rows });

test('SRT preserves IDs, multiline text and timing, including adjacent blocks', () => {
  const cues = parseSRT(raw.replace('\n\n', '\n'));
  assert.deepEqual(cues.map(c => c.id), [51, 52]);
  assert.equal(cues[0].originalText, 'Hello.');
  assert.equal(parseSRT(cuesToSRT(cues, false))[1].id, 52);
  assert.equal(secondsToTimecode(59.9999), '00:01:00,000');
});
test('original rejects invalid seconds, reverse durations, duplicate IDs and malformed headers', () => {
  assert.ok(Number.isNaN(timecodeToSeconds('00:00:87,000')));
  for (const bad of [raw.replace('00:00:04,000', '00:00:87,000'), raw.replace('00:00:04,000', '00:00:00,000'), raw.replace('52\n', '51\n'), raw.replace('00:00:04,000', 'garbage')]) assert.throws(() => parseSRT(bad));
});
test('second batch keeps stable IDs and uses only surrounding context', () => {
  const cues = Array.from({ length: 101 }, (_, i) => ({ ...source()[0], id: i + 1, originalText: `Line ${i + 1}` }));
  const config = { ...defaultConfig, chunkSize: 50, currentChunkIndex: 1 };
  const prompt = generateBatchPrompt(cues, config, 1, 3);
  assert.deepEqual(prompt.chunkCues.map(c => c.id), Array.from({ length: 50 }, (_, i) => i + 51));
  assert.ok(prompt.promptText.includes('"id": 100'));
  assert.ok(prompt.promptText.includes(requestId(cues, prompt.chunkCues)));
  assert.equal(getBatch(cues, config).total, 3);
});
test('whole-file mode covers every ID and repairs missing cues beyond the first batch', () => {
  const cues = Array.from({ length: 2067 }, (_, i) => ({ ...source()[0], id: i + 1, originalText: `Line ${i + 1}` }));
  const config = { ...defaultConfig, chunkSize: 0, currentChunkIndex: 41 };
  const batch = getBatch(cues, config);
  assert.equal(batch.total, 1);
  assert.equal(batch.index, 0);
  const prompt = generateBatchPrompt(cues, config, 41, 42);
  const data = JSON.parse(prompt.promptText.split('Δεδομένα:\n')[1].split('\n\nΣχήμα απάντησης')[0]);
  assert.deepEqual(data.translate.map((c: any) => c.id), cues.map(c => c.id));
  assert.deepEqual(data.contextOnly, []);
  assert.ok(prompt.label.includes('Ολόκληρο το αρχείο • 2067'));
  const rows = cues.filter(c => c.id !== 2067).map(c => ({ id: c.id, text: 'Γεια.' }));
  const plan = analyzeTranslation(cues, response(rows, cues), batch.targets);
  assert.deepEqual(plan.missingIds, [2067]);
  const merged = applyTranslation(cues, plan);
  const repair = getBatch(merged, { ...config, repairOnly: true });
  assert.deepEqual(repair.targets.map(c => c.id), [2067]);
  assert.equal(merged[0].translatedText, 'Γεια.');
  assert.equal(merged[2066].startTime, cues[2066].startTime);
  assert.deepEqual(getBatch([], config), { total: 1, index: 0, start: 0, all: [], targets: [] });
});

test('whole-file projects restore with a finite index and keep saved batch preferences', () => {
  const p = { version: 1, cues: source(), fileName: 'test.srt', promptConfig: { ...defaultConfig, chunkSize: 0, currentChunkIndex: 41 }, activeStep: 2, inputText: '', videoFileName: null };
  assert.equal(decodeProject(JSON.stringify(p)).promptConfig.currentChunkIndex, 0);
  assert.equal(decodeProject(JSON.stringify({ ...p, cues: [] })).promptConfig.currentChunkIndex, 0);
  const old = decodeProject(JSON.stringify({ ...p, promptConfig: { ...defaultConfig, chunkSize: 50, currentChunkIndex: 0 } }));
  assert.equal(old.promptConfig.chunkSize, 50);
});

test('valid partial JSON accepts known records and reports missing without shifting', () => {
  const cues = source();
  const plan = analyzeTranslation(cues, response([{ id: 52, text: 'Αντίο.' }]), cues);
  assert.deepEqual(plan.missingIds, [51]);
  const merged = applyTranslation(cues, plan);
  assert.equal(merged[0].translatedText, undefined);
  assert.equal(merged[1].translatedText, 'Αντίο.');
  assert.deepEqual(merged.map(c => [c.id, c.startTime, c.endTime, c.originalText]), cues.map(c => [c.id, c.startTime, c.endTime, c.originalText]));
});
test('duplicate, unknown, empty, wrong-type rows are rejected independently', () => {
  const cues = source();
  const plan = analyzeTranslation(cues, response([{ id: 51, text: 'α' }, { id: 51, text: 'β' }, { id: 99, text: 'γ' }, { id: 52, text: '' }, null]), cues);
  assert.equal(plan.rejected, 5);
  assert.equal(plan.proposals.length, 0);
});
test('stale project, stale batch, incomplete JSON and bare arrays cannot be applied', () => {
  const cues = source();
  const payload = response([{ id: 51, text: 'Γεια.' }]);
  const changed = cues.map(c => ({ ...c, originalText: 'A different film' }));
  for (const plan of [analyzeTranslation(changed, payload, changed), analyzeTranslation(cues, payload, [cues[0]]), analyzeTranslation(cues, payload.slice(0, -1), cues), analyzeTranslation(cues, '[{"id":51,"text":"Γεια"}]', cues)]) {
    assert.equal(plan.proposals.length, 0);
    assert.ok(plan.issues.length);
  }
});
test('existing edits are preserved unless overwrite was selected', () => {
  const cues = source().map(c => ({ ...c, translatedText: 'Χειροκίνητη διόρθωση' }));
  const plan = analyzeTranslation(cues, response([{ id: 51, text: 'Γεια.' }]), cues);
  assert.equal(applyTranslation(cues, plan)[0].translatedText, 'Χειροκίνητη διόρθωση');
  assert.equal(applyTranslation(cues, plan, true)[0].translatedText, 'Γεια.');
});
test('legacy recovery matches exact times regardless of ID and always requests review', () => {
  const cues = source();
  const legacy = '1\n00:00:05,000 --> 00:00:08,000\nΑντίο.\n\n2\n00:00:09,000 --> 00:00:12,000\nΆγνωστο.';
  const plan = analyzeTranslation(cues, legacy, cues);
  assert.equal(plan.rejected, 1);
  assert.deepEqual(plan.proposals.map(p => p.id), [52]);
  assert.equal(plan.proposals[0].needsReview, true);
});
test('legacy duplicate times and duplicate IDs do not silently overwrite', () => {
  const cues = source();
  for (const legacy of [raw + '\n' + raw, raw.replace('52\n', '51\n')]) {
    assert.equal(analyzeTranslation(cues, legacy, cues).proposals.length, 0);
  }
});
test('quality checks include foreign scripts, mixed words, lines, CPS and review', () => {
  const c = { ...source()[0], translatedText: 'Αυstrαλίας\nΤジム\n' + 'α'.repeat(90), needsReview: true };
  assert.equal(qualityIssues(c).length, 6);
  const config = { ...defaultConfig, repairOnly: true };
  assert.deepEqual(getBatch([{ ...source()[0], translatedText: 'Γεια.' }, c], config).targets, [c]);
});
test('draft export preserves all cues and clearly marks untranslated entries', () => {
  const cues = source();
  const text = cuesToSRT(cues);
  assert.ok(text.includes('[Χωρίς μετάφραση]'));
  assert.ok(!text.includes('Hello.'));
  assert.equal(parseSRT(text).length, 2);
  assert.ok(cuesToVTT(cues).includes('51\n00:00:01.000 --> 00:00:04.000\n[Χωρίς μετάφραση]'));
  assert.ok(cuesToBilingualSRT(cues).includes('<i>Hello.</i>\n[Χωρίς μετάφραση]'));
});

test('repair prompt retains immediate context around isolated problem cues inside a batch', () => {
  const cues = Array.from({ length: 10 }, (_, i) => ({ ...source()[0], id: i + 1, originalText: `Line ${i + 1}`, translatedText: i === 5 ? '' : 'Γεια.' }));
  const prompt = generateBatchPrompt(cues, { ...defaultConfig, repairOnly: true }, 0, 1);
  assert.deepEqual(prompt.chunkCues.map(c => c.id), [6]);
  const data = JSON.parse(prompt.promptText.split('Δεδομένα:\n')[1].split('\n\nΣχήμα απάντησης')[0]);
  assert.deepEqual(data.contextOnly.map((c: any) => c.id), [4, 5, 7, 8]);
});
test('backup roundtrip preserves progress, review flags and draft response; rejects corrupt data', () => {
  const p = { version: 1, cues: source().map(c => ({ ...c, translatedText: 'Γεια.', needsReview: true })), fileName: 'test.srt', promptConfig: defaultConfig, activeStep: 3, inputText: 'unfinished reply', videoFileName: null };
  assert.deepEqual(decodeProject(JSON.stringify(p)), p);
  assert.throws(() => decodeProject(JSON.stringify({ ...p, cues: [p.cues[0], p.cues[0]] })));
  assert.throws(() => decodeProject(JSON.stringify({ ...p, promptConfig: { ...defaultConfig, chunkSize: -1 } })));
});

test('real GMA regression: recover 560 candidates without attaching the ending at minute 41', { skip: !process.env.SRT_TEST_ORIGINAL || !process.env.SRT_TEST_TRANSLATED }, () => {
  const original = readFileSync(process.env.SRT_TEST_ORIGINAL!, 'utf8');
  const translated = readFileSync(process.env.SRT_TEST_TRANSLATED!, 'utf8');
  const cues = parseSRT(original);
  const scan = inspectSRT(translated);
  assert.equal(cues.length, 2067);
  assert.equal(scan.total, 1025);
  assert.equal(scan.issues.filter(i => i.message.includes('χρονισμός')).length, 266);
  const plan = analyzeTranslation(cues, translated, getBatch(cues, defaultConfig).targets);
  assert.equal(plan.proposals.length, 560);
  assert.equal(plan.rejected, 465);
  const merged = applyTranslation(cues, plan);
  assert.equal(merged.length, 2067);
  assert.equal(merged[1024].translatedText, undefined);
  assert.equal(merged[23].translatedText?.includes('εγκεφαλική αιμορραγία'), true);
  assert.equal(merged.filter(c => c.needsReview).length, 560);
  assert.equal(cuesToSRT(merged, false), cuesToSRT(cues, false));
});
