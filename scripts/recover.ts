import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseSRT } from '../src/utils/srtParser';
import { analyzeTranslation, applyTranslation, getBatch } from '../src/utils/translationWorkflow';
import { defaultConfig, decodeProject } from '../src/utils/projectStorage';

const [originalPath, translatedPath, outputPrefix] = process.argv.slice(2);
if (!originalPath || !translatedPath || !outputPrefix) throw new Error('Usage: npx tsx scripts/recover.ts original.srt translated.srt output-prefix');
const cues = parseSRT(readFileSync(originalPath, 'utf8'));
const raw = readFileSync(translatedPath, 'utf8');
const plan = analyzeTranslation(cues, raw, getBatch(cues, defaultConfig).targets);
const project = decodeProject(JSON.stringify({ version: 1, cues: applyTranslation(cues, plan), fileName: path.basename(originalPath), promptConfig: { ...defaultConfig, repairOnly: true }, activeStep: 2, inputText: raw, videoFileName: null }));
mkdirSync(path.dirname(outputPrefix), { recursive: true });
writeFileSync(outputPrefix + '.subgreek.json', JSON.stringify(project, null, 2), { encoding: 'utf8', flag: 'wx' });
writeFileSync(outputPrefix + '.report.json', JSON.stringify(plan, null, 2), { encoding: 'utf8', flag: 'wx' });
console.log(JSON.stringify({ originalCues: cues.length, candidatesForReview: plan.proposals.length, rejected: plan.rejected, missing: project.cues.filter(c => !c.translatedText?.trim()).length, outputPrefix }, null, 2));
