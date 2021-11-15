import { useEffect } from 'react'
import type { FC } from 'react'
import OrderLinks from './OrderLinks'

const loadDigitalRiver = () => {
  const s = document.getElementById('digital-river-script')
  if (!s) {
    const e = document.createElement('script')
    e.id = 'digital-river-script'
    e.type = 'text/javascript'
    e.src = 'https://js.digitalriver.com/v1/DigitalRiver.js'
    const [t]: any = document.getElementsByTagName('script')
    t.parentNode.insertBefore(e, t)

    const f = document.createElement('link')
    f.type = 'text/css'
    f.rel = 'stylesheet'
    f.href = 'https://js.digitalriverws.com/v1/css/DigitalRiver.css'
    const [u]: any = document.getElementsByTagName('link')
    u.parentNode.insertBefore(f, u)
  }
  
}

const CreditCardsLink: FC = ({ render }: any) => { 
  useEffect(() => {
    loadDigitalRiver()
  }, [])
  useEffect(() => {
    const linkCards: any = document.querySelector('a[href="#/cards"].vtex-account_menu-link')
    if (linkCards) {
      linkCards.style.display = 'none'
    }
  })
  useEffect(() => {
    console.log('RRR')
    OrderLinks()
  }, [window.location.hash])
  return render([
    {
      name: 'Credit Cards',
      path: '/credit-cards',
    },
  ])
}


export default CreditCardsLink