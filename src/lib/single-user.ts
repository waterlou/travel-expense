export const SINGLE_USER_ID = 'single-user'
export const SINGLE_USER_NAME = 'Admin'

// Structural subset of TravelMember as served by the API (Prisma entity).
export interface TravelMemberLike {
  id: string
  userId: string | null
  name: string
  isAdmin: boolean
}

export function isSingleUserMode(): boolean {
  return process.env.NEXT_PUBLIC_SINGLE_USER_MODE === 'true'
}

// Resolve the current user's TravelMember. In single-user mode the sole
// member IS the current user; otherwise match by session user id.
export function resolveCurrentMember(
  members: TravelMemberLike[] | undefined | null,
  userId?: string | null
): TravelMemberLike | null {
  if (isSingleUserMode()) return members?.[0] ?? null
  return members?.find((m) => m.userId === userId) ?? null
}
