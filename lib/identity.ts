export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function initialsFor(name: string | null | undefined, email: string) {
  const source = name?.trim() || email.split("@")[0] || "User";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function colorForIdentity(identity: string) {
  const colors = ["#38bdf8", "#34d399", "#f59e0b", "#fb7185", "#a78bfa", "#2dd4bf"];
  let hash = 0;

  for (let index = 0; index < identity.length; index += 1) {
    hash = (hash * 31 + identity.charCodeAt(index)) % colors.length;
  }

  return colors[Math.abs(hash)];
}
