import { clearWorkspaceCache } from '../src/auth/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: jest.fn().mockResolvedValue(['media-cache:workspace:request', 'appearance']),
  multiRemove: jest.fn().mockResolvedValue(undefined),
}));

test('clears sensitive offline request data without removing unrelated preferences', async () => {
  await clearWorkspaceCache();
  expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['media-cache:workspace:request']);
});
