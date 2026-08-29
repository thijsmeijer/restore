import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  validateContentCatalog,
  type ContentValidationIssue,
} from '../src/content/validation';

const fileNames = {
  manifest: 'manifest.json',
  body_regions: 'body-regions.json',
  equipment: 'equipment.json',
  modes: 'modes.json',
  localization_keys: 'localization-keys.json',
  media_assets: 'media-assets.json',
} as const;

class ContentFileError extends Error {
  public constructor(
    public readonly code:
      | 'content_cli_invalid_arguments'
      | 'content_file_unreadable'
      | 'content_json_invalid',
    public readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = 'ContentFileError';
  }
}

function contentDirectory(args: readonly string[]): string {
  if (args.length === 0) return path.resolve('content');
  if (
    args.length === 2 &&
    args[0] === '--content-dir' &&
    args[1] !== undefined
  ) {
    return path.resolve(args[1]);
  }

  throw new ContentFileError(
    'content_cli_invalid_arguments',
    '$',
    'Usage: pnpm content:validate -- [--content-dir <directory>]',
  );
}

async function readJson(directory: string, fileName: string): Promise<unknown> {
  let value: string;
  try {
    value = await readFile(path.join(directory, fileName), 'utf8');
  } catch {
    throw new ContentFileError(
      'content_file_unreadable',
      `$[${JSON.stringify(fileName)}]`,
      'Required content file could not be read.',
    );
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new ContentFileError(
      'content_json_invalid',
      `$[${JSON.stringify(fileName)}]`,
      'Content file is not valid JSON.',
    );
  }
}

function printIssue(validationIssue: ContentValidationIssue): void {
  console.error(
    `${validationIssue.code} ${validationIssue.path}: ${validationIssue.message}`,
  );
}

async function main(): Promise<void> {
  try {
    const directory = contentDirectory(process.argv.slice(2));
    const entries = await Promise.all(
      Object.entries(fileNames).map(async ([key, fileName]) => [
        key,
        await readJson(directory, fileName),
      ]),
    );
    const result = validateContentCatalog(Object.fromEntries(entries));

    if (!result.ok) {
      result.issues.forEach(printIssue);
      process.exitCode = 1;
      return;
    }

    console.info(
      `Content ${result.catalog.manifest.content_version} is valid: ` +
        `${result.catalog.body_regions.length} body regions, ` +
        `${result.catalog.equipment.length} equipment records, ` +
        `${result.catalog.modes.length} modes, ` +
        `${result.catalog.manifest.exercises.length} exercises.`,
    );
  } catch (error) {
    if (error instanceof ContentFileError) {
      console.error(`${error.code} ${error.path}: ${error.message}`);
      process.exitCode = 1;
      return;
    }

    console.error('content_validation_failed $: Unexpected validator failure.');
    process.exitCode = 1;
  }
}

void main();
