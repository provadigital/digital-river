/* eslint-disable @typescript-eslint/no-explicit-any */
import pThrottle from 'p-throttle'
import type { EventContext } from '@vtex/api'
import { ResolverError } from '@vtex/api'
import { getSession } from '../resolvers/session/service'
import type { SessionFields } from '../resolvers/session/sessionResolver'
import convertIso3To2 from 'country-iso-3-to-2'

import {
  countries,
  schema,
  DIGITAL_RIVER_GROUP_SPECS,
  SPECIFICATION_FIELD_TEXT,
  SPECIFICATION_FIELD_COMBO,
  DATA_ENTITY,
  SCHEMA_NAME,
  DATA_ENTITY_CHECKOUT,
  schemaCheckout
} from '../constants'

export const CHECKOUT_VTEX_COM = 'checkout.vtex.com'

const fields = ['_all']
const pagination = {
  page: 1,
  pageSize: 10,
}

let sort = 'dateLog DESC'

let where = ''

const throttle = pThrottle({
  limit: 25,
  interval: 60000,
})

const getAppId = (): string => {
  return process.env.VTEX_APP_ID ?? ''
}

export async function digitalRiverSetup(
  ctx: Context,
  next: () => Promise<unknown>
) {
  const {
    clients: { catalog, masterdata },
  } = ctx

  const specifications = await catalog.getSpecifications()

  if (specifications && specifications.length > 0) {
    let digitalRiverGroup = specifications.find(
      (spec: any) => spec.Name === DIGITAL_RIVER_GROUP_SPECS
    )

    if (!digitalRiverGroup) {
      digitalRiverGroup = await catalog.createSpecification(
        DIGITAL_RIVER_GROUP_SPECS
      )
      await catalog.createSpecificationField(
        digitalRiverGroup.Id,
        'ECCN',
        SPECIFICATION_FIELD_TEXT
      )
      const field = await catalog.createSpecificationField(
        digitalRiverGroup.Id,
        'Country of origin',
        SPECIFICATION_FIELD_COMBO
      )

      for (let i = 0; i < countries.length; i++) {
        catalog.createSpecificationValue(field.Id, countries[i], i + 1)
      }
    }
  }

  const schemaLogs = await masterdata.getSchema({
    dataEntity: DATA_ENTITY,
    schema: SCHEMA_NAME,
  })

  if (!schemaLogs) {
    await masterdata.createOrUpdateSchema({
      dataEntity: DATA_ENTITY,
      schemaName: SCHEMA_NAME,
      schemaBody: schema,
    })
  }

  const schemaCheckoutOrder = await masterdata.getSchema({
    dataEntity: DATA_ENTITY_CHECKOUT,
    schema: SCHEMA_NAME,
  })

  if (!schemaCheckoutOrder) {
    await masterdata.createOrUpdateSchema({
      dataEntity: DATA_ENTITY_CHECKOUT,
      schemaName: SCHEMA_NAME,
      schemaBody: schemaCheckout,
    })
  }

  ctx.status = 200
  await next()
}

export async function digitalRiverCatalogLogs(
  ctx: Context,
  next: () => Promise<unknown>
) {
  const {
    clients: { masterdata },
    query,
  } = ctx

  if (query?.page && query?.pageSize) {
    pagination.page = parseInt(query.page, 10)
    pagination.pageSize = parseInt(query.pageSize, 10)
  }

  if (query?.sort) {
    sort = query.sort
  }

  if (query?.where) {
    where = query.where
  }

  const data = await masterdata.searchDocumentsWithPaginationInfo({
    dataEntity: DATA_ENTITY,
    fields,
    schema: SCHEMA_NAME,
    pagination,
    sort,
    where,
  })

  ctx.status = 200
  ctx.body = { ...data }
  await next()
}

export async function digitalRiverSkuSync(
  ctx: EventContext<any>,
  next: () => Promise<void>
) {
  const {
    clients: { apps },
    body,
  }: { clients: any; body: any } = ctx

  const app: string = getAppId()
  const settings: AppSettings = await apps.getAppSettings(app)

  if (settings.isAutomaticSync) {
    createOrUpdateSku(ctx, settings, { skuId: body.IdSku, origin: 'trigger' })
  }

  await next()
}

const throttled = throttle(
  (ctx: Context, settings: AppSettings, skuSync: SkuSync) => {
    createOrUpdateSku(ctx, settings, skuSync)
  }
)

export async function digitalRiverCatalogSync(
  ctx: Context,
  next: () => Promise<unknown>
) {
  const {
    clients: { apps, catalog },
  } = ctx

  const origin = 'full sync'
  const app: string = getAppId()
  const settings = await apps.getAppSettings(app)
  let skusResponse: any = null
  let skus: any = []
  let page = 1

  while (skusResponse == null || skusResponse.length > 0) {
    // eslint-disable-next-line no-await-in-loop
    skusResponse = await catalog.getSkus(page, 1000)
    skus = skus.concat(skusResponse)
    page++
  }

  for (let i = 0; i < skus.length; i++) {
    const skuId = skus[i]
    const skuSync = {
      skuId,
      origin,
    }

    throttled(ctx, settings, skuSync)
  }

  ctx.status = 200
  await next()
}

async function createOrUpdateSku(
  ctx: EventContext<any> | Context,
  settings: AppSettings,
  skuSync: SkuSync
) {
  const {
    clients: { catalog, masterdata, digitalRiver },
    vtex: { logger },
  } = ctx

  let dataProductSku

  try {
    dataProductSku = await catalog.getProductBySku(skuSync.skuId)
  } catch (err) {
    logger.error({
      error: err,
      skuId: skuSync.skuId,
      origin: skuSync.origin,
      message: 'DigitalRiverCreateOrUpdateSku-catalogProductBySku',
    })

    throw new ResolverError({
      message: 'Create Update Sku failed',
      error: err,
    })
  }

  if (!dataProductSku.IsActive) {
    return
  }

  let dataProduct
  const productId = dataProductSku.ProductId

  try {
    dataProduct = await catalog.getProductById(productId)
  } catch (err) {
    logger.error({
      error: err,
      productId,
      skuId: skuSync.skuId,
      origin: skuSync.origin,
      message: 'DigitalRiverCreateOrUpdateSku-catalogProductById',
    })

    throw new ResolverError({
      message: 'Create Update Sku failed',
      error: err,
    })
  }

  let dataSpecs

  try {
    dataSpecs = await catalog.getProductSpecifications(productId)
  } catch (err) {
    logger.error({
      error: err,
      productId,
      skuId: skuSync.skuId,
      origin: skuSync.origin,
      message: 'DigitalRiverCreateOrUpdateSku-catalogProductSpecifications',
    })

    throw new ResolverError({
      message: 'Create Update Sku failed',
      error: err,
    })
  }

  const name = dataProductSku.Name
  const taxCode = dataProduct.TaxCode
  let eccn
  let countryOfOrigin = ''

  for (let j = 0; j < dataSpecs.length; j++) {
    if (dataSpecs[j].Name === 'Country of origin' && dataSpecs[j].Value[0]) {
      countryOfOrigin = dataSpecs[j].Value[0]
    }

    if (dataSpecs[j].Name === 'ECCN' && dataSpecs[j].Value[0]) {
      eccn = dataSpecs[j].Value[0]
    }

    if (countryOfOrigin && eccn) {
      break
    }
  }

  const skuPayload = {
    name,
    eccn,
    taxCode,
    countryOfOrigin: countryOfOrigin.split('-')[0].trim(),
  }

  const mdPayload = {
    productId: productId.toString(),
    productSku: skuSync.skuId.toString(),
    requestData: JSON.stringify(skuPayload),
    responseData: '',
    origin: skuSync.origin,
    error: false,
    dateLog: new Date().getTime().toString(),
  }

  if (eccn && countryOfOrigin && taxCode) {
    // DR
    try {
      const response = await digitalRiver.createSku({
        settings,
        skuId: skuSync.skuId,
        skuPayload,
      })

      mdPayload.responseData = JSON.stringify(response)
    } catch (err) {
      mdPayload.error = true
      mdPayload.responseData = err?.response?.statusText
    }

    masterdata.createDocument({
      dataEntity: DATA_ENTITY,
      fields: mdPayload,
      schema: SCHEMA_NAME,
    })
  } else {
    // missing eccn or country of origin
    mdPayload.error = true
    mdPayload.responseData = `Missing ${!eccn ? ' - ECCN' : ''} ${
      !countryOfOrigin ? ' - Country Of Origin' : ''
    } ${!taxCode ? ' - Tax Code' : ''}`
    masterdata.createDocument({
      dataEntity: DATA_ENTITY,
      fields: mdPayload,
      schema: SCHEMA_NAME,
    })
  }
}

export async function digitalRiverProfile(
  ctx: Context,
  next: () => Promise<unknown>
) {
  
  const { cookies, clients: { orderForm, apps } } = ctx
  const orderFormCookie = cookies.get(CHECKOUT_VTEX_COM)
  const orderFormId = orderFormCookie?.split('=')[1];
  const app: string = getAppId()
  const settings: AppSettings = await apps.getAppSettings(app)

  const order = await orderForm.getOrderForm(orderFormId, settings.vtexAppKey, settings.vtexAppToken)

  const sessionData: SessionFields = await getSession(ctx)

  const profileData = sessionData.impersonate?.profile
    ? sessionData.impersonate.profile
    : sessionData.profile

  const {address} = order.shippingData || {}
  const code: any = convertIso3To2((address?.country as string)?.toUpperCase())
  
  const response = {
    locale: order.clientPreferencesData?.locale ? order.clientPreferencesData?.locale.toLowerCase() : 'en_US',
    firstName: profileData?.firstName,
    lastName: profileData?.lastName,
    email: profileData?.email,
    phoneNumber: order?.clientProfileData?.phone,
    address: {
      line1: order.shippingData?.address && `${
        order.shippingData?.address?.number
          ? `${order.shippingData?.address?.number} `
          : ''
      }${order.shippingData?.address?.street}`,
      line2: order.shippingData?.address?.complement,
      city: order.shippingData?.address?.city,
      state: order.shippingData?.address?.state,
      postalCode: order.shippingData?.address?.postalCode,
      country: code && 'US'
    }

  }
  ctx.status = 200
  ctx.body = { ...response}
  await next()
}

export async function digitalRiverDeleteSource(
  ctx: Context,
  next: () => Promise<unknown>
) {
  
  const { id } = ctx.vtex.route.params
  const { clients: { digitalRiver, apps } } = ctx

  const app: string = getAppId()
  const settings: AppSettings = await apps.getAppSettings(app)
  const sessionData: SessionFields = await getSession(ctx)

  const profileData = sessionData.impersonate?.profile
    ? sessionData.impersonate.profile
    : sessionData.profile
  
  const customerId = profileData?.id as string
  const sourceId = id as string
  await digitalRiver.detachSourceCustomer({ settings, customerId, sourceId})
  
  ctx.status = 200
  await next()
}

export async function digitalRiverAddSource(
  ctx: Context,
  next: () => Promise<unknown>
) {
  
  const { id } = ctx.vtex.route.params
  const { clients: { digitalRiver, apps } } = ctx

  const app: string = getAppId()
  const settings: AppSettings = await apps.getAppSettings(app)
  const sessionData: SessionFields = await getSession(ctx)

  const profileData = sessionData.impersonate?.profile
    ? sessionData.impersonate.profile
    : sessionData.profile
  
  const customerId = profileData?.id as string
  const sourceId = id as string
  await digitalRiver.attachSourceCustomer({ settings, customerId, sourceId})
  //console.log('R', response)
  ctx.status = 200
  await next()
}

export async function digitalRiverFileLinks(
  ctx: Context,
  next: () => Promise<unknown>
) {
  const {
    clients: { digitalRiver, apps, orders },
    vtex: { logger, route },
  } = ctx
  const response = []
  const orderId = route.params.id.toString()
  let orderResponse = null
  logger.info({
    message: 'DigitalRiverFileLinks-digitalRiverFileLinks',
    orderId
  })

  const app: string = getAppId()
  const settings: AppSettings = await apps.getAppSettings(app)

  try {
    orderResponse = await orders.getOrder({
      orderId,
      ...settings
    })

    logger.info({
      message: 'DigitalRiverFileLinks-getOrder',
      orderId
    })
  } catch (err) {
    logger.error({
      error: err,
      orderId,
      message: 'DigitalRiverFileLinks-getOrderFailure',
    })

    throw new ResolverError({
      message: `Get order by ID error using Order ID ${orderId}`,
      error: err,
    })
  }
  //TODO CHANGE FOR
  let digitalRiverOrderResponse
  const {paymentSystemName, tid} = orderResponse.paymentData.transactions[0].payments[0]
  if (paymentSystemName == 'DigitalRiver') {
    console.log('TID', tid)
    try {
      digitalRiverOrderResponse = await digitalRiver.getOrderById({
        settings,
        orderId: tid,
      })
  
      logger.info({
        message: 'DigitalRiverFileLinks-getOrderById',
        tid,
        data: digitalRiverOrderResponse,
      })
    } catch (err) {
      logger.error({
        error: err,
        tid,
        message: 'DigitalRiverFileLinks-getOrderByIdFailure',
      })
  
      throw new ResolverError({
        message: `Get order by ID error using Digital River Order ID ${
          tid
        }`,
        error: err,
      })
    }
    
    const dateExpire = new Date()
    dateExpire.setDate(dateExpire.getDate() + 30)
    const expiresTime = `${dateExpire.getFullYear()}-${dateExpire.getMonth() + 1}-${dateExpire.getDate()}T00:00:00Z`
    if (digitalRiverOrderResponse.invoicePDFs) {
      for (let i = 0; i < digitalRiverOrderResponse.invoicePDFs.length; i++) {
        const payload = {
          fileId: digitalRiverOrderResponse.invoicePDFs[i].id,
          expiresTime
        }
        const fileResponse = await digitalRiver.createFileLink({ settings, payload})
        fileResponse.name = 'Download invoice'
        response.push(fileResponse)
      }
    }
    if (digitalRiverOrderResponse.creditMemoPDFs) {
      for (let i = 0; i < digitalRiverOrderResponse.creditMemoPDFs.length; i++) {
        const payload = {
          fileId: digitalRiverOrderResponse.creditMemoPDFs[i].id,
          expiresTime
        }
        const fileResponse = await digitalRiver.createFileLink({ settings, payload})
        fileResponse.name = 'Download memo'
        response.push(fileResponse)
      }
    }
  }

  ctx.status = 200
  ctx.body = response
  await next()
}





