import ETHRegistrarControllerArtifact from './ETHRegistrarController.json'
import ethers from 'ethers'
import { networks } from '../build/networks.js'
import { RelayProvider, resolveConfigurationGSN } from '@opengsn/gsn'
import axios from 'axios'
import crypto from 'crypto'

/**
 * a wrapper class for the CTF contract.
 * the only network-specific "leak" from this class is that the "capture()"
 * event returns a transaction object,
 * that the application should wait() until it gets mined.
 */
export class Ctf {

  constructor (addr, ethRegistrarAddress, signer, gsnProvider, ethersProvider, host, approver) {
    this.approver = approver
    this.host = host
    this.signer = signer
    this.gsnProvider = gsnProvider
    this.ethersProvider = ethersProvider
    this.ethRegistrarController = new ethers.Contract(ethRegistrarAddress, ETHRegistrarControllerArtifact.abi, signer)
  }

  getSigner () {
    return this.signer.getAddress()
  }

  async recordExists (domain) {
    const resolved = await this.ethersProvider.resolveName(domain)
    const exists = resolved != null
    console.log(`Resolved ${domain} to address ${resolved}. Entry ${exists}`)
    return exists
  }

  /**
   * Call this first to create commitment
   */
  async commitToDomain (domainName, account, orderId, referenceId) {
    const secret = randomSecret()
    this.approver.domain = domainName
    this.approver.orderId = orderId
    this.approver.referenceId = referenceId
    const commitment = await this.ethRegistrarController.makeCommitment(domainName, account, secret)
    console.log(`commitment is: ${commitment}`)
    let commitmentTx = await this.ethRegistrarController.commit(commitment)
    return { commitmentTx, secret }
  }

  /**
   * Call this some time (check minCommitmentAge) after commitment tx is mined
   */
  async registerDomain (domainName, account, secret, ethPrice, duration, orderId, referenceId) {
    this.approver.domain = domainName
    this.approver.orderId = orderId
    this.approver.referenceId = referenceId
    return await this.ethRegistrarController.register(domainName, account, duration, secret, {
      value: ethPrice,
      gasLimit: 1000000
    })
  }

  async getPrice (domainName, duration) {
    return await this.ethRegistrarController.rentPrice(domainName, duration)
  }

  async createWyreReservation (domain, buyer) {
    const reserveUrl = `${this.host}/reserve`
    const reservationRequest = {
      domain,
      buyer
    }
    const response = await axios.post(reserveUrl, reservationRequest)
    console.log(`Created reservation for ${domain}, response: ${JSON.stringify(response.data)}`)
    return response.data
  }

  async payWithWyre (paymentRequest, reservationId, referenceId, amount) {
    const purchaseUrl = `${this.host}/purchase`
    const paymentIds = {
      reservationId,
      referenceId
    }
    const paymentDetails = {
      amount,
      debitCard: {
        number: paymentRequest.number,
        year: paymentRequest.year,
        month: paymentRequest.month,
        cvv: paymentRequest.cvv
      }
    }

    const address = {
      street1: paymentRequest.street1,
      city: paymentRequest.city,
      state: paymentRequest.state,
      postalCode: paymentRequest.postalCode,
      country: paymentRequest.country
    }

    const userDetails = {
      givenName: paymentRequest.givenName,
      familyName: paymentRequest.familyName,
      email: paymentRequest.email,
      phone: paymentRequest.phone,
      address
    }

    const purchaseRequest = {
      paymentIds,
      paymentDetails,
      userDetails
    }

    const response = await axios.post(purchaseUrl, purchaseRequest)
    console.log(`Paid for referenceId ${referenceId}, response: ${JSON.stringify(response.data)}`)
    return response.data
  }
}

export async function initCtf () {

  const web3Provider = window.ethereum

  if (!web3Provider)
    throw new Error('No "window.ethereum" found. do you have Metamask installed?')

  const provider = new ethers.providers.Web3Provider(web3Provider)
  const network = await provider.getNetwork()

  let chainId = network.chainId
  let net = networks[chainId]
  const netid = await provider.send('net_version')
  console.log('chainid=', chainId, 'networkid=', netid)
  if (chainId != netid)
    console.warn(`Incompatible network-id ${netid} and ${chainId}: for Metamask to work, they should be the same`)
  if (!net) {
    if (chainId < 1000 || !window.location.href.match(/localhos1t|127.0.0.1/))
      throw new Error('Unsupported network. please switch to one of: ' + Object.values(networks).map(n => n.name).join('/'))
    else
      throw new Error('To run locally, you must run "yarn evm" and then "yarn deploy" before "yarn react-start" ')
  }

  const gsnConfig = await resolveConfigurationGSN(web3Provider, {
    logLevel: 0,
    tmpCheckRecipientForwarder: false,
    forwarderAddress: '0x956868751Cc565507B3B58E53a6f9f41B56bed74',
    paymasterAddress: '0x8b56234c41f6260d50a357b092d06da180d2a978'
  })

  const host = 'http://localhost:7000'
  const approver = new Approver(host)
  const overrideDependencies = {
    asyncApprovalData: approver.asyncApprovalData.bind(approver)
  }

  const gsnProvider = new RelayProvider(web3Provider, gsnConfig, overrideDependencies)
  const provider2 = new ethers.providers.Web3Provider(gsnProvider)
  const ethersProvider = new ethers.providers.Web3Provider(web3Provider)

  const signer = provider2.getSigner()

  return new Ctf(net.ctf, '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5', signer, gsnProvider, ethersProvider, host, approver)
}

function randomSecret () {
  return '0x' + crypto.randomBytes(32).toString('hex')
}

class Approver {
  constructor (host) {
    this.host = host
  }

  async asyncApprovalData (relayRequest) {
    console.log('requested approval data, returning')
    const approvalRequest = {
      relayRequest,
      domain: this.domain,
      referenceId: this.referenceId,
      orderId: this.orderId
    }
    const approveUrl = `${this.host}/approve`
    const approval = await axios.post(approveUrl, approvalRequest)
    console.log(`Received approval: ${JSON.stringify(approval.data)} for request: ${JSON.stringify(approvalRequest)}`)
    return approval.data.approvalData
  }
}
