import type { CheckInInput } from '@/features/check-in/check-in';
import { validateCheckInInput } from '@/features/check-in/check-in';

function validInput(): CheckInInput {
  return {
    mode: 'daily_restore',
    availableMinutes: 15,
    readiness: null,
    environment: 'home',
    equipmentIds: [],
    regions: [],
    training: null,
    note: null,
  };
}

describe('check-in validation', () => {
  it('accepts a fast check-in with optional observations omitted', () => {
    expect(validateCheckInInput(validInput())).toEqual({
      ok: true,
      value: validInput(),
    });
  });

  it('preserves an unrated focus separately from an explicit zero rating', () => {
    const input: CheckInInput = {
      ...validInput(),
      regions: [
        {
          regionSlug: 'neck',
          side: 'central',
          stiffness: null,
          soreness: null,
          discomfort: null,
        },
        {
          regionSlug: 'wrist',
          side: 'right',
          stiffness: 0,
          soreness: null,
          discomfort: null,
        },
      ],
    };

    expect(validateCheckInInput(input)).toEqual({ ok: true, value: input });
  });

  it('rejects incompatible sides and out-of-range values', () => {
    const result = validateCheckInInput({
      ...validInput(),
      availableMinutes: 91,
      readiness: 0,
      regions: [
        {
          regionSlug: 'thoracic_spine',
          side: 'left',
          stiffness: null,
          soreness: null,
          discomfort: null,
        },
        {
          regionSlug: 'wrist',
          side: 'right',
          stiffness: 11,
          soreness: null,
          discomfort: null,
        },
      ],
      training: { type: 'pull', status: 'completed', stress: 6 },
    });

    expect(result).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        { code: 'check_in_duration_invalid', path: '$.availableMinutes' },
        { code: 'check_in_readiness_invalid', path: '$.readiness' },
        {
          code: 'check_in_body_side_incompatible',
          path: '$.regions[0].side',
        },
        {
          code: 'check_in_rating_invalid',
          path: '$.regions[1].stiffness',
        },
        {
          code: 'check_in_training_stress_invalid',
          path: '$.training.stress',
        },
      ]),
    });
  });
});
