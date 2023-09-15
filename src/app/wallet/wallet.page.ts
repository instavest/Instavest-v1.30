import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, IonInfiniteScroll, MenuController } from '@ionic/angular';
import { UserService } from '../providers/user.service';
import { Clipboard } from '@capacitor/clipboard';
import { Browser, OpenOptions } from '@capacitor/browser';

// type TransactionItem = { "FundDetId": string, "FundId": string, "IE": string, "DC": string, "Debit": string, "Credit": string, "Currency": string, "Total": string, "MainCurrency": string, "MainAmount": string, "Fees": string, "title": string, "FundStatus": string, "Status": string, "txID": string, "TransDate": string, "Code": string, "TypeId": string, "Type": string, "RecStatus": string, "TimeStamp": string, "LastEditBy": string, "ModifyDate": string, "Extra": string, "Fundtitle": string };
type EventDescription = { 'token': string, 'currency': string, 'SPV': string };
type TransactionEventList = { 'withdraw'?: Array<TransactionItem>, 'transfer'?: Array<TransactionItem>, 'Escrow Release'?: Array<TransactionItem>, 'deposit'?: Array<TransactionItem>, 'sell'?: Array<TransactionItem>, 'buy'?: Array<TransactionItem>, 'fees'?: Array<TransactionItem> };
type TransactionItem = { 'Amount': string, 'Code': string, 'Credit': string, 'Currency': string, 'CurrencyId': string, 'DC': string, 'Debit': string, 'Description': EventDescription, 'Escrow': string, 'Event': string, 'Extra': string, 'FromWallet': string, 'FromWalletAddress': string, 'Fundtitle': string, 'IE': string, 'Id': string, 'LastEditBy': string, 'ModifyDate': string, 'Name': string, 'RecStatus': string, 'SG': string, 'Status': string, 'TimeStamp': string, 'Type': string, 'TypeId': string, 'WalletAddress': string, 'WalletId': string, 'txID': string };
type HistoryItem = { 'trxEvent'?: string, 'trxHeader'?: string, 'trxDescription'?: string, 'trxValue'?: string, 'trxIcon'?: string, 'trxTimestamp'?: string, 'trxId'?: string, 'showDetail'?: boolean, 'fromAddress'?: string, 'fromLabel'?: string, 'toAddress'?: string, 'toLabel'?: string };
type FormattedTrxEventList = { 'withdraw'?: Array<HistoryItem>, 'transfer'?: Array<HistoryItem>, 'Escrow Release'?: Array<HistoryItem>, 'deposit'?: Array<HistoryItem>, 'sell'?: Array<HistoryItem>, 'buy'?: Array<HistoryItem>, 'fees'?: Array<HistoryItem> };

type AccountData = [WalletData];
type WalletData = { 'WalletId': string, 'Name': string, 'NodeAddress': string, 'EscrowAddress': string, 'MS': string, 'Status': string, 'RecStatus': string, 'Balance': { 'Fiat': [FiatTypeData], 'Asset': [AssetTypeData], 'Native': [FiatTypeData] } };
type StatsData = { 'totalOnOffer': number, 'totalBids': number, 'offerMin': number, 'offerMax': number, 'timestamp': string };
type FiatTypeData = { 'FundId': string, 'SPVNAME': string, 'Type': string, 'MemberId': string, 'Currency': string, 'Withdraw': string, 'Deposit': string, 'Spend': string, 'Income': string, 'Available': string, 'escrow_in': string, 'escrow_out': string, 'CurrencySymbol': string, 'CurrencySymbolPos': string, 'CurrencyName': string, 'locale_id': number, 'currency_code': string, 'LocalCurrency': string, 'LocalCurrencySymbol': string, 'LocalCurrencySymbolPos': string, 'Lock': boolean, 'LockEnd': number };
type AssetTypeData = { 'FundId': string, 'SPVNAME': string, 'Type': string, 'MemberId': string, 'Currency': string, 'Withdraw': string, 'Deposit': string, 'Spend': string, 'Income': string, 'Available': string, 'escrow_in': string, 'escrow_out': string, 'CurrencySymbol': string, 'CurrencySymbolPos': string, 'CurrencyName': string, 'LocalCurrency': string, 'LocalCurrencySymbol': string, 'LocalCurrencySymbolPos': string, 'Lock': boolean, 'LockEnd': number, 'LegalId': string, 'market': string, 'share_value': string, 'LegalMemberId': string, 'Stats': StatsData };

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.scss'],
})

export class WalletPage {
  @ViewChild(IonInfiniteScroll) infiniteScroll: IonInfiniteScroll;

