/* eslint-disable @typescript-eslint/no-explicit-any */
import { path, toLower } from 'ramda'

interface ProfileFields {
  email?: string
  firstName?: string
  id?: string
  isAuthenticatedAsCustomer?: boolean
  lastName?: string
}

export interface SessionFields {
  adminUserEmail?: string
  adminUserId?: string
  id?: string
  cacheId?: string
  impersonable?: boolean
  impersonate?: { profile: ProfileFields }
  profile?: ProfileFields
  public?: {
    [key: string]: {
      value: string
    }
  }
}

const convertToBool = (str: any) => !!str && toLower(str) === 'true'

const profileFields = (
  profile: SessionProfile,
  user: SessionImpersonate | SessionAuthentication
): ProfileFields => ({
  email:
    path(['email', 'value'], profile) ??
    path(['storeUserEmail', 'value'], user),
  firstName: path(['firstName', 'value'], profile),
  id: path(['id', 'value'], profile),
  isAuthenticatedAsCustomer: convertToBool(
    path(['isAuthenticated', 'value'], profile)
  ),
  lastName: path(['lastName', 'value'], profile),
})

const setProfileData = (
  profile: SessionProfile,
  user: SessionImpersonate | SessionAuthentication
) => {
  if (path(['storeUserId', 'value'], user)) {
    return {
      profile: {
        ...profileFields(profile, user),
      },
    }
  }

  return {}
}

// eslint-disable-next-line @typescript-eslint/ban-types
export const sessionFields = (session: Session): SessionFields | {} => {
  const { namespaces } = session

  return namespaces
    ? {
        adminUserEmail: path(
          ['authentication', 'adminUserEmail', 'value'],
          namespaces
        ),
        adminUserId: path(
          ['authentication', 'adminUserId', 'value'],
          namespaces
        ),
        id: session.id,
        cacheId: session.id,
        impersonable: convertToBool(
          path(['impersonate', 'canImpersonate', 'value'], namespaces)
        ),
        impersonate: {
          ...setProfileData(namespaces.profile, namespaces.impersonate),
        },
        ...setProfileData(namespaces.profile, namespaces.authentication),
      }
    : ({} as any)
}
