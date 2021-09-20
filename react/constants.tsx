/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tag } from 'vtex.styleguide'

export const jsonschema = (
  formatDate: any,
  formatTime: any,
  formatMessage: any
) => {
  return {
    properties: {
      error: {
        title: formatMessage({
          id: 'admin/digital-river.catalogLogs.table.status',
        }),
        width: 100,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: { cellData: any }) => {
          return (
            <Tag bgColor={cellData ? '#ff4c4c' : '#8bc34a'} color="#FFFFFF">
              <span className="nowrap">
                {cellData
                  ? formatMessage({
                      id: 'admin/digital-river.catalogLogs.table.error',
                    })
                  : formatMessage({
                      id: 'admin/digital-river.catalogLogs.table.success',
                    })}
              </span>
            </Tag>
          )
        },
      },
      productId: {
        title: formatMessage({
          id: 'admin/digital-river.catalogLogs.table.productId',
        }),
        width: 180,
        sortable: true,
      },
      productSku: {
        title: formatMessage({
          id: 'admin/digital-river.catalogLogs.table.productSku',
        }),
        width: 180,
        sortable: true,
      },
      requestData: {
        title: formatMessage({
          id: 'admin/digital-river.catalogLogs.table.requestData',
        }),
        width: 500,
      },
      responseData: {
        title: formatMessage({
          id: 'admin/digital-river.catalogLogs.table.responseData',
        }),
        width: 500,
      },
      origin: {
        title: formatMessage({
          id: 'admin/digital-river.catalogLogs.table.source',
        }),
        width: 100,
      },
      dateLog: {
        title: formatMessage({
          id: 'admin/digital-river.catalogLogs.table.executed',
        }),
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
