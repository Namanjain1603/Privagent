export function resolveTarget(targetId: string): HTMLElement | null {
  // Try finding by our data attribute first
  const elByData = document.querySelector(`[data-privagent-target="${targetId}"]`);
  if (elByData) return elByData as HTMLElement;

  // Fallback: id
  const elById = document.getElementById(targetId);
  if (elById) return elById as HTMLElement;

  // Fallback: name
  const elByName = document.getElementsByName(targetId)[0];
  if (elByName) return elByName as HTMLElement;

  return null;
}
