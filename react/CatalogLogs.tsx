import type { FC } from 'react'
import React, {useState, useEffect} from 'react'
import { useIntl } from 'react-intl'
import {
  Layout,
  PageHeader,
  PageBlock,
  ToastProvider,
  ToastConsumer,
  Button,
  Table,
  Spinner,
} from 'vtex.styleguide'

import { jsonschema } from './constants'

const tableLength = 10;
const CatalogLogs: FC = () => {
  const { formatMessage } = useIntl();
  const [page] = useState(1);
  const [appLoading, setAppLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [data, setData] = useState([])
  const [tableInfo, setTableInfo] = useState({
    slicedData: data.slice(0, tableLength),
    currentPage: 1,
    currentItemFrom: 1,
    currentItemTo: tableLength,
    itemsLength: data.length,
    emptyStateLabel: 'Nothing to show.'
  });
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    getData();
  }, [page]);

  const getData = async () => {
    setAppLoading(true);
    const response = await fetch(
      `/_v/api/digital-river/catalog-logs?v=${new Date().getTime()}`
    ).then((response) => {
      return response.json()
    }).then((json) => {
        return json
    });
    setData(response.data);
    

    setTableInfo({
      slicedData: response.data.slice(0, tableLength),
      currentPage: 1,
      currentItemFrom: 1,
      currentItemTo: tableLength,
      itemsLength: response.data.length,
      emptyStateLabel: 'Nothing to show.'
    })
    setSearchValue('');
    setAppLoading(false);
  }

  const handleSyncCatalog = async (showToast: any) => {
    setSyncLoading(true);
    await fetch(
      `/_v/api/digital-river/catalog-sync`, {
        method: 'POST',
        cache: 'no-cache'
      }
    );
    showToast({
      message: formatMessage({
        id: 'admin/digital-river.catalogLogs.success',
      }),
      duration: 5000,
    })
    setSyncLoading(false);
    
  }

  const handleNextClick = () => {
    const currentPage = tableInfo.currentPage + 1;
    const currentItemFrom = tableInfo.currentItemTo + 1;
    const currentItemTo = tableLength * currentPage;
    const slicedData = data.slice(currentItemFrom - 1, currentItemTo);
    setTableInfo({
      slicedData,
      currentPage,
      currentItemFrom,
      currentItemTo,
      itemsLength: data.length,
      emptyStateLabel: '',
    })
  }

  const handlePrevClick = () => {
    if (tableInfo.currentPage === 0) return
    const currentPage = tableInfo.currentPage - 1
    const currentItemFrom = tableInfo.currentItemFrom - tableLength
    const currentItemTo = tableInfo.currentItemFrom - 1
    const slicedData = data.slice(currentItemFrom - 1, currentItemTo)
    setTableInfo({
      slicedData,
      currentPage,
      currentItemFrom,
      currentItemTo,
      itemsLength: data.length,
      emptyStateLabel: '',
    })
  }

  const handleInputSearchChange = (e: any) => {
    setSearchValue(e.target.value);
  }

  const handleInputSearchClear = () => {
    setSearchValue('')
  }

  const handleInputSearchSubmit = (e: any) => {
    const value = e && e.target && e.target.value
    const regex = new RegExp(value, 'i')
    if (!value) {
      setTableInfo({
        slicedData: data.slice(0, tableLength),
        currentPage: 1,
        currentItemFrom: 1,
        currentItemTo: tableLength,
        itemsLength: data.length,
        emptyStateLabel: 'Nothing to show.'
      })
    } else {
      const slicedData = data.slice().filter((item: { productId: string; productSku: string, requestData: string, responseData: string, origin: string,
      dateLog: string, error: boolean }) => regex.test(item.productId) || regex.test(item.productSku) || regex.test(item.requestData) || regex.test(item.responseData) || regex.test(item.origin) || regex.test(item.dateLog) || regex.test(item.error ? 'Error' : 'Success'));
      setTableInfo({
        slicedData: slicedData.slice(0, tableLength),
        currentPage: 1,
        currentItemFrom: 1,
        currentItemTo: tableLength,
        itemsLength: slicedData.length,
        emptyStateLabel: 'Nothing to show.'
      })
    }
  }
  
  return (
    <ToastProvider positioning="window">
      <ToastConsumer>
        {({ showToast }: { showToast: any }) => (
          <Layout
            pageHeader={
              <PageHeader
                title={formatMessage({
                  id: 'admin/digital-river.catalog-logs-label',
                })}>
                <span className="mr4">
                  <Button
                    variation="primary"
                    onClick={() => handleSyncCatalog(showToast)}
                    isLoading={syncLoading}>Sync Catalog</Button>
                </span>
              </PageHeader>
            }>
            <PageBlock>
              <section className='flex justify-end'>
              <Button
                    variation="secondary" size="small"
                    onClick={() => getData()}
                    isLoading={syncLoading}>Reload</Button>
              </section>
              <section className='pt4'>
                {appLoading ? <Spinner /> :
                  <Table
                      schema={jsonschema}
                      items={tableInfo.slicedData}
                      emptyStateLabel={tableInfo.emptyStateLabel}
                      toolbar={{
                        inputSearch: {
                          value: searchValue,
                          placeholder: 'Search...',
                          onChange: handleInputSearchChange,
                          onClear: handleInputSearchClear,
                          onSubmit: handleInputSearchSubmit,
                        }
                      }}
                      pagination={{
                        onNextClick: handleNextClick,
                        onPrevClick: handlePrevClick,
                        currentItemFrom: tableInfo.currentItemFrom,
                        currentItemTo: tableInfo.currentItemTo,
                        textOf: 'of',
                        totalItems: tableInfo.itemsLength
                      }}
                      onRowClick={({ rowData }: { rowData: any }) => {
                        const w = window.open('/admin/Site/ProdutoForm.aspx?id=' + rowData.productId, '_blank');
                        if (w) {
                            w.focus(); // okay now
                        }
                      }}
                       />
                  }
              </section>
            </PageBlock>
          </Layout>
        )}
      </ToastConsumer>
    </ToastProvider>
  )
}

export default CatalogLogs
