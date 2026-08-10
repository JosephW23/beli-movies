export function usernameFromFullName(fullName: string) {
  const normalized = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);

  if (!normalized) return "watchduser";
  return normalized.length >= 3 ? normalized : `${normalized}watchd`.slice(0, 24);
}
