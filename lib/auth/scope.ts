export function hasTerritorialView(params: {
  isGlobalAdmin: boolean;
  isReadOnly: boolean;
  canSelectSchool: boolean;
  accessibleRbds: string[];
}) {
  const { isGlobalAdmin, isReadOnly, canSelectSchool, accessibleRbds } = params;

  return isGlobalAdmin || isReadOnly || canSelectSchool || accessibleRbds.length > 1;
}