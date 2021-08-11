const pThrottle = require('p-throttle');
import {
  countries,
  schema,
  DIGITAL_RIVER_GROUP_SPECS,
  SPECIFICATION_FIELD_TEXT,
  SPECIFICATION_FIELD_COMBO,
  DATA_ENTITY,
  SCHEMA_NAME,
  MONTHS
 } from '../constants'

const fields = [ '_all' ];
const pagination = {
  page: 1,
  pageSize: 100
}
const throttle = pThrottle({
	limit: 25,
	interval: 60000
});

const getAppId = (): string => {
  return process.env.VTEX_APP_ID ?? ''
}

export async function digitalRiverSetup(
  ctx: Context,
  next: () => Promise<unknown>
) {
  const {
    clients: { catalog, masterdata }
  } = ctx
 
  const specifications = await catalog.getSpecifications();
  if (specifications && specifications.length > 0) {
    let digitalRiverGroup = specifications.find((spec: any) => spec.Name === DIGITAL_RIVER_GROUP_SPECS);
    if (!digitalRiverGroup) {
      digitalRiverGroup = await catalog.createSpecification(DIGITAL_RIVER_GROUP_SPECS);
      await catalog.createSpecificationField(digitalRiverGroup.Id, 'ECCN', SPECIFICATION_FIELD_TEXT);
      const field = await catalog.createSpecificationField(digitalRiverGroup.Id, 'Country of origin', SPECIFICATION_FIELD_COMBO);
      countries.forEach(country => catalog.createSpecificationValue(field.Id, country));
    }
    
  }

  const schemaLogs = await masterdata.getSchema({dataEntity: DATA_ENTITY, schema: SCHEMA_NAME});
  if (!schemaLogs) {
    await masterdata.createOrUpdateSchema({dataEntity: DATA_ENTITY, schemaName: SCHEMA_NAME, schemaBody: schema});
  }
  ctx.status = 200
  await next()
}
 
export async function digitalRiverCatalogLogs(ctx: Context, next: () => Promise<unknown>) {
  const {
      clients: { masterdata }
  } = ctx
  const data = await masterdata.searchDocuments({ dataEntity: DATA_ENTITY, fields, schema: SCHEMA_NAME, pagination });

  ctx.status = 200
  ctx.body = { data }
  await next()
}

export async function digitalRiverSkuSync(ctx: Context) {
    
  const {
      clients: { apps },
      body
  }: {clients: any, body: any} = ctx


  const app: string = getAppId()
  const settings = await apps.getAppSettings(app)
  createOrUpdateSku(ctx, settings, body.IdSku, 'trigger');
  ctx.status = 200;
}

export async function digitalRiverCatalogSync(ctx: Context, next: () => Promise<unknown>) {
  const {
      clients: { apps,  catalog}
  } = ctx
  const origin = 'full sync'
  const app: string = getAppId()
  const settings = await apps.getAppSettings(app);
  let skusResponse: any = null;
  let skus: any = [];
  let page = 1;
  while(skusResponse == null || skusResponse.length > 0) {
    skusResponse = await catalog.getSkus(page, 1000);
    skus = skus.concat(skusResponse);
    page++;
  }
  for (let i = 0; i < skus.length; i++) {
      const skuId = skus[i];
      throttled(ctx, settings, skuId, origin)
  }
  ctx.status = 200
  await next()
}

const throttled = throttle((ctx: Context, settings: AppSettings, skuId: number, origin: string) => {
  createOrUpdateSku(ctx, settings, skuId, origin);
});

async function createOrUpdateSku(ctx: Context, settings: AppSettings, skuId: number, origin: string) {
  const {
      clients: { catalog, masterdata, digitalRiver }
  } = ctx
  catalog.getProductBySku(skuId).
      then(function(dataProductSku) {
          if (dataProductSku.IsActive) {
              const productId = dataProductSku.ProductId;
              const name = dataProductSku.Name;
              catalog.getProductById(productId).
                  then(function(dataProduct) {
                      const taxCode = dataProduct.TaxCode;
                      catalog.getProductSpecifications(productId).
                        then(async function(dataSpecs: any) {
                            let eccn;
                            let countryOfOrigin = '';
                            for (let j = 0; j < dataSpecs.length; j++) {
                                if (dataSpecs[j].Name == 'Country of origin' && dataSpecs[j].Value[0]) {
                                    countryOfOrigin = dataSpecs[j].Value[0];
                                }
                                if (dataSpecs[j].Name == 'ECCN' && dataSpecs[j].Value[0]) {
                                    eccn = dataSpecs[j].Value[0];
                                }
                                if (countryOfOrigin && eccn) {
                                    break;
                                }
                            }
                            const skuPayload = {
                              name: name,
                              eccn: eccn,
                              taxCode: taxCode,
                              countryOfOrigin: countryOfOrigin.split('-')[0].trim()
                            }
                            const d = new Date();
                            const datestring = MONTHS[d.getMonth()] + " " +("0" + d.getDate()).slice(-2) + ", " +
                            d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
                        
                            const mdPayload = {
                              productId: productId.toString(),
                              productSku: skuId.toString(),
                              requestData: JSON.stringify(skuPayload),
                              responseData: '',
                              origin: origin,
                              error: false,
                              dateLog: datestring
                            }
                            if (eccn && countryOfOrigin && taxCode) {
                                //DR
                                try {
                                  const response = await digitalRiver.createSku({settings, skuId, skuPayload});
                                  mdPayload.responseData = JSON.stringify(response);
                                } catch(err) {
                                  mdPayload.error = true;
                                  mdPayload.responseData = err?.response?.statusText;
                                }
                                
                                masterdata.createDocument({dataEntity: DATA_ENTITY, fields: mdPayload, schema: SCHEMA_NAME});
                            } else {
                                //missing eccn or country of origin  
                                mdPayload.error = true;
                                mdPayload.responseData = `Missing ${!eccn ? ' - ECCN' : ''} ${!countryOfOrigin ? ' - Country Of Origin' : ''} ${!taxCode ? ' - Tax Code' : ''}`;   
                                masterdata.createDocument({dataEntity: DATA_ENTITY, fields: mdPayload, schema: SCHEMA_NAME});
                            }
                        })
                     
                  }).
                  catch(function(err) {
                      console.log('ERR', err);
                  })
          }
      }).
      catch(function(err) {
          console.log('ERR', err);
      })
}