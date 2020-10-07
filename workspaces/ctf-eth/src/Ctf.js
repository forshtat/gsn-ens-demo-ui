import CtfArtifact from '@ctf/eth/artifacts/CaptureTheFlag.json'
import ethers from 'ethers'
import {networks} from './networks'
import {RelayProvider, resolveConfigurationGSN} from "@opengsn/gsn";
/**
 * a wrapper class for the CTF contract.
 * the only network-specific "leak" from this class is that the "capture()"
 * event returns a transaction object,
 * that the application should wait() until it gets mined.
 */
export class Ctf {

  constructor(addr, signer, gsnProvider) {
    this.address = addr
    this.gsnProvider = gsnProvider
    this.theContract = new ethers.Contract(addr, CtfArtifact.abi, signer)
  }


  async getCurrentFlagHolder() {
    return await this.theContract.currentHolder()
  }

  listenToEvents(onEvent, onProgress) {
    this.theContract.on('FlagCaptured', (previousHolder, currentHolder) => {
      onEvent({previousHolder, currentHolder});
    })
    this.gsnProvider.registerEventListener(onProgress)
  }

  stopListenToEvents(onEvent, onProgress) {
    this.theContract.off(onEvent)
    this.gsnProvider.unregisterEventListener(onProgress)
  }

  async getPastEvents(count = 5) {
    const logs = await this.theContract.queryFilter('FlagCaptured', 1)
    return logs.map(e => ({previousHolder: e.args.previousHolder, currentHolder: e.args.currentHolder})).slice(0, count)
  }

  getSigner() {
    return this.theContract.signer.getAddress()
  }

  async capture() {
    return await this.theContract.captureTheFlag()
  }
}

export async function initCtf() {

  const web3Provider = window.ethereum

  const provider = new ethers.providers.Web3Provider(web3Provider);
  const network = await provider.getNetwork()

  let net = networks[network.chainId]
  if (!net) {
    net = {
      ctf: require('@ctf/eth/deployments/localhost/CaptureTheFlag.json').address,
      paymaster: require('@ctf/eth/build/gsn/Paymaster').address
    }
  }

  const gsnConfig = await resolveConfigurationGSN(web3Provider,{
    logLevel:0,
    paymasterAddress: net.paymaster
  })
  const gsnProvider = new RelayProvider(web3Provider, gsnConfig)
  const provider2 = new ethers.providers.Web3Provider(gsnProvider);

  const signer = provider2.getSigner()

  return new Ctf(net.ctf, signer, gsnProvider)
}