  constructor(
    public actionSheetCtrl: ActionSheetController,
    public menuCtrl: MenuController,
    public alertController: AlertController,
    public user: UserService,
    public router: Router) {
    this.resetPagination();
    this.primeDataObjects(true);
  }

  firstEntry = true;

  actionSheet: HTMLIonActionSheetElement;

  intervalId: number;

  EOList = false;

  explorerUrl = 'https://explorer.fraxeum.com/Fraxeum%20Explorer/tx/';

  /* Transaction list specific variables */
  noContentMessage = 'Loading...';
  noTransactionsMessage = 'This wallet has no transaction history.';

  transactionList: TransactionEventList;
  formattedEventList: FormattedTrxEventList;
  eventKeys: Array<string>;

  selectedWalletId: string;
  currentSelectedIndex: number;
  showAccountList = false;
  showTransactionList = false;
  showTransferView = false;
  accountList: AccountData = null;
  showNoTransactionsMessage: boolean;

  walletName = 'My Wallet';

  pagination: {
    'transactionlist': {
      'page': number,
      'limit': number
    }
  };

  currentPage: any;

  emailMyStatement() {
    // Function to be implemented
  }

  getBackgroundColor(idx: number) {
    return (idx % 2 !== 0) ? { background: "rgba(255,255,255,0.05)" } : { background: "transparent" };
  }

  toggleView() {
    if (this.showTransferView) {
      this.showTransferView = false;
    }

    if (!this.showAccountList && !this.showTransactionList) {
      this.showAccountList = true;
      this.showTransferView = false;
      return;
    }

    this.showAccountList = !this.showTransactionList;
  }


  async addWallet() {
    console.log('addWallet');

    const alert = await this.alertController.create({
      header: 'New Wealth Wallet',
      cssClass: 'custom-alert',
      message: 'Give your new Wealth Wallet a descriptive name. Select <i>Next</i> to continue.',
      inputs: [
        {
          name: 'Name',
          placeholder: 'Max length 50'
        }
      ],
      buttons: [
        {
          text: 'Close',
          handler: data => {
            return true;
          }
        },
        {
          text: 'Next',
          handler: data => {
            if (!data.Name || data.Name.length > 50) {
              if (!data.Name) { this.user.setToast('Your wallet name cannot be blank.'); return; }
              this.user.setToast('Your wallet name cannot be longer than 50 letters and or numbers.');
              return;
            }
            if (!data.Name.match(new RegExp('^[a-zA-Z0-9\\-\\_\\s]+$'))) {
              this.user.setToast('Your wealth wallet name should consist of only letters, numbers, space, -, and _');
              return;
            }

            this.createWallet(data.Name).then(
              async (result) => {
                return true;
              },
              error => {
                this.user.setToast("Wallet creation failed. Please try again or contact Bmoney Support (support@instavestcapital.com).", true);
              });
          }
        }
      ]
    });

    await alert.present();

  }

