import React from 'react'
import { initCtf } from '@ctf/eth/src/Ctf'
import { Progress, Address, ActionButton } from './utils.jsx'
import PopUp from './PopUp'

const MIN_REGISTRATION_DURATION = 2419200

export class CaptureTheFlag extends React.Component {

  constructor (props) {
    super(props)
    this.state = {}
  }

  async readContractInfo () {
    const ctf = await initCtf()

    const [account] = await Promise.all([
      ctf.getSigner()
    ])

    this.setState({
      contractAddress: ctf.address,
      account
    })

    this.ctf = ctf
  }

  progress ({ event, step, total, error }) {
    this.setState({ event, step, total, error })
  }

  async componentDidMount () {
    await this.readContractInfo()
  }

  componentWillUnmount () {
  }

  render () {

    let availLabelText
    if (this.state.availability === undefined) {
      availLabelText = 'enter an available domain name'
    } else {
      availLabelText = this.state.availability ? `domain ${this.state.domainName} is available` : `domain ${this.state.domainName} is not available`
    }

    return <>
      <h1>Capture The Domain</h1>
      <input type="text" name="domainName" value={this.state.domainName || ''} onChange={this.handleChange.bind(this)}/>
      <div>{availLabelText}</div>
      <div>Price is {this.state.price} wei</div>
      <br/>
      {!this.state.account && <span> <ActionButton title="Connect to Metamask"
                                                   action={window.ethereum.enable}
                                                   onError={() => e => this.setState({ error: e ? e.message : 'error' })}
      /><p/></span>}

      <button
        onClick={
          () => {
            console.log(`Checking availability for ${this.state.domainName}`)
            this.ctf.recordExists(this.state.domainName).then((recordExists) => {
              this.setAvailability(!recordExists)
            })
          }
        }>Check availability for {this.state.domainName}</button>

      {this.state.availability && <button
        onClick={
          () => {
            console.log(`Getting price for ${this.state.domainName}`)
            this.ctf.getPrice(this.state.domainName, MIN_REGISTRATION_DURATION).then((price) => {
              this.setPrice(parseInt(price._hex))
            })
          }
        }>Get price</button>}

      {this.state.price && <button
        onClick={
          () => {
            console.log(`Creating reservation for ${this.state.domainName}`)
            this.ctf.createWyreReservation(this.state.domainName, this.state.account).then((response) => {
              this.setReferenceId(response.referenceId)
              this.setReservationId(response.wyreResponse.reservation)
            })
          }
        }>Create reservation</button>}

      {/*////// THIS HERE !*/}
      {this.state.reservation = this.state.reservation || true}

      {this.state.reservation &&
      <div>
        <div className="btn" onClick={this.togglePop.bind(this)}>
          <button>Pay with Wyre</button>
        </div>
        {this.state.seen ? <PopUp toggle={this.togglePop.bind(this)}
                                  ctf={this.ctf}
                                  amount={this.getAmount()}
                                  referenceId={this.state.referenceId}
                                  reservationId={this.state.reservationId}
                                  onPaymentComplete={this.onPaymentComplete.bind(this)}/> : null}
      </div>}

      {this.state.orderId && <button
        onClick={
          () => {
            console.log(`Creating commitment ${this.state.domainName}`)
            this.ctf.commitToDomain(this.state.domainName, this.state.account, this.state.orderId, this.state.referenceId).then((commitmentResult) => {
              console.log(`Commitment created, txHash: ${commitmentResult.commitmentTx.hash}, secret: ${commitmentResult.secret}`)
              this.setCommitment(commitmentResult.commitmentTx.hash, commitmentResult.secret)
            })
          }
        }>Commit on-chain</button>}

      {this.state.secret &&
      <button
        onClick={
          () => {
            this.purchaseOnChain()
          }
        }
      > Buy {this.state.domainName}
      </button>
      }

      <br/>
      Your account:<Address addr={this.state.account}/> <br/>
      <br/>

      {this.state.error ?
        <font color="red">Error: {this.state.error}</font>
        :
        <Progress step={this.state.step} total={this.state.total} status={this.state.status}/>
      }
    </>
  }

  purchaseOnChain () {
    this.ctf
      .registerDomain(this.state.domainName, this.state.account, this.state.secret, this.state.price, MIN_REGISTRATION_DURATION, this.state.orderId, this.state.transferId)
      .then((tx) => {
        console.log('domain is purchased', tx.hash)
      })
  }

  handleChange (event) {
    this.setState({ domainName: event.target.value })
  }

  setAvailability (availability) {
    this.setState({ availability })
  }

  setCommitment (commitment, secret) {
    this.setState({ commitment, secret })
  }

  setReferenceId (referenceId) {
    this.setState({ referenceId })
  }

  setReservationId (reservationId) {
    this.setState({ reservationId })
  }

  setPrice (price) {
    this.setState({ price })
  }

  togglePop () {
    this.setState({
      seen: !this.state.seen
    })
  }

  onPaymentComplete (orderId) {
    console.log(`onPaymentComplete(${orderId})`)
    this.setState({ orderId })
  }

  getAmount () {
    // TODO: convert ETH price + gas costs to usd
    return '1'
  }
}
