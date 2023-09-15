import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NavParams } from '@ionic/angular';
import { UserService } from '../providers/user.service';
import { Clipboard } from '@capacitor/clipboard';
import { Browser, OpenOptions } from '@capacitor/browser';
import { VaultService } from '../providers/vault.service';
import { IonicPaymentsService } from '../providers/ionic-payments.service';

type EFTDepositObject = { 'BankAccountName': string, 'BankAccountNumber': string, 'BankAccountType': string, 'BankBranchCode': string, 'BankName': string, 'BankStreetAddress': string, 'BankSwiftCode': string };
type CardDepositObject = { 'success': boolean, 'code': number, 'message': string, 'data': { 'iApiTransactionId': string } };
type CryptoObject = Array<{ 'name': string, 'symbol': string }>;

type DepositDetails = { 'reference': string, 'currency': string, 'CountryId': string, 'amount': any, 'fundId': string };

type EFTResponse = { "bankaccountname": string, "bankname": string, "bankstreetaddress": string, "bankaccounttype": string, "bankaccountnumber": string, "bankswiftcode": string, "bankbranchcode": string };

type CardResponse = { 'iApiTransactionId': string, 'amount': string, 'fundId': string, 'reference': string };
type CryptoResponse = { 'error': string, 'result': { 'amount': string, 'txn_id': string, 'address': string, 'confirms_needed': string, 'timeout': number, 'checkout_url': string, 'status_url': string, 'qrcode_url': '' }, 'amount': string, 'fundId': string, 'reference': string, 'fees': string };


type DepositOptions = { 'EFT'?: EFTDepositObject, 'Crypto'?: CryptoObject, 'CreditCard'?: CardDepositObject, 'reference': string, 'currency': string, 'CountryId': string, 'amount': string, 'fundId': string };
type DepositObject = { 'paymentMethod': string, 'depositDetails': { 'amount': number, 'currency': string, 'base': string } };

type ExchangeRateData = Array<{ 'is_fiat': number, 'rate_btc': string, 'last_update': string, 'tx_fee': string, 'status': string, 'name': string, 'confirms': string, 'can_convert': number, 'capabilities': string[], 'explorer': string, 'accepted': number, 'symbol': string, 'imageUri'?: string }>;
type Currency = { 'is_fiat': number, 'rate_btc': string, 'last_update': string, 'tx_fee': string, 'status': string, 'name': string, 'confirms': string, 'can_convert': number, 'capabilities': string[], 'explorer': string, 'accepted': number, 'symbol': string, 'imageUri'?: string, 'selected'?: boolean, 'rate_usd'?: string };
type SupportedCurrencies = Array<{ 'name': string, data: Currency }>;
type PaymentResult = { status: string, success: boolean, message: string };

@Component({
  selector: 'app-deposit-money',
  templateUrl: './deposit-money.page.html',
  styleUrls: ['./deposit-money.page.scss'],
  providers: [NavParams]
})
export class DepositMoneyPage {

  /* Working Vars */
  payingByCard = false;
  currentPage = 'setup';
  firstLoad = true;
  public depositDetails: DepositDetails;
  depositOptions: DepositOptions;
  public depositObject: DepositObject;
  cryptoOptions: CryptoObject;

  eftResponse: EFTResponse = null;
  cardResponse: CardResponse = null;
  public cryptoResponse: CryptoResponse = null;

  paymentMethods: Array<string> = ['eft', 'card', 'Crypto'];
  public cryptoIcons = [{ name: 'Frax Coin' }, { name: 'Bitcoin' }, { name: 'Bitcoin SV' }, { name: 'Bitcoin Cash' }, { name: 'Ethereum' }, { name: 'Neo' }, { name: 'Monero' }, { name: 'Litecoin' }, { name: 'Ethereum Classic' }];

  supportedCurrencies: Currency[];
  selectedIndex = 0;

  test = '1';
  public selectedCryptoIndex = 0;
  depositPageHeader = '';

  loadCardPayment = false;

  showCurrencyList = false;
  ZARUSDRate = 0;
  ZARBTCRate = 0;

  constructor(
    public user: UserService,
    public navParams: NavParams,
    public router: Router,
    private vaultService: VaultService, 
    private pay: IonicPaymentsService
  ) {
    this.primeDepositOptionsData();
  }

