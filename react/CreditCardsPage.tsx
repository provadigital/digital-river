import React, { Fragment, useEffect, useState } from 'react'
import type { FC } from 'react'
//import { useQuery } from 'react-apollo'
import { Route } from 'vtex.my-account-commons/Router'
//import AppSettings from './graphql/appSettings.graphql'
import {
  Alert,
  ButtonWithIcon,
  IconDelete
} from 'vtex.styleguide'

declare global {
  interface Window {
    DigitalRiver: any
  }
}

const CardManagement: FC = () => {
  const [customer, setCustomer] = useState({})
  const [alert, setAlert] = useState({})
  const publicKey = 'pk_test_67bcac8015da4adb97d4671d7a43c7f2'
  const getCustomer = async () => {
    const sourcesResponse = await fetch(
      `/_v/api/digital-river/checkout/sources?v=${new Date().getTime()}`
    )
      .then((response) => {
        return response.json()
      })
      .then((json) => {
        return json
      })
    setCustomer(sourcesResponse?.customer || {})
  } 
  const loadDigitalRiver = async () => {
    const response = await fetch(
      `/_v/api/digital-river/my-account/profile?v=${new Date().getTime()}`
    )
      .then((response) => {
        return response.json()
      })
      .then((json) => {
        return json
      })
    
    const { locale, firstName, lastName, email, address } = response
    const digitalriver = new window.DigitalRiver(publicKey, {
      locale
    })
    const phoneNumber = '+14706851816'
    const configuration = {
      options: {
        flow: 'managePaymentMethods',
        showComplianceSection: true,
        showSavePaymentAgreement: true,
        showTermsOfSaleDisclosure: true
      },
      billingAddress: {
        firstName,
        lastName,
        email,
        phoneNumber,
        address
      },
      onSuccess(data: any) {
        setAlert({})
        const {source, readyForStorage} = data
        if (source && readyForStorage) {
          addCard(source.id)
        }
      },
      onCancel() {
      },
      onError(data: any) {
        setAlert({})
        const {errors} = data
        if (errors.length > 0) {
          setAlert({
            type: 'error',
            message: errors[0].message
          })
        }
      },
      onReady() {
      },
    }

    if (!firstName || !lastName || !email || !address) {
      setAlert({
        type: 'warning',
        message: <label>To add credit cards you need to complete your <a href="/account#/profile">profile data</a> and add one <a href="/account#/addresses/new">billing address</a></label>
      })
    } else {
      const dropin = digitalriver.createDropin(configuration)
      dropin.mount('drop-in')
    }
  }
  const addCard = async (id: any) => {
    await fetch(
      `/_v/api/digital-river/source/${id}`
    )
    setTimeout(() => {
      getCustomer()
    }, 500)
  }
  const deleteCard = async (id: any) => {
    await fetch(
      `/_v/api/digital-river/delete-source/${id}`
    )
    setTimeout(() => {
      getCustomer()
    }, 500)
    
  }
  const getCards = () => {
    const {sources} : any = customer
    return sources?.map((source: any) => {
      return (
        <div style={{ marginBottom: '8px'}}>
          <label style={{ marginRight: '8px'}} htmlFor={source.id}>{`${source.creditCard.brand} ending with ${source.creditCard.lastFourDigits} expires ${('0' + source.creditCard.expirationMonth).slice(-2)}/${source.creditCard.expirationYear}`}</label>
          <ButtonWithIcon size='small' onClick={() => deleteCard(source.id)} icon={<IconDelete />}/>
        </div>
      )
    })

  }
  useEffect(() => {
    loadDigitalRiver()
    getCustomer()
  }, [])
  const {sources} : any = customer
  const {type, message} : any = alert
  return (
    <div style={{padding: '32px', maxWidth: '600px', margin: 'auto'}}>
      
      <div style={{ marginBottom: '32px'}}>
        {sources?.length > 0 ? <h3>{'Stored Cards'}</h3> : null}
        {getCards()}
      </div>
      {message ? <div style={{ marginBottom: '32px'}}><Alert type={type}>{message}</Alert></div> : null}
      <div id='drop-in'></div>
    </div>
  )
}

const CreditCardsPage: FC = () => {
  return (
    <Fragment>
      <Route exact path="/credit-cards" component={CardManagement} />
    </Fragment>
  )
}

export default CreditCardsPage