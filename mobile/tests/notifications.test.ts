import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '../src/notifications';
import { api } from '../src/auth/context';
const mockExtra = { eas: { projectId: 'test-project' }, notifications: { androidConfigured: false } };
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { get extra() { return mockExtra; } } } }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-notifications', () => ({ AndroidImportance: { HIGH: 4 }, setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined), getPermissionsAsync: jest.fn().mockResolvedValue({status:'granted'}), requestPermissionsAsync: jest.fn(), getExpoPushTokenAsync: jest.fn().mockResolvedValue({data:'ExponentPushToken[test]'}) }));
jest.mock('../src/auth/context', () => ({api:{post:jest.fn().mockResolvedValue({ok:true}),delete:jest.fn()}}));
beforeEach(()=>{jest.replaceProperty(Platform,'OS','android');mockExtra.notifications.androidConfigured=false;jest.clearAllMocks();});
afterEach(()=>jest.restoreAllMocks());
test('missing Firebase configuration fails clearly before requesting a token or registering a device',async()=>{
 await expect(registerForPushNotifications()).rejects.toThrow('not configured');
 expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();expect(api.post).not.toHaveBeenCalled();
});
test('configured Android builds register the actual Expo token with the backend',async()=>{
 mockExtra.notifications.androidConfigured=true;
 await expect(registerForPushNotifications()).resolves.toBe('ExponentPushToken[test]');
 expect(api.post).toHaveBeenCalledWith('/devices',{token:'ExponentPushToken[test]'});
});
