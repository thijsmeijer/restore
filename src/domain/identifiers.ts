const crockfordBase32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(timestamp: number): string {
  let remaining = timestamp;
  let result = '';

  for (let index = 0; index < 10; index += 1) {
    result = crockfordBase32[remaining % 32] + result;
    remaining = Math.floor(remaining / 32);
  }

  return result;
}

export function createUlid(
  now: () => number = Date.now,
  random: () => number = Math.random,
): string {
  const timestamp = now();
  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp < 0 ||
    timestamp >= 2 ** 48
  ) {
    throw new RangeError(
      'ULID timestamp must be a non-negative 48-bit integer.',
    );
  }

  let randomness = '';
  for (let index = 0; index < 16; index += 1) {
    const sample = random();
    if (!Number.isFinite(sample)) {
      throw new RangeError('ULID randomness must be finite.');
    }
    const value = Math.min(Math.max(sample, 0), 1 - Number.EPSILON);
    randomness += crockfordBase32[Math.floor(value * 32)];
  }

  return `${encodeTime(timestamp)}${randomness}`;
}
