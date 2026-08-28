import { readFile } from 'node:fs/promises';

const manifestUrl = new URL('../content/manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

const expectedKeys = [
  'schema_version',
  'content_version',
  'created_at',
  'review_status',
  'exercises',
  'routine_templates',
];

const missingKeys = expectedKeys.filter((key) => !(key in manifest));

if (missingKeys.length > 0) {
  throw new Error(`Content manifest is missing: ${missingKeys.join(', ')}`);
}

if (manifest.schema_version !== 1) {
  throw new Error('Content manifest must use Phase 1 schema_version 1.');
}

if (manifest.review_status !== 'draft') {
  throw new Error('The empty Phase 1 content pack must remain draft.');
}

if (!Array.isArray(manifest.exercises) || manifest.exercises.length !== 0) {
  throw new Error('BOOT-001 must not introduce exercise content.');
}

if (
  !Array.isArray(manifest.routine_templates) ||
  manifest.routine_templates.length !== 0
) {
  throw new Error('BOOT-001 must not introduce routine templates.');
}

console.info(
  'Content manifest is valid for the Phase 1 empty-content contract.',
);
