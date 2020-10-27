import React, { Component } from 'react'

export default class PopUp extends Component {

  constructor (props) {
    super(props)
    this.state = {
      number: '4111111111111111',
      year: '2023',
      month: '01',
      cvv: '123',
      givenName: 'John',
      familyName: 'Doe',
      email: 'doe@example.com',
      phone: '+1-202-555-0178',
      street1: '1550 Bryant Street',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94103',
      country: 'US'
    }
  }

  handleClick = () => {
    this.props.toggle()
  }

  cardNumberChange (event) {
    this.setState({ cardNumber: event.target.value })
  }

  cardChange (event) {
    this.setState({ cardNumber: event.target.value })
  }

  render () {
    return (
      <div className="modal">
        <div className="modal_content">
          <span className="close" onClick={this.handleClick}>&times;    </span>
          <p>Enter credit card details</p>
          <input type="text" name="cardNumber" value={this.state.number || ''}
                 onChange={this.cardNumberChange.bind(this)}/>
          <br/>
          <input type="text" name="cardMonth" value={this.state.month || ''}
                 onChange={this.cardNumberChange.bind(this)}/>

          <input type="text" name="cardNumber" value={this.state.year || ''}
                 onChange={this.cardNumberChange.bind(this)}/>

          <br/>
          <br/>

          <input type="text" name="cardNumber" value={this.state.cvv || ''}
                 onChange={this.cardNumberChange.bind(this)}/>

          <br/>
          <br/>

          {/*TODO: implement user, address input */}
          <div>{`${this.state.givenName} ${this.state.familyName}`}</div>
          <div>{`${this.state.street1} ${this.state.city} ${this.state.state} ${this.state.postalCode}  ${this.state.country}. CHANGE`}</div>
          <button onClick={() => {
            console.log('Sending a payment request', this.state, this.props.reservationId, this.props.referenceId, this.props.amount)
            this.props.ctf.payWithWyre(this.state, this.props.reservationId, this.props.referenceId, this.props.amount).then((response) => {
              console.log(`Paid ${JSON.stringify(response)}`)
              this.props.onPaymentComplete(response.response.response.id)
            })
          }}>PAY
          </button>
          <div
            style={{ fontSize: 8 }}>{`${this.props.reservationId} ${this.props.referenceId} ${this.props.amount}`}</div>
        </div>
      </div>
    )
  }
}
