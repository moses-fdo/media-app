import { Me } from '../api/types';

export function privateProfile(profile: Me): Me {
  if (profile.account_mode !== 'personal') {
    throw new Error('Account service needs an update. Please try again after the service is updated.');
  }
  return profile;
}