  /*
  * Manages the Apple or Google Payment processes (perhaps others later)
  */
  async processPayment(provider: string): Promise<void>{

    const purchaseAmt = this.depositObject.depositDetails.amount;
    const feesAmt = 0; // Set transaction fees here....

    switch(provider){
      case 'ApplePay':
        await this.pay.doApplePayPayment(purchaseAmt, feesAmt).then((result: PaymentResult)=>{
          if(result.success){
            this.goHome();
            this.user.setToast("Deposit successful. Your wallet will be credited shortly.");
          }
        }, (result: PaymentResult)=>{
          this.user.setToast("Deposit failed. Reason: "+result.message);
        })
        break;
      case 'GooglePay':
        break;
    }
    return;
  }


  getBackgroundColor(idx: number) {
    return (idx % 2 !== 0) ? { background: "rgba(255,255,255,0.05)" } : { background: "transparent" };
  }

  getUSDRate(): number {
    const rate = this.toFloat(this.supportedCurrencies[0].rate_usd);

    if (typeof rate === "number" && rate !== 0) {
      return 1 / rate;
    }

    return 0;
  }


  getXRate(): number {
    const rate = this.toFloat(this.supportedCurrencies[0].rate_btc);

    if (typeof rate === "number" && rate !== 0) {
      return 1 / rate;
    }
    return 0;
  }

  // if fees are returned as anything but a string then 0 will be returned
  toFloat(value: any): number {
    if (!value) { return 0; }

    if (typeof value === "string") {
      return parseFloat(value);
    }

    if (typeof value === "number") {
      return value;
    }
    return 0;
  }

  async copyToClipboard(fieldname: string, str: string) {

    await Clipboard.write({
      string: str
    });

    this.user.setToast(fieldname + ' copied to device clipboard');
    return;
  }

  getIconPath(iconName: string) {
    return '/assets/icon' + iconName + '.png';
  }


  changeCurrency(symbol: string, index: number) {
    if (!symbol) { return; }

    if (symbol === 'ZAR') {
      this.depositObject.paymentMethod = this.paymentMethods[0];
    } else {
      this.depositObject.paymentMethod = this.paymentMethods[2];
    }

    this.depositObject.depositDetails.currency = symbol;
    this.depositObject.depositDetails.base = symbol;

    this.supportedCurrencies[this.selectedIndex].selected = false;
    this.supportedCurrencies[index].selected = true;
    this.selectedIndex = index;

    this.toggleSwitchCurrency();

    this.user.setShortToast("Deposit currency set to " + this.supportedCurrencies[this.selectedIndex].name);

    return;
  }

  toggleSwitchCurrency() {
    this.showCurrencyList = !this.showCurrencyList;

    return;
  }

  async primeDepositOptionsData() {
    this.depositDetails = null; // { reference: '', currency: '', CountryId: '', amount: '', fundId: '' };
    this.depositOptions = null; // { EFT: { BankAccountName: '', BankAccountNumber: '', BankAccountType: '', BankBranchCode: '', BankName: '', BankStreetAddress: '', BankSwiftCode: '' }, Crypto: [{ name: '', symbol: '' }], CreditCard: { success: true, code: 0, message: '', data: { iApiTransactionId: '' } }, reference: '', currency: '', CountryId: '', amount: '', fundId: '' };
    this.depositObject = { paymentMethod: this.paymentMethods[0], depositDetails: { amount: null, currency: 'ZAR', base: 'ZAR' } };
    this.cryptoOptions = [{ name: '', symbol: '' }];
    this.supportedCurrencies = [];
    await this.getExchangeRates();
  }

  // Used to get email address for credit card payment
  async getUserEmail(): Promise<string> {
    let token: any = null;
    return new Promise((resolve, reject) => {

      this.user.getUserInfo(this.vaultService.sessionState.session).then(
        async (response: any) => {
          if (await response.data.general.Email) {
            resolve(response.data.general.Email);
            return;
          }
          resolve("");
          return;
        }, err => {
          reject(err.msg);
          return;
        });
    });
  }

