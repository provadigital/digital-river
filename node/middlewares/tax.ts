import { json } from 'co-body'
import convertIso3To2 from 'country-iso-3-to-2'
import { applicationId } from '../constants'

const getAppId = (): string => {
  return process.env.VTEX_APP_ID ?? ''
}

const getCheckoutPayload = (checkoutDR: CheckoutRequest, orderForm: any, taxInclusive: boolean) => {
  const shippingCountry = checkoutDR.shippingDestination?.country
    ? convertIso3To2(checkoutDR.shippingDestination?.country)
    : 'US'
  const shippingTotal = checkoutDR.totals.find((total: any) => total.id === 'Shipping')?.value
  
  //finish items
  const items = []
  for (const [_, item] of checkoutDR.items.entries()) {
    const newItem: CheckoutItem = {
      skuId: item.sku,
      quantity: item.quantity,
      price: item.itemPrice / item.quantity
    }
    items.push(newItem)
  }
  const checkoutPayload: DRCheckoutPayload = {
    currency: orderForm?.storePreferencesData?.currencyCode ?? 'USD',
    items,
    applicationId,
    taxInclusive,
    email: orderForm.clientProfileData?.email ?? '',
    shipTo: {
      name:
        orderForm.clientProfileData?.firstName &&
          orderForm.clientProfileData?.lastName
          ? `${orderForm.clientProfileData?.firstName} ${orderForm.clientProfileData?.lastName}`
          : '',
      phone: orderForm.clientProfileData?.phone || '',
      address: {
        line1: checkoutDR.shippingDestination?.street || 'Unknown',
        line2: checkoutDR.shippingDestination?.complement || '',
        city: checkoutDR.shippingDestination?.city || 'Unknown',
        state: checkoutDR.shippingDestination?.state || '',
        postalCode: checkoutDR.shippingDestination?.postalCode || '',
        country: shippingCountry
      },
    },
    shippingChoice: {
      amount: shippingTotal ? shippingTotal / 100 : 0,
      description: '',
      serviceLevel: '',
    },
    locale: orderForm.clientPreferencesData?.locale
      ? orderForm.clientPreferencesData?.locale.replace('-', '_')
      : 'en_US'
  }
  return checkoutPayload
}

export async function digitalRiverOrderTaxHandler(
  ctx: Context,
  next: () => Promise<unknown>
) {
  console.log('start')
  const {
    clients: { apps, orderForm, digitalRiver },
    req,
  } = ctx

  const app: string = getAppId()
  const settings = await apps.getAppSettings(app)
  const checkoutRequest = (await json(req)) as CheckoutRequest

  const orderFormData = await orderForm.getOrderForm(
    checkoutRequest.orderFormId,
    settings.vtexAppKey,
    settings.vtexAppToken
  )

  let checkoutResponse
  let taxes = [] as Tax[]
  const taxesResponse = [] as ItemTaxResponse[]
  if (orderFormData?.items.length > 0 && settings.enableTaxCalculation) {
    const checkoutPayload = getCheckoutPayload(checkoutRequest, orderFormData, settings.enableTaxInclusive)
    checkoutResponse = await digitalRiver.createCheckout({ settings, checkoutPayload })
    
    if (checkoutResponse) {
      const shippingTax = checkoutResponse.shippingChoice.taxAmount
      let shippingTaxPerItemRounded = 0
      if (shippingTax > 0) {
        const shippingTaxPerItem = shippingTax / checkoutResponse.items.length
        shippingTaxPerItemRounded = Math.floor(shippingTaxPerItem * 100) / 100
      }
      const itemTaxes = [] as Tax[]
      const shippingTaxes = [] as Tax[]
      const importerTaxes = [] as Tax[]
      const dutiesTaxes = [] as Tax[]
      const fees = [] as Tax[]
      const feesTaxes = [] as Tax[]
      checkoutResponse.items.forEach((item: any, _: any) => {
        if (item.tax.amount > 0) {
          itemTaxes.push({
            name: `Tax`,
            rate: item.tax.rate,
            value: item.tax.amount
          })
        }
        if (shippingTaxPerItemRounded) {
          shippingTaxes.push({
            name: `Shipping Tax`,
            value: shippingTaxPerItemRounded,
          })
        }
        if (item.importerTax.amount > 0) {
          importerTaxes.push({
            name: `Importer Tax`,
            value: item.importerTax.amount,
          })
        }
  
        if (item.duties.amount > 0) {
          dutiesTaxes.push({
            name: `Duties`,
            value: item.duties.amount,
          })
        }

        if (item.fees.amount > 0) {
          fees.push({
            name: `Fees`,
            value: item.fees.amount,
          })
  
          if (item.fees.taxAmount > 0) {
            feesTaxes.push({
              name: `Fee Tax`,
              value: item.fees.taxAmount,
            })
          }
        }
      })
      taxes = taxes.concat(itemTaxes)
      taxes = taxes.concat(shippingTaxes)
      taxes = taxes.concat(importerTaxes)
      taxes = taxes.concat(dutiesTaxes)
      taxes = taxes.concat(fees)
      taxes = taxes.concat(feesTaxes)
      await digitalRiver.deleteCheckout({ settings, checkoutId: checkoutResponse.id })
    }
    taxesResponse.push({
      id: '0',
      taxes
    })
    
  }

  ctx.body = {
    itemTaxResponse: taxesResponse,
    hooks: [],
  } as TaxResponse

  ctx.set('Content-Type', 'application/vnd.vtex.checkout.minicart.v1+json')

  await next()
}
