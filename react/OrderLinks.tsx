/* eslint-disable vtex/prefer-early-return */
const OrderLinks = async () => {
  if (window.location.hash.indexOf('#/orders/') !== -1) {
    const hashElements = window.location.hash.split('/')
    const orderId = hashElements[hashElements.length - 1]
    const linksData = await fetch(
      `/_v/api/digital-river/orders/${orderId}?v=${new Date().getTime()}`
    ).then((response) => response.json())

    if (linksData) {
      const pageBodyElement = document.querySelector('.vtex-account__page-body')
      const sectionElement = pageBodyElement?.querySelector('section')
      const parentContainerElement = sectionElement?.parentNode
      const containerElement = document.createElement('div')

      containerElement.className = 'w-100 fl pv3-ns pr0'
      const listElement = document.createElement('ul')

      listElement.className = 'list tl tr-ns ma0 pa0-s'
      for (let i = 0; i < linksData.length; i++) {
        const textElement = document.createElement('span')

        textElement.className = 'db pv2 c-link hover-c-link link'
        textElement.innerHTML = linksData[i].name
        const linkElement = document.createElement('a')

        linkElement.className = 'no-underline'
        linkElement.href = linksData[i].url
        linkElement.appendChild(textElement)
        const element = document.createElement('li')

        element.className = 'db dib-ns mb5 mb0-ns ml4'
        element.appendChild(linkElement)
        listElement.appendChild(element)
      }

      containerElement.appendChild(listElement)
      if (parentContainerElement && sectionElement) {
        parentContainerElement.insertBefore(containerElement, sectionElement)
      }
    }
  }
}

export default OrderLinks
