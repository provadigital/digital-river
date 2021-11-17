/* eslint-disable react/jsx-key */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react'
import type { FC } from 'react'
import { Card, Spinner, ActionMenu } from 'vtex.styleguide'

const InvoicesPage: FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])

  const getData = async () => {
    setLoading(true)
    const invoicesResponse = await fetch(
      `/_v/api/digital-river/invoices?v=${new Date().getTime()}`
    )
      .then((response) => {
        return response.json()
      })
      .then((json) => {
        return json
      })

    setData(invoicesResponse)
    setLoading(false)
  }

  useEffect(() => {
    getData()
  }, [])

  const getPDfs = (fieldPdfs: any) => {
    const pdfs = []

    for (let i = 0; i < fieldPdfs.length; i++) {
      pdfs.push({
        label: `${fieldPdfs[i].name}-${i + 1}.pdf`,
        onClick: () => {
          window.open(fieldPdfs[i].url, '_blank')
        },
      })
    }

    return pdfs
  }

  const getInvoices = () => {
    return data.map((invoice: any) => {
      return (
        <div className="mb3">
          <Card>
            <div className="flex justify-between">
              <div className="lh-copy">
                <div className="mb3 fw5">{`#${invoice.orderId}`}</div>
                <div>{`Order date: ${invoice.orderDate}`}</div>
                <div>{`Total: ${invoice.totalAmount} ${invoice.currency}`}</div>
              </div>
              <div className="flex flex-column">
                <ActionMenu
                  label="Download invoice"
                  buttonProps={{
                    variation: 'tertiary',
                    disabled: invoice.invoicePDFs.length === 0,
                  }}
                  options={getPDfs(invoice.invoicePDFs)}
                />
                <ActionMenu
                  label="Download credit memo"
                  buttonProps={{
                    variation: 'tertiary',
                    disabled: invoice.creditMemoPDFs.length === 0,
                  }}
                  options={getPDfs(invoice.creditMemoPDFs)}
                />
              </div>
            </div>
          </Card>
        </div>
      )
    })
  }

  return (
    <div className="pa7 mw7" style={{ margin: 'auto' }}>
      {!loading && getInvoices()}
      {loading && <Spinner />}
    </div>
  )
}

export default InvoicesPage