  createWallet(name: string) {
    this.user.setShortToast("Creating wallet on Fraxeum...");
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.user.createNewWallet(name).then(async (response) => {
          await this.primeDataObjects();
          await this.initAccountList();
          this.user.setShortToast("Wallet created!");
        }, (e) => { });
      }, 750);
    });
  }

  // seller withdrawing own sales order
  async showWalletOptions(index: number) {

    let addTransferBtn = false;

    await this.checkAddTransferButton(index).then((result) => {
      addTransferBtn = result;
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Options',
      cssClass: 'action-sheet-bg',
      buttons: this.generateButtons(addTransferBtn, index)
    });
    await actionSheet.present();
  }

  generateButtons(transferBtn: boolean, index: number) {
    const buttons = [];

    if (transferBtn) {
      buttons.push({
        text: 'Transfer shares',
        handler: () => {
          // show transfer view
          this.router.navigate(['transfer-funds']);
        }
      });
    }

    buttons.push({
      text: 'Show transactions',
      handler: () => {
        this.loadTransactionData(null, false, index);
        return;
      }
    });

    buttons.push({
      text: 'Show escrow details',
      handler: () => {
        this.loadTransactionData(null, true, index);
        return;
      }
    });

    buttons.push({
      text: 'Dismiss',
      role: 'cancel',
      handler: () => {
        console.log('Cancel clicked');
      }
    });

    return buttons;
  }

  // checks if any one of the Asset type balances have an Available balance
  checkAddTransferButton(index: number): Promise<boolean> {

    return new Promise((resolve, reject) => {
      if (this.accountList.length > 1 && /* Can only transfer if there are more than one account numbers created */
        this.accountList[index] &&
        this.accountList[index].Balance &&
        this.accountList[index].Balance.Asset &&
        this.accountList[index].Balance.Asset.length > 0) {
        this.accountList[index].Balance.Asset.forEach(element => {
          if (+element.Available > 0) {
            console.log('returned true');
            resolve(true);
          }
        });
      }
      resolve(false);
    });
  }


  getSellPrice(index: number): number {
    const sellprice: number = null;

    if (isNaN(+sellprice)) {
      return 0;
    }

    const num: number = Number(sellprice);

    return Number(sellprice);
  }


  toggleInfiniteScroll() {
    if (this.infiniteScroll) { this.infiniteScroll.disabled = true; }
  }


  back() {
    this.primeDataObjects(false);
    this.toggleView();
  }

  primeDataObjects(resetAccountList?: boolean) {

    this.walletName = 'My Shares';

    this.eventKeys = null;
    this.showNoTransactionsMessage = false;
    this.showTransactionList = false;
    this.showTransferView = false;
    this.showAccountList = true;
    this.currentSelectedIndex = 0;
    this.selectedWalletId = null;
    // this.accountList = resetAccountList ? null : this.accountList;
    this.transactionList = null;
    this.formattedEventList = null;
    this.formattedEventList = { withdraw: new Array(), transfer: new Array(), 'Escrow Release': new Array(), deposit: new Array(), sell: new Array(), buy: new Array(), fees: new Array() };

    return;
  }


  resetPagination() {
    this.pagination = {
      transactionlist: {
        page: 0,
        limit: 30
      }
    };
  }


  async loadData(infs: any): Promise<any> {
    console.log('this is event: ' + event);
    console.log(event);

    this.infiniteScroll = infs;

    return new Promise((resolve, reject) => {

      this.loadTransactionData(this.selectedWalletId, false, -1).then(() => {


        if (this.EOList) {
          console.log('Infinite Scroll Disabled - EOList');
          this.toggleInfiniteScroll();
          resolve(true);

        } else {
          console.log('Infinite Scroll Complete');
          if (this.infiniteScroll) { this.infiniteScroll.complete(); }
          resolve(true);
        }


      }, () => {
        console.log('Infinite Scroll Disabled - Error');
        this.toggleInfiniteScroll();
        resolve(true);
      });

    });

  }


  convertDate(dateStr: string) {
    return Date.parse(dateStr);
  }

  /*
   async pollData() {
    this.loadTransactionData().then(() => { }, () => { });
    return;
  }
*/
  async loadAccountList(): Promise<any> {

    return new Promise((resolve, reject) => {

      this.fetchAccountList().then((data) => {

        if (!data) {
          reject(null);
          return;
        }
        console.log('Account List received: ');
        console.log(data);

        resolve(data.data);


      }, (error) => {
        reject(null);

      });
    });
  }


  makeWalletName(isEscrow: boolean) {

    let name = (this.currentSelectedIndex === 0) ? 'Main Wallet' : this.accountList[this.currentSelectedIndex].Name;

    name += isEscrow ? ' (Escrow)' : '';

    return name;
  }

  async loadTransactionData(walletid: string, isEscrow: boolean, index: number, dir?: string, event?: any): Promise<any> {

    this.eventKeys = null;

    this.currentSelectedIndex = (index > -1) ? index : 0;

    this.selectedWalletId = (walletid != null) ? walletid : this.accountList[this.currentSelectedIndex].WalletId;

    return new Promise((resolve, reject) => {
      this.transactionList = null;
      this.showAccountList = false;
      this.showTransactionList = true;

      this.fetchListData(this.selectedWalletId, isEscrow).then((data: TransactionEventList) => {
        this.walletName = this.makeWalletName(isEscrow);

        if (!data) {
          reject(null);
          return;
        }

        if ((Object.keys(data)).length < 1) {
          this.EOList = true;
          this.showTransactionList = false;
          this.showNoTransactionsMessage = true;
          resolve(false);
          return;
        }

        this.formatTrxList(data);

        resolve(true);

      });
    });


  }

  exploreBlockchain(txID: string) {
    this.launchExternalWebsite(this.explorerUrl + txID);
    return;
  }

  launchExternalWebsite(url: string) {

    if (url) {
      const options: OpenOptions = {url, presentationStyle: 'popover', windowName: 'Instavest'};
      const browser = Browser.open(options);
    }

    return;
  }

  async fetchAccountList(): Promise<any> {

    return new Promise((resolve, reject) => {

      this.user.getAccountList('finance').then(async (data) => {

        if (!data || (!data.success && data.code === '1000')) {
          this.user.exitToLoginPage();
          resolve(false);
        }


        resolve(data);


      }, (data) => {
        console.log('getAccountList rejected promise');

      });

    });

  }


  async fetchListData(walletid: string, isEscrow: boolean): Promise<any> {

    return new Promise((resolve, reject) => {

      this.user.getTransactionList('finance', this.pagination.transactionlist.limit, this.pagination.transactionlist.page, walletid, isEscrow).then(async (data) => {

        if (!data || (!data.success && data.code === '1000')) {
          this.user.exitToLoginPage();
          resolve(false);
        }

        if (data.msg === 'You have reached the end of the list.') {
          this.user.setToast('No more transactions to load');
          this.EOList = true;
          resolve(false);
        }

        if (data.data) {
          this.EOList = false;
          resolve(data.data);
        }

      }, (data) => {
        console.log('getTransactionList rejected promise');

      });

    });

  }

  /*
  returns null if input data has no transaction records
  */
  formatTrxList(data: TransactionEventList) {

    let eventArray: Array<TransactionItem> = null;
    const key = '';

    this.eventKeys = Object.keys(data);

    if (this.eventKeys.length === 0) {
      this.showNoTransactionsMessage = true;
      return;
    }

    this.eventKeys.forEach(element => {

      eventArray = data[element];

      eventArray.forEach(async transactionItem => {
        let count = -1;
        count++;

        // skips transactions where there is no blockchain reference
        await this.createItem(transactionItem).then(async (item: HistoryItem) => {

          try {
            await this.formattedEventList[element].push(item);
          } catch (error) {
            console.log(error.message);
          }


          console.log('this.formattedEventList[' + element + '] = ');
          console.log(this.formattedEventList[element]);
        }, (error) => {

        });

      });
    });

  }

  toggleDetail(event: string, id: number) {
    this.formattedEventList[event][id].showDetail = !this.formattedEventList[event][id].showDetail;
  }

  // returns null if no blockchain transaction ID is present
  createItem(item: TransactionItem): Promise<HistoryItem> {

    return new Promise((resolve, reject) => {

      if (!item.txID || !(item.txID.length > 0)) { item.txID = this.selectedWalletId ? this.selectedWalletId : 'baRo911vAeab761bmaTBrVVz'; } // txID bug hack

      const eventType = item.Event;
      const formattedItem: HistoryItem = { trxEvent: '', trxHeader: '', trxDescription: '', trxValue: '', trxIcon: '', trxTimestamp: '', trxId: '', showDetail: false };

      formattedItem.trxEvent = item.Event;
      formattedItem.trxId = item.txID;
      formattedItem.trxTimestamp = item.TimeStamp;
      // "trxEvent":string, "trxHeader":string,"trxDescription":string,"trxValue":string, "trxIcon":string, "trxTimestamp":string, "trxId":string

      switch (eventType) {
        case 'withdraw': {
          formattedItem.trxHeader = 'Withdrawal';
          formattedItem.trxDescription = 'Withdaw to bank';
          formattedItem.trxValue = this.makeTrxValue(item.Currency, item.Amount, item.DC, true);
          formattedItem.trxIcon = 'ios-arrow-round-back';
          break;
        }
        case 'transfer': {
          formattedItem.trxHeader = 'Transfer';
          formattedItem.trxDescription = 'Asset transfer';
          formattedItem.trxValue = this.makeTrxValue(item.Currency, item.Amount, item.DC);
          formattedItem.trxIcon = 'ios-arrow-round-forward';
          formattedItem.fromAddress = item.FromWalletAddress;
          formattedItem.toAddress = item.WalletAddress;
          formattedItem.fromLabel = 'From:';
          formattedItem.toLabel = 'To' + ((item.Status === 'E') ? ' escrow' : '') + ':';
          break;
        }
        case 'Escrow Release': {
          formattedItem.trxHeader = 'Released';
          formattedItem.trxDescription = 'Asset released';
          formattedItem.trxValue = this.makeTrxValue(item.Currency, item.Amount, item.DC);
          formattedItem.trxIcon = 'ios-checkbox-outline';
          formattedItem.fromAddress = item.FromWalletAddress;
          formattedItem.toAddress = item.WalletAddress;
          formattedItem.fromLabel = 'From escrow:';
          formattedItem.toLabel = 'To:';
          break;
        }
        case 'deposit': {
          formattedItem.trxHeader = 'Deposit';
          formattedItem.trxDescription = 'Deposit';
          formattedItem.trxValue = this.makeTrxValue(item.Currency, item.Amount, item.DC, true);
          formattedItem.trxIcon = 'ios-arrow-round-down';
          break;
        }
        case 'sell': {
          formattedItem.trxHeader = 'Asset sale';
          formattedItem.trxDescription = item.Description.SPV + ' shares' + ((item.Status === 'E') ? ' (escrow)' : '');
          formattedItem.trxValue = this.makeTrxValue(item.Currency, item.Amount, item.DC, true);
          formattedItem.trxIcon = 'ios-pricetag';
          formattedItem.fromAddress = item.FromWalletAddress;
          formattedItem.toAddress = item.WalletAddress;
          formattedItem.fromLabel = 'From:';
          formattedItem.toLabel = 'To' + ((item.Status === 'E') ? ' escrow' : '') + ':';
          break;
        }
        case 'buy': {
          formattedItem.trxHeader = 'Asset purchase';
          formattedItem.trxDescription = item.Description.SPV + ' shares';
          formattedItem.trxValue = this.makeTrxValue(item.Currency, item.Amount, item.DC, true);
          formattedItem.trxIcon = 'ios-remove-circle';
          formattedItem.fromAddress = item.FromWalletAddress;
          formattedItem.toAddress = item.WalletAddress;
          formattedItem.fromLabel = 'From:';
          formattedItem.toLabel = 'To' + ((item.Status === 'E') ? ' escrow' : '') + ':';
          break;
        }
        case 'fees': {
          formattedItem.trxHeader = 'Transaction fee';
          formattedItem.trxDescription = 'Transaction ...' + item.txID.slice(item.txID.length - 10);
          formattedItem.trxValue = this.makeTrxValue(item.Currency, item.Amount, item.DC);
          formattedItem.trxIcon = 'md-funnel';
          formattedItem.fromLabel = 'From:';
          formattedItem.fromAddress = item.FromWalletAddress;
          break;
        }
      }

      resolve(formattedItem);
    });


  }



  shortenString(longStr: string): string {
    if (!longStr) { return ''; }
    return longStr.substr(0, 10) + '...';
  }

  makeTrxValue(currency: string, amount: string, credebt?: string, toFixed?: boolean): string {
    let trxValue = '';
    const fixed = toFixed ? true : false;

    trxValue = (currency === 'ZAR') ? 'R ' + ((fixed) ? (+amount).toFixed(2).toLocaleString() : amount) : ((fixed) ? (+amount).toFixed(2).toLocaleString() : amount) + ' ' + currency;
    console.log('Calcuted trxValue: ' + trxValue);

    if (credebt) { trxValue = (credebt === 'D') ? '-' + trxValue : '+' + trxValue; }
    return trxValue;
  }



  createTitle(debit_credit: string, currency: string, spvname: string, orginal_title: string, type: string): string {
    let title: string = null;

    if (currency === 'ZAR') {
      if (debit_credit === 'D') {
        title = 'Paid for ' + spvname + ' shares';
      } else {
        title = 'Earned from ' + spvname + ' sale';
      }
    }


    if (currency !== 'ZAR') {
      if (debit_credit === 'D') {
        title = 'Sold ' + spvname + ' shares';
      } else {
        title = 'Bought ' + spvname + ' shares';
      }
    }

    if (type !== 'I' && orginal_title === 'Fees') {
      title = 'Fees: ' + spvname + ' trade';
    } else { title.charAt(0).toUpperCase(); }

    return title;
  }

  closeTransctionList(fb) {
    this.router.navigate(['home']);
  }

  initAccountList() {

    this.loadAccountList().then(async (data: AccountData) => {

      if (data && data.length > 0) {
        // show account list
        this.accountList = await data;
        this.showAccountList = true;
        return;
      }
      // data didn't load
      this.user.setToast("No account information found for your profile. Please try again or contact Bmoney Support (support@instavestcapital.com).");
      this.router.navigate(['home']);
      return;

    }, (error) => {
      this.user.setToast("No account information found for your profile. Please try again or contact Instavest Support (support@instavestcapital.com).");
    });
  }

  async copyToClipboard(fieldname: string, str: string) {
  
    await Clipboard.write({
      string: str
    });

    this.user.setToast(fieldname + ' copied to device clipboard');
    return;
  }



  ionViewWillEnter() {
    // let thisRef = this;
    this.initAccountList();
  }



  showHelp() {
    this.openModal();
  }

  async openModal() {
    let helpScreen: any = null;
    let helpText = null;
    this.currentPage = 'wallet';
    console.log('currentPge', this.currentPage);

  }

}
