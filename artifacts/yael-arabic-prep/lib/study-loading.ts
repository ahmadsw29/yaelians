/** Cached progress may refresh silently; only the first required load blocks UI. */
export function shouldBlockStudyLoading(initialized: boolean, fetching: boolean, hasCachedStats: boolean) {
  return !initialized || (fetching && !hasCachedStats);
}
