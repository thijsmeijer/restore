import {
  checkInSafetyRulesVersion,
  evaluateCheckInSafety,
} from '@/features/safety/check-in-safety';

import { blockingSafetyFixtures } from './fixtures/safety/check-in-safety';

describe('SAFE-001 check-in safety classifier', () => {
  it('classifies an explicit no-signals response as clear', () => {
    expect(evaluateCheckInSafety({ reportedSignals: [] })).toEqual({
      ok: true,
      result: {
        state: 'clear',
        rulesVersion: checkInSafetyRulesVersion,
        matchedRuleIds: [],
        reasonCodes: [],
      },
    });
  });

  it.each(blockingSafetyFixtures)(
    'blocks the $signal fixture with stable identifiers',
    ({ signal, ruleId, reasonCode }) => {
      expect(evaluateCheckInSafety({ reportedSignals: [signal] })).toEqual({
        ok: true,
        result: {
          state: 'blocked',
          rulesVersion: checkInSafetyRulesVersion,
          matchedRuleIds: [ruleId],
          reasonCodes: [reasonCode],
        },
      });
    },
  );

  it('uses rule order and the most conservative result for combined input', () => {
    expect(
      evaluateCheckInSafety({
        reportedSignals: [
          'rapidly_worsening_problem',
          'sudden_severe_pain',
          'new_numbness_or_tingling',
        ],
      }),
    ).toEqual({
      ok: true,
      result: {
        state: 'blocked',
        rulesVersion: checkInSafetyRulesVersion,
        matchedRuleIds: [
          'block_sudden_severe_pain_v1',
          'block_new_numbness_or_tingling_v1',
          'block_rapidly_worsening_problem_v1',
        ],
        reasonCodes: [
          'reported_sudden_severe_pain',
          'reported_new_numbness_or_tingling',
          'reported_rapidly_worsening_problem',
        ],
      },
    });
  });

  it('rejects unknown and duplicate structured signals', () => {
    expect(
      evaluateCheckInSafety({
        reportedSignals: [
          'sudden_severe_pain',
          'unknown' as 'sudden_severe_pain',
          'sudden_severe_pain',
        ],
      }),
    ).toEqual({
      ok: false,
      issues: [
        {
          code: 'check_in_safety_unknown_signal',
          path: '$.safety.reportedSignals[1]',
        },
        {
          code: 'check_in_safety_duplicate_signal',
          path: '$.safety.reportedSignals',
        },
      ],
    });
  });

  it('fails closed for an unavailable historical rules version', () => {
    expect(evaluateCheckInSafety({ reportedSignals: [] }, 'unknown')).toEqual({
      ok: false,
      issues: [
        {
          code: 'check_in_safety_unknown_rules_version',
          path: '$.safetyRulesVersion',
        },
      ],
    });
  });
});
