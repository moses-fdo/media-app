import { privateProfile } from '../src/auth/privateProfile';

test('the personal app refuses legacy profiles before opening any event screens', () => {
  expect(() => privateProfile({ account_mode: 'shared' } as any)).toThrow('Account service needs an update');
  expect(() => privateProfile({} as any)).toThrow('Account service needs an update');
});

test('a confirmed private profile is retained', () => {
  const profile = { id: 'one', workspace_id: 'private-one', account_mode: 'personal' } as any;
  expect(privateProfile(profile)).toBe(profile);
});
