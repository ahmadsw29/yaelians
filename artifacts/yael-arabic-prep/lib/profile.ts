type ProfileIdentity = {
  firstName?: string | null;
  lastName?: string | null;
  unsafeMetadata?: Record<string, unknown>;
};

/** Profile names are display data only, never authorization claims. */
export function getProfileNames(user: ProfileIdentity | null | undefined) {
  const metadata = user?.unsafeMetadata;
  const firstName = typeof metadata?.firstName === 'string'
    ? metadata.firstName.trim()
    : user?.firstName?.trim() || '';
  const lastName = typeof metadata?.lastName === 'string'
    ? metadata.lastName.trim()
    : user?.lastName?.trim() || '';
  return { firstName, lastName, fullName: [firstName, lastName].filter(Boolean).join(' ') };
}
