import { getTheme, themes } from '../src/theme/themes';

describe('Theme engine', () => {
  it('returns playgrounditor light theme correctly', () => {
    const t = getTheme('playgrounditor', 'light');
    expect(t.name).toBe('playgrounditor');
    expect(t.mode).toBe('light');
    expect(t.colors.background).toBe('#FAF8F5');
    expect(t.colors.primary).toBe('#3A5A40');
  });

  it('returns dracula dark theme correctly', () => {
    const t = getTheme('dracula', 'dark');
    expect(t.name).toBe('dracula');
    expect(t.mode).toBe('dark');
    expect(t.colors.background).toBe('#282a36');
  });

  it('ensures all themes have light and dark variants defined', () => {
    for (const key of Object.keys(themes)) {
      const entry = themes[key as keyof typeof themes];
      expect(entry.light).toBeDefined();
      expect(entry.dark).toBeDefined();
      expect(entry.light.background).toBeDefined();
      expect(entry.dark.background).toBeDefined();
    }
  });
});
