import { ResolverError } from '@vtex/api'

import { sessionFields } from './sessionResolver'

export const VTEX_SESSION = 'vtex_session'

export async function getSession(context: Context) {
  const {
    clients: { session },
    cookies,
  } = context

  const sessionCookie = cookies.get(VTEX_SESSION)

  if (sessionCookie === undefined) {
    throw new ResolverError(
      `Invalid request for session, the ${VTEX_SESSION} wasn't provided!`
    )
  }

  const { sessionData } = await session.getSession(sessionCookie, ['*'])

  return sessionFields(sessionData)
}
