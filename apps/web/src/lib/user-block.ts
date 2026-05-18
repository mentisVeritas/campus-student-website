type UserBlockSnapshot = {
  isActive: boolean;
  blockedUntil: Date | string | null;
};

export function isUserBlocked(user: UserBlockSnapshot): boolean {
  if (!user.isActive) return true;
  if (!user.blockedUntil) return false;
  const date = user.blockedUntil instanceof Date ? user.blockedUntil : new Date(user.blockedUntil);
  if (!Number.isFinite(date.getTime())) return false;
  return date.getTime() > Date.now();
}
