/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tag } from 'vtex.styleguide'

export const jsonschema = (formatDate: any, formatTime: any) => {
  return {
    properties: {
      error: {
        title: 'Status',
        width: 100,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: { cellData: any }) => {
          return (
            <Tag bgColor={cellData ? '#ff4c4c' : '#8bc34a'} color="#FFFFFF">
              <span className="nowrap">{cellData ? 'Error' : 'Success'}</span>
            </Tag>
          )
        },
      },
      productId: {
        title: 'Product Id',
        width: 180,
        sortable: true,
      },
      productSku: {
        title: 'Product SKU',
        width: 180,
        sortable: true,
      },
      requestData: {
        title: 'Request Data',
        width: 500,
      },
      responseData: {
        title: 'Response Data',
        width: 500,
      },
      origin: {
        title: 'Source',
        width: 100,
      },
      dateLog: {
        title: 'Executed',
        width: 250,
        sortable: true,
        cellRenderer: ({ cellData }: { cellData: any }) => {
          const value = new Date(parseInt(cellData, 10))

          return `${formatDate(value, {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })} ${formatTime(value)}`
        },
      },
    },
  }
}
