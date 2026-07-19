/**
 * Local id generator for guest-mode entities (not security-sensitive). Cloud
 * rows get their ids from Postgres `gen_random_uuid()` instead.
 */
export function newId(): string {
  const rand = () => Math.random().toString(16).slice(2, 10);
  return `local-${Date.now().toString(16)}-${rand()}${rand()}`;
}
