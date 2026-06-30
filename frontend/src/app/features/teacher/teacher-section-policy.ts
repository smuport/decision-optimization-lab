export function hasValidReleaseWindow(visibleFrom: string, visibleUntil: string) {
  return !visibleFrom || !visibleUntil || visibleFrom <= visibleUntil;
}

export function toggleReleaseSelection(selected: Set<string>, id: string) {
  const next = new Set(selected);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
}

export function canPublishCaseSelection(selected: Set<string>, saving: boolean) {
  return selected.size > 0 && !saving;
}
