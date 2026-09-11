type UserForPermissions = {
  id: string;
  role: "admin" | "manager" | "employee";
  isMaster: boolean;
};

export function canManageUser(
  actor: UserForPermissions,
  target: UserForPermissions,
): boolean {
  if (actor.id === target.id) return false;
  if (actor.role === "admin") return true;
  if (actor.role === "manager" && target.role === "employee") return true;
  if (
    actor.role === "manager" &&
    target.role === "manager" &&
    actor.isMaster === true &&
    target.isMaster === false
  ) {
    return true;
  }
  return false;
}
