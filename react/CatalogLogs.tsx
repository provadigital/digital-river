/* eslint-disable prefer-destructuring */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FC } from 'react'
import React, { useState, useEffect } from 'react'
import { useQuery } from 'react-apollo'
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
  Checkbox,
} from 'vtex.styleguide'

import { jsonschema } from './constants'
import AppSettings from './graphql/appSettings.graphql'

// page size
const tableLength = 10

const CatalogLogs: FC = () => {
  const { formatMessage, formatDate, formatTime } = useIntl()
  const [page] = useState(1)
  const [appLoading, setAppLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [filterStatements, setFilterStatements] = useState([])
  const [dataSort, setDataSort] = useState({
    sortOrder: 'DESC',
    sortedBy: 'dateLog',
  })

  const [tableInfo, setTableInfo] = useState({
    data: [],
    currentPage: 1,
    currentItemFrom: 1,
    currentItemTo: tableLength,
    itemsLength: 0,
    emptyStateLabel: 'Nothing to show.',
  })

  const { data: appData } = useQuery(AppSettings, {
    variables: {
      version: process.env.VTEX_APP_VERSION,
    },
    ssr: false,
  })

  const parsedSettings =
    appData?.appSettings?.message && JSON.parse(appData.appSettings.message)

  const enableSyncCatalog = parsedSettings?.isAutomaticSync

  const getData = async (
    pageNumber: number,
    { sortedBy, sortOrder }: any,
    where: string
  ) => {
    const whereFilter = where ? `&where=${where}` : ''

    setAppLoading(true)
    const responseCatalog = await fetch(
      `/_v/api/digital-river/catalog-logs?v=${new Date().getTime()}&page=${pageNumber}&pageSize=${tableLength}${whereFilter}&sort=${sortedBy} ${sortOrder}`
    )
      .then((response) => {
        return response.json()
      })
      .then((json) => {
        return json
      })

    setTableInfo({
      data: responseCatalog.data,
      currentPage: responseCatalog.pagination.page,
      currentItemFrom:
        (responseCatalog.pagination.page - 1) *
          responseCatalog.pagination.pageSize +
        1,
      currentItemTo:
        responseCatalog.pagination.page * responseCatalog.pagination.pageSize,
      itemsLength: responseCatalog.pagination.total,
      emptyStateLabel: 'Nothing to show.',
    })
    setAppLoading(false)
  }

  const handleSyncCatalog = async (showToast: any) => {
    setSyncLoading(true)
    await fetch(`/_v/api/digital-river/catalog-sync`, {
      method: 'POST',
      cache: 'no-cache',
    })
    showToast({
      message: formatMessage({
        id: 'admin/digital-river.catalogLogs.success',
      }),
      duration: 5000,
    })
    setSyncLoading(false)
  }

  const getStatusFilter = (filters: any = []) => {
    let isError = null

    if (filters.length > 0) {
      const filter: any = filters[0]
      const filterObject = filter.object

      isError =
        filterObject.Error !== filterObject.Success ? filterObject.Error : null
    }

    return isError !== null ? `error=${isError.toString()}` : ''
  }

  const handleNextClick = () => {
    const currentPage = tableInfo.currentPage + 1
    const where = getStatusFilter(filterStatements)

    getData(currentPage, dataSort, where)
  }

  const handlePrevClick = () => {
    if (tableInfo.currentPage === 0) return
    const currentPage = tableInfo.currentPage - 1
    const where = getStatusFilter(filterStatements)

    getData(currentPage, dataSort, where)
  }

  const handleSort = ({ sortOrder, sortedBy }: any) => {
    setDataSort({
      sortOrder,
      sortedBy,
    })
    const where = getStatusFilter(filterStatements)

    getData(1, { sortOrder, sortedBy }, where)
  }

  const handleFiltersChange = (statements = []) => {
    setFilterStatements(statements)
    const where = getStatusFilter(statements)

    getData(1, dataSort, where)
  }

  const statusSelectorObject = ({ value, onChange }: any) => {
    const initialValue = {
      Error: true,
      Success: true,
      ...(value || {}),
    }

    const toggleValueByKey = (key: any) => {
      const newValue = {
        ...(value || initialValue),
        [key]: value ? !value[key] : false,
      }

      return newValue
    }

    return (
      <div>
        {Object.keys(initialValue).map((opt, index) => {
          return (
            <div className="mb3" key={`class-statment-object-${opt}-${index}`}>
              <Checkbox
                checked={value ? value[opt] : initialValue[opt]}
                label={opt}
                name="default-checkbox-group"
                onChange={() => {
                  const newValue = toggleValueByKey(`${opt}`)
                  const newValueKeys = Object.keys(newValue)
                  const isEmptyFilter = !newValueKeys.some(
                    (key) => !newValue[key]
                  )

                  onChange(isEmptyFilter ? null : newValue)
                }}
                value={opt}
              />
            </div>
          )
        })}
      </div>
    )
  }

  useEffect(() => {
    const where = getStatusFilter(filterStatements)

    getData(1, dataSort, where)
  }, [dataSort, filterStatements, page])

  return (
    <ToastProvider positioning="window">
      <ToastConsumer>
        {({ showToast }: { showToast: any }) => (
          <Layout
            pageHeader={
              <PageHeader
                title={formatMessage({
                  id: 'admin/digital-river.catalog-logs-label',
                })}
              >
                <span className="mr4">
                  <Button
                    variation="primary"
                    disabled={!enableSyncCatalog}
                    onClick={() => handleSyncCatalog(showToast)}
                    isLoading={syncLoading}
                  >
                    Sync Catalog
                  </Button>
                </span>
              </PageHeader>
            }
          >
            <PageBlock>
              <section className="flex justify-end">
                <Button
                  variation="secondary"
                  size="small"
                  onClick={() =>
                    getData(
                      tableInfo.currentPage,
                      dataSort,
                      getStatusFilter(filterStatements)
                    )
                  }
                  isLoading={syncLoading}
                >
                  Reload
                </Button>
              </section>
              <section className="pt4">
                {appLoading ? (
                  <Spinner />
                ) : (
                  <Table
                    schema={jsonschema(formatDate, formatTime)}
                    items={tableInfo.data}
                    emptyStateLabel={tableInfo.emptyStateLabel}
                    filters={{
                      alwaysVisibleFilters: ['error'],
                      statements: filterStatements,
                      onChangeStatements: handleFiltersChange,
                      clearAllFiltersButtonLabel: 'Clear Filters',
                      collapseLeft: true,
                      options: {
                        error: {
                          label: 'Status',
                          renderFilterLabel: (st: any) => {
                            if (!st || !st.object) {
                              return 'All'
                            }

                            const keys = st.object ? Object.keys(st.object) : []
                            const isAllTrue = !keys.some(
                              (key: string | number) => !st.object[key]
                            )

                            const isAllFalse = !keys.some(
                              (key) => st.object[key]
                            )

                            const trueKeys = keys.filter(
                              (key) => st.object[key]
                            )

                            let trueKeysLabel = ''

                            trueKeys.forEach((key, index) => {
                              trueKeysLabel += `${key}${
                                index === trueKeys.length - 1 ? '' : ', '
                              }`
                            })

                            return `${
                              isAllTrue
                                ? 'All'
                                : isAllFalse
                                ? 'None'
                                : `${trueKeysLabel}`
                            }`
                          },
                          verbs: [
                            {
                              label: 'Includes',
                              value: 'includes',
                              object: statusSelectorObject,
                            },
                          ],
                        },
                      },
                    }}
                    pagination={{
                      onNextClick: handleNextClick,
                      onPrevClick: handlePrevClick,
                      currentItemFrom: tableInfo.currentItemFrom,
                      currentItemTo: tableInfo.currentItemTo,
                      textOf: 'of',
                      totalItems: tableInfo.itemsLength,
                    }}
                    sort={{
                      sortedBy: dataSort.sortedBy,
                      sortOrder: dataSort.sortOrder,
                    }}
                    onSort={handleSort}
                    onRowClick={({ rowData }: { rowData: any }) => {
                      const w = window.open(
                        `/admin/Site/ProdutoForm.aspx?id=${rowData.productId}`,
                        '_blank'
                      )

                      if (w) {
                        w.focus() // okay now
                      }
                    }}
                  />
                )}
              </section>
            </PageBlock>
          </Layout>
        )}
      </ToastConsumer>
    </ToastProvider>
  )
}

export default CatalogLogs
