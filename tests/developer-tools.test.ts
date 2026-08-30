import { developerToolsAvailable } from '@/features/developer/developer-tools';

describe('developer tool availability', () => {
  it('is enabled only for development builds', () => {
    expect(developerToolsAvailable(true)).toBe(true);
    expect(developerToolsAvailable(false)).toBe(false);
  });
});