  // Build an array of supported Cryptos with their exchange rates
  getExchangeRates(): Promise<any> {
    return new Promise((resolve, reject) => {
      const rates = this.user.getSupportedCurrenciesAndRates().then((result) => {
        if (result && result.data) {

          const items = Object.keys(result.data);
          const index = 0;

          // setting local fiat currency in first position
          result.data.ZAR.imageUri = 'assets/icon/ZAR.png';
          this.supportedCurrencies.push(result.data.ZAR);
          this.supportedCurrencies[0].selected = true;
          this.depositObject.depositDetails.currency = 'ZAR';
          this.depositObject.depositDetails.base = 'ZAR';
          this.depositObject.paymentMethod = this.paymentMethods[0];

          items.forEach(element => {

            if (element !== 'ZAR' && element !== 'USD') {
              result.data[element].imageUri = 'assets/icon/' + result.data[element].symbol + '.png';
              this.supportedCurrencies.push(result.data[element]);
            }

          });

          this.ZARUSDRate = this.getUSDRate();
          this.ZARBTCRate = this.getXRate();

          return result.data;
        } else { return null; }
      }, () => {
        return false;
      });
    });
  }

  goHome() {
    this.router.navigate(['home']);
  }

  formatAddress(address: string): string {

    if (!address) { return; }
    const str = 'bitcoincash:';
    const pos = address.indexOf(str);
    if (pos !== 0) { return address; }

    return address.substr(str.length, address.length - 1);
  }

  getPaymentMethodType() {
    switch (this.depositObject.paymentMethod) {
      case 'card': return this.paymentMethods[1];
      case 'Crypto': return this.paymentMethods[2];
      default: return this.paymentMethods[0];
    }
  }

  emailDetails() {
    this.user.setToast('The deposit details have been emailed to you!');
  }

  launchExternalWebsite(url: string) {

    if (url) {
      const options: OpenOptions = { url, presentationStyle: 'popover', windowName: 'Instavest' };
      Browser.open(options);
    }

    return;
  }

  getEstBTCValue() {
    return (this.depositObject.depositDetails.amount * (1 / (+this.supportedCurrencies[0].rate_btc))) * 0.99;
  }

  getEstAltValue() {
    return this.depositObject.depositDetails.amount * (+this.supportedCurrencies[this.selectedIndex].rate_btc * (1 / (+this.supportedCurrencies[0].rate_btc))) * 0.99;
  }

  loadBankingData(): Promise<any> {
    const amount: number = this.depositObject.depositDetails.amount;
    const currency = this.depositObject.depositDetails.base;
    const denomination = this.depositObject.depositDetails.currency;
    const type = this.depositObject.paymentMethod;

    if (this.firstLoad) {
      this.currentPage = "connecting";
    }

    return new Promise((resolve, reject) => {

      this.user.loadBankingOptions(amount, currency, denomination, type).then(async (response) => {

        if (!response.success || !response.data) {
          this.user.exitToLoginPage();
          return false;
        }

        const data = response.data;

        if (this.depositObject.paymentMethod === 'Crypto') {

          if (data.result && data.result.checkout_url && data.result.checkout_url.length > 1) {

            try {
              // show crypto payment page
              this.currentPage = 'CryptoFinal';
              this.cryptoResponse = data as CryptoResponse;
              this.depositPageHeader = 'Deposit Summary';
            } catch (error) {
            }
          } else {
            // handle crypto data load error here
          }

          return;
        }

        if (data.EFT && this.depositObject.paymentMethod === this.paymentMethods[0]) {
          this.depositDetails = { reference: data.reference, currency: data.currency, CountryId: '', amount: data.amount, fundId: '' };
          this.eftResponse = (data.EFT as EFTResponse);
          this.currentPage = 'EFT_Final';
          this.depositPageHeader = 'Deposit Summary';
          return;
        }
      });
    });

  }

  // returns an address that has been modified for visual purposes
  getSafeAddress(address: string): string {
    if (!address || address.length < 20) {
      return address ? address : "";
    }

    if (address.length > 20) {
      address = this.formatAddress(address); // remove "bitcoincash:" prefix
      if (address.length > 20) { // shorten address
        address = address.substr(0, 6) + "..." + address.substr(address.length - 7, 6);
      }
    }

    return address;
  }

  goBack() {
    this.currentPage = 'setup';
    this.primeDepositOptionsData();
  }

  nextStep() {
    this.loadBankingData();
    return;
  }

  showHelp() {
    this.openModal();
  }

  async openModal() {
    let helpScreen: any = null;
    let helpText = null;

  }


}