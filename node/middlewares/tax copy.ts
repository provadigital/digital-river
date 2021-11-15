import { json } from 'co-body'
import { UserInputError, AuthenticationError } from '@vtex/api'
//import { applicationId } from '../constants'
/*
import { UserInputError, AuthenticationError } from '@vtex/api'
import { createCheckout } from './checkout'
*/
const getAppId = (): string => {
  return process.env.VTEX_APP_ID ?? ''
}

// NOTE! This tax integration is not yet fully functional.
// TODO: Figure out a good way to send the checkoutId and paymentSessionId to the front end
// Initially the intent was to save these values to the orderForm, but this causes an endless loop
// because updating the orderForm causes a new tax calculation request to be sent.
// Maybe the values can be returned in the tax hub response? `jurisCode` field is a possibility
// Or maybe we need to save the values to vbase?

// TODO: Move shipFrom address to each item in case items are coming from different docks
// See checkout.ts where this was already done

/*
function getPayloadCheckout(checkoutRequest : CheckoutRequest, checkoutDR : DRCheckoutResponse) {
  const items = []
  for (const [_, itemDR] of checkoutDR.items.entries()) {
    const itemRequest = checkoutRequest.items.find(item => item.sku == itemDR.skuId)
    if (itemRequest) {
      const newItem: CheckoutItem = {
        skuId: itemDR.skuId,
        quantity: itemRequest.quantity,
        price: itemRequest.itemPrice / 100,
        discount: itemRequest.discountPrice ? {
          amountOff: itemRequest.discountPrice / 100 / itemRequest.quantity,
          quantity: itemRequest.quantity,
        } : undefined,
        metadata: itemDR.metadata,
        shipFrom: itemDR.shipFrom
      }
      items.push(newItem)
    }
    
  }
  console.log('sss', checkoutRequest)
  
  const shipping = checkoutRequest.totals.find(total => total.id === 'Shipping')
  const checkoutPayload: DRCheckoutPayload = {
    applicationId : checkoutDR.applicationId,
    currency: checkoutDR.currency,
    taxInclusive: false,
    email: checkoutDR.email,
    locale: checkoutDR.locale,
    shipFrom: checkoutDR.shipFrom,
    shipTo: {
      ...checkoutDR.shipTo,
      name: checkoutDR.shipTo.name,
      phone: checkoutDR.shipTo.phone,
      address: {
        line1: checkoutRequest.shippingDestination?.street || 'Unknown',
        line2: checkoutRequest.shippingDestination?.complement || '',
        city: checkoutRequest.shippingDestination?.city || 'Unknown',
        state: checkoutRequest.shippingDestination?.state || '',
        postalCode: checkoutRequest.shippingDestination?.postalCode || '',
        country: 'US',
      },
    },
    items,
    shippingChoice: {
      amount: shipping ? shipping.value / 100 : 0,
      description: '',
      serviceLevel: '',
    },
  }
  return checkoutPayload
}
*/
export async function digitalRiverOrderTaxHandler(
  ctx: Context,
  next: () => Promise<unknown>
) {
 
  const {
    clients: { apps, orderForm },
    req,
    req: {
      headers: { authorization },
    },
    vtex: { logger },
  } = ctx
  
  const app: string = getAppId()
  const settings = await apps.getAppSettings(app)

  if (!authorization || authorization !== settings.digitalRiverToken) {
    throw new AuthenticationError('Unauthorized application!')
  }

  if (!settings.vtexAppKey || !settings.vtexAppToken) {
    throw new AuthenticationError('Missing VTEX app key and token')
  }
  
  const checkoutRequest = (await json(req)) as any

  logger.info({
    message: 'DigitalRiverTaxCalculation-vtexRequestBody',
    checkoutRequest,
  })

  if (!checkoutRequest?.orderFormId) {
    throw new UserInputError('No orderForm ID provided')
  }

  const orderFormData = await orderForm.getOrderForm(
    checkoutRequest.orderFormId,
    settings.vtexAppKey,
    settings.vtexAppToken
  )
  console.log('OF', orderFormData)

  /*
  const checkoutPayload: DRCheckoutPayload = {
    applicationId,
    currency: checkoutDR.currency,
    taxInclusive: false,
    email: checkoutDR.email,
    locale: checkoutDR.locale,
    shipFrom: checkoutDR.shipFrom,
    shipTo: {
      ...checkoutDR.shipTo,
      name: checkoutDR.shipTo.name,
      phone: checkoutDR.shipTo.phone,
      address: {
        line1: checkoutRequest.shippingDestination?.street || 'Unknown',
        line2: checkoutRequest.shippingDestination?.complement || '',
        city: checkoutRequest.shippingDestination?.city || 'Unknown',
        state: checkoutRequest.shippingDestination?.state || '',
        postalCode: checkoutRequest.shippingDestination?.postalCode || '',
        country: 'US',
      },
    },
    items,
    shippingChoice: {
      amount: shipping ? shipping.value / 100 : 0,
      description: '',
      serviceLevel: '',
    },
  }
  */
  /*
  

  console.log('TAX ID', checkoutRequest.orderFormId);

  

  logger.info({
    message: 'DigitalRiverTaxCalculation-orderFormData',
    orderFormData,
  })

  let checkoutResponse

  if (orderFormData.items.length > 0) {
    let checkoutIdDR
    if (orderFormData.customData) {
      const {customApps} = orderFormData.customData
      for (let i = 0; i < customApps.length; i++) {
        if (customApps[i].id === 'digital-river') {
          checkoutIdDR = customApps[i].fields.checkoutId
        }
      }
    }
    console.log('IDR', checkoutIdDR)
    if (!checkoutIdDR) {
      try {
        checkoutResponse = await createCheckout(ctx, checkoutRequest.orderFormId)
      } catch(err) {}
      
    } else {
      const checkoutDR = await digitalRiver.getCheckout({settings, checkoutId: checkoutIdDR })
      const checkoutPayload = getPayloadCheckout(checkoutRequest, checkoutDR)
      console.log('sss', checkoutPayload)

      checkoutResponse = await digitalRiver.createCheckout({
        settings,
        checkoutPayload,
      })
      await orderForm.setCustomFields(
        checkoutRequest.orderFormId,
        checkoutResponse.id,
        checkoutResponse.paymentSessionId || checkoutResponse.payment.session.id,
      )
    }

  }
  */
  /*
  
  
  console.log('TAX A');
  const taxes = [] as ItemTaxResponse[]
  if (checkoutResponse) {
    const shippingTax = checkoutResponse.shippingChoice.taxAmount
    let shippingTaxPerItemRounded = 0

    if (shippingTax > 0) {
      const shippingTaxPerItem = shippingTax / checkoutResponse.items.length
      shippingTaxPerItemRounded = Math.floor(shippingTaxPerItem * 100) / 100
    }

    const { id: checkoutId, paymentSessionId } = checkoutResponse

    checkoutResponse.items.forEach((item: any, index: any) => {
      const detailsTaxes = [] as Tax[]

      // if (item.tax.amount > 0) {
      detailsTaxes.push({
        name: `TAX`,
        description: `${checkoutId}|${paymentSessionId}`,
        rate: item.tax.rate,
        value: item.tax.amount,
      })
      // }

      if (shippingTaxPerItemRounded) {
        detailsTaxes.push({
          name: `SHIPPING TAX`,
          value: shippingTaxPerItemRounded,
        })
      }

      if (item.importerTax.amount > 0) {
        detailsTaxes.push({
          name: `IMPORTER TAX`,
          value: item.importerTax.amount,
        })
      }

      if (item.duties.amount > 0) {
        detailsTaxes.push({
          name: `DUTIES`,
          value: item.duties.amount,
        })
      }

      if (item.fees.amount > 0) {
        detailsTaxes.push({
          name: `FEES`,
          value: item.fees.amount,
        })

        if (item.fees.taxAmount > 0) {
          detailsTaxes.push({
            name: `FEE TAX`,
            value: item.fees.taxAmount,
          })
        }
      }
      console.log('DETAIL', detailsTaxes)
      taxes.push({
        id: item.metadata?.taxHubRequestId ?? index.toString(),
        taxes: detailsTaxes,
      })
    })
    console.log('TAX B');
    logger.info({
      message: 'DigitalRiverTaxCalculation-TaxHubResponse',
      taxHubResponse: { itemTaxResponse: taxes, hooks: [] },
    })

  }
  
  /*
  console.log('TAXES', taxes)

  ctx.body = {
    itemTaxResponse: taxes,
    hooks: [],
  } as TaxResponse
  */

  //console.log('TAXES', taxes)
  const taxesT = [] as Tax[]
  const taxesR = [] as ItemTaxResponse[]
  //if () {
    taxesT.push({
      name: 'TAX 1',
        value: 3.48
    })
    taxesT.push({
      name: 'TAX 2',
        value: 23
    })
    
    taxesR.push({
      id: '0',
      taxes: taxesT
    })
  //}

  ctx.body = {
    itemTaxResponse: taxesR,
    hooks: [],
  } as TaxResponse

  ctx.set('Content-Type', 'application/vnd.vtex.checkout.minicart.v1+json')
  console.log('TAXES', taxesT)
  await next()
}
