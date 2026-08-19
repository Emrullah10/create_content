import { pickNextThemeId } from '../../../domain/policies/schedule-policy.js';

// Aktif temalar arasindan agirlikli secim yapar, sonra o temanin en eski 'approved' konusunu doner.
export const makePickNextTopic = ({ topicRepo, themeRepo }) => async () => {
  const activeThemes = await themeRepo.list({ activeOnly: true });
  const themeId = pickNextThemeId(activeThemes);
  if (!themeId) return null;

  const topic = await topicRepo.findOldestApprovedByTheme(themeId);
  if (!topic) return topicRepo.findOldestApproved();
  return topic;
};
