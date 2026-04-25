import { describe, expect, it } from 'vitest';
import { shouldAutoJump } from '../mobs';

describe('shouldAutoJump', () => {
  it('jumps a 1-block step', () => {
    expect(shouldAutoJump(true, false, false, true)).toBe(true);
  });

  it('does not jump a 2-block wall (head also blocked)', () => {
    expect(shouldAutoJump(true, true, false, true)).toBe(false);
  });

  it('does not jump when there is a ceiling above the head', () => {
    // Stepping up here would slam the head into the ceiling.
    expect(shouldAutoJump(true, false, true, true)).toBe(false);
  });

  it('does not jump while airborne', () => {
    expect(shouldAutoJump(true, false, false, false)).toBe(false);
  });

  it('does not jump on flat ground', () => {
    expect(shouldAutoJump(false, false, false, true)).toBe(false);
  });

  it('does not jump just because the head is blocked', () => {
    // This is the regression: original code triggered on isSolid(by+1)
    // i.e. head blocked, which is exactly the case where jumping would
    // be a bad idea (2-block wall or low ceiling).
    expect(shouldAutoJump(false, true, false, true)).toBe(false);
  });
});
