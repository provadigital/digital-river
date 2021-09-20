/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EventContext } from '@vtex/api'
import { TooManyRequestsError } from '@vtex/api'

const MAX_REQUEST = 10
let COUNTER = 0

export async function throttle(
  _: EventContext<any>,
  next: () => Promise<void>
) {
  COUNTER++
  try {
    if (COUNTER > MAX_REQUEST) {
      throw new TooManyRequestsError()
    }

    await next()
  } finally {
    COUNTER--
  }
}
