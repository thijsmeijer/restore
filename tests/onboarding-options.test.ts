import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  bodyRegionOptions,
  equipmentOptions,
  trainingTypeGroups,
  trainingTypeOptions,
} from '@/features/onboarding/profile-options';
import { bodyRegionSchema, equipmentSchema } from '@/content/schemas';

function readJson(fileName: string): unknown {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), 'content', fileName), 'utf8'),
  ) as unknown;
}

describe('onboarding option catalogs', () => {
  it('matches every selectable canonical body region and its laterality', () => {
    const content = bodyRegionSchema
      .array()
      .parse(readJson('body-regions.json'));

    expect(
      content
        .filter((region) => region.selectable)
        .map(({ slug, laterality, surface }) => ({
          slug,
          laterality,
          surface,
        })),
    ).toEqual(
      bodyRegionOptions.map(({ slug, laterality, surface }) => ({
        slug,
        laterality,
        surface,
      })),
    );
  });

  it('matches every active equipment identity and slug', () => {
    const content = equipmentSchema.array().parse(readJson('equipment.json'));

    expect(
      content
        .filter((entry) => entry.active)
        .map(({ id, slug }) => ({ id, slug })),
    ).toEqual(equipmentOptions.map(({ id, slug }) => ({ id, slug })));
  });

  it('places every supported training type in one understandable group', () => {
    expect(trainingTypeGroups.flatMap((group) => group.values).sort()).toEqual(
      trainingTypeOptions.map((option) => option.value).sort(),
    );
  });
});
