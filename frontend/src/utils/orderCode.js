// Human-friendly order code derived from the numeric database ID.
// Keeps the integer primary key intact while showing a mixed format: ML-00042.
export function orderCode(id) {
  const value = Number(id);
  if (!Number.isFinite(value)) return 'ML-00000';
  return `ML-${String(value).padStart(5, '0')}`;
}
