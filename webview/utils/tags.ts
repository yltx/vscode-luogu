const tagsMap: Record<number, { name: string; color: string }> = {};
const tagsJson = document.getElementById('luogu-tags')?.innerText;
if (tagsJson) {
  for (const t of JSON.parse(tagsJson) as {
    id: number;
    name: string;
    color: string;
  }[]) {
    tagsMap[t.id] = { name: t.name, color: t.color };
  }
}

export function getTag(
  id: number
): { name: string; color: string } | undefined {
  return tagsMap[id];
}
