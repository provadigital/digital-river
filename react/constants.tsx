import {
  Tag
} from 'vtex.styleguide'

export const jsonschema = {
    properties: {
      error: {
        title: 'Status',
        width: 100,
        cellRenderer: ({ cellData }: { cellData: any}) => {
          return (
            <Tag bgColor={cellData ? '#ff4c4c' : '#8bc34a'} color="#FFFFFF">
              <span className="nowrap">{cellData ? 'Error' : 'Success'}</span>
            </Tag>
          )
        }
      },
      productId: {
        title: 'Product Id',
        width: 180
      },
      productSku: {
        title: 'Product SKU',
        width: 180
      },
      requestData: {
        title: 'Request Data',
        width: 500
      },
      responseData: {
        title: 'Response Data',
        width: 500
      },
      origin: {
        title: 'Source',
        width: 100
      },
      dateLog: {
        title: 'Executed',
        width: 200
      }
    }
  }