import { createUlid } from '@/domain/identifiers';

describe('application identifiers', () => {
  it('creates a canonical 26-character Crockford ULID', () => {
    const identifier = createUlid(
      () => 0,
      () => 0,
    );

    expect(identifier).toBe('00000000000000000000000000');
    expect(identifier).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it('rejects timestamps outside the ULID range and invalid randomness', () => {
    expect(() =>
      createUlid(
        () => 2 ** 48,
        () => 0,
      ),
    ).toThrow(RangeError);
    expect(() =>
      createUlid(
        () => 0,
        () => Number.NaN,
      ),
    ).toThrow(RangeError);
  });
});
