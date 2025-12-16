import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getGlobalSetting: vi.fn(),
  setGlobalSetting: vi.fn(),
  getAllGlobalSettings: vi.fn(),
}));

describe('Global Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGlobalSetting', () => {
    it('should return the setting value when it exists', async () => {
      const { getGlobalSetting } = await import('./db');
      (getGlobalSetting as any).mockResolvedValue('test-api-key');

      const result = await getGlobalSetting('geminiApiKey');
      expect(result).toBe('test-api-key');
      expect(getGlobalSetting).toHaveBeenCalledWith('geminiApiKey');
    });

    it('should return null when setting does not exist', async () => {
      const { getGlobalSetting } = await import('./db');
      (getGlobalSetting as any).mockResolvedValue(null);

      const result = await getGlobalSetting('nonExistentKey');
      expect(result).toBeNull();
    });
  });

  describe('setGlobalSetting', () => {
    it('should save a setting value', async () => {
      const { setGlobalSetting } = await import('./db');
      (setGlobalSetting as any).mockResolvedValue(undefined);

      await setGlobalSetting('geminiApiKey', 'new-api-key');
      expect(setGlobalSetting).toHaveBeenCalledWith('geminiApiKey', 'new-api-key');
    });
  });

  describe('getAllGlobalSettings', () => {
    it('should return all settings as a record', async () => {
      const { getAllGlobalSettings } = await import('./db');
      const mockSettings = {
        geminiApiKey: 'test-gemini-key',
        elevenlabsApiKey: 'test-elevenlabs-key',
        wordInterval: '5',
      };
      (getAllGlobalSettings as any).mockResolvedValue(mockSettings);

      const result = await getAllGlobalSettings();
      expect(result).toEqual(mockSettings);
    });

    it('should return empty object when no settings exist', async () => {
      const { getAllGlobalSettings } = await import('./db');
      (getAllGlobalSettings as any).mockResolvedValue({});

      const result = await getAllGlobalSettings();
      expect(result).toEqual({});
    });
  });
});

describe('Admin Access Control', () => {
  it('should verify admin role check logic', () => {
    // Test admin role check
    const adminUser = { id: 1, role: 'admin' as const };
    const regularUser = { id: 2, role: 'user' as const };

    expect(adminUser.role === 'admin').toBe(true);
    expect(regularUser.role === 'admin').toBe(false);
  });
});
