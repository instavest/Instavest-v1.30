import { Component, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NavParams, AlertController } from '@ionic/angular';
import { UserService } from '../providers/user.service';
type AccountInfo = { 'currencyName': string, 'currencySymbol': string, 'walletaddress': string };
type TransferObject = { 'walletfromaddress': string, 'wallettoaddress': string, 'currency': string, 'amount': string };
type AccountData = [WalletData];
type WalletData = { 'WalletId': string, 'Name': string, 'NodeAddress': string, 'EscrowAddress': string, 'MS': string, 'Status': string, 'RecStatus': string, 'selected'?: boolean, 'show'?: boolean, 'role'?: string, 'Balance': { 'Fiat': [FiatTypeData], 'Asset': [AssetTypeData], 'Native': [FiatTypeData] } };
type StatsData = { 'totalOnOffer': number, 'totalBids': number, 'offerMin': number, 'offerMax': number, 'timestamp': string };
type FiatTypeData = { 'FundId': string, 'SPVNAME': string, 'Type': string, 'MemberId': string, 'Currency': string, 'Withdraw': string, 'Deposit': string, 'Spend': string, 'Income': string, 'Available': string, 'escrow_in': string, 'escrow_out': string, 'CurrencySymbol': string, 'CurrencySymbolPos': string, 'CurrencyName': string, 'locale_id': number, 'currency_code': string, 'LocalCurrency': string, 'LocalCurrencySymbol': string, 'LocalCurrencySymbolPos': string, 'Lock': boolean, 'LockEnd': number };
type AssetTypeData = { 'FundId': string, 'SPVNAME': string, 'Type': string, 'MemberId': string, 'Currency': string, 'Withdraw': string, 'Deposit': string, 'Spend': string, 'Income': string, 'Available': string, 'escrow_in': string, 'escrow_out': string, 'CurrencySymbol': string, 'CurrencySymbolPos': string, 'CurrencyName': string, 'LocalCurrency': string, 'LocalCurrencySymbol': string, 'LocalCurrencySymbolPos': string, 'Lock': boolean, 'LockEnd': number, 'LegalId': string, 'market': string, 'share_value': string, 'LegalMemberId': string, 'selected'?: boolean, 'Stats': StatsData };

@Component({
  selector: 'app-transfer-funds',
  templateUrl: './transfer-funds.page.html',
  styleUrls: ['./transfer-funds.page.scss'],
  providers: [NavParams]
}) 

export class TransferFundsPage {
  currentPage: string;
  transferObject: TransferObject;
  fromCurrencyName: string = null;
  accountList: AccountData = null;
  cleanAccList: AccountData = null;
  showAccountList = false;
  showCurrencyList = false;
  public selectedIndexFrom: WalletData;
  public selectedIndexTo: WalletData;
  public lastSelectedAccount: WalletData;
  public selectedAsset: AssetTypeData;
  public selectedAssetBalance: number;
  public fromItemIndex = 0;
  public toItemIndex = 0;
  showConfirm = false;
  errMsg = "";
  readyToSubmit = false;

  showImpossibleMsg = null;
  showTransferActivity = false;

  constructor(public user: UserService, 
              public navParams: NavParams,
              public alertController: AlertController, 
              public router: Router,
              public activatedRoute: ActivatedRoute,
              public changeDetector: ChangeDetectorRef) {

    this.activatedRoute.queryParams.subscribe((selectedAccount?: WalletData) => {
      if (selectedAccount) {
        this.lastSelectedAccount = selectedAccount && selectedAccount.Name ? selectedAccount : null;
      }
    });

    this.primeObjects();
  }

  primeObjects() {
    this.transferObject = { walletfromaddress: '', wallettoaddress: '', currency: '*', amount: null };
    const initialisedAcc: WalletData = {
      WalletId: '', Name: '', NodeAddress: '', EscrowAddress: '', MS: '', Status: '', RecStatus: '', selected: false, show: true, role: 'from', Balance: {
        Fiat: [{ FundId: '', SPVNAME: '', Type: '', MemberId: '', Currency: '', Withdraw: '', Deposit: '', Spend: '', Income: '', Available: '', escrow_in: '', escrow_out: '', CurrencySymbol: '', CurrencySymbolPos: '', CurrencyName: '', locale_id: 0, currency_code: '', LocalCurrency: '', LocalCurrencySymbol: '', LocalCurrencySymbolPos: '', Lock: false, LockEnd: 0 }],
        Asset: [{ FundId: '', SPVNAME: '', Type: '', MemberId: '', Currency: '', Withdraw: '', Deposit: '', Spend: '', Income: '', Available: '', escrow_in: '', escrow_out: '', CurrencySymbol: '', CurrencySymbolPos: '', CurrencyName: '', LocalCurrency: '', LocalCurrencySymbol: '', LocalCurrencySymbolPos: '', Lock: false, LockEnd: 0, LegalId: '', market: '', share_value: '', LegalMemberId: '', selected: false, Stats: { totalOnOffer: 0, totalBids: 0, offerMin: 0, offerMax: 0, timestamp: '' } }],
        Native: [{ FundId: '', SPVNAME: '', Type: '', MemberId: '', Currency: '', Withdraw: '', Deposit: '', Spend: '', Income: '', Available: '', escrow_in: '', escrow_out: '', CurrencySymbol: '', CurrencySymbolPos: '', CurrencyName: '', locale_id: 0, currency_code: '', LocalCurrency: '', LocalCurrencySymbol: '', LocalCurrencySymbolPos: '', Lock: false, LockEnd: 0 }]
      }
    };
    this.selectedIndexFrom = this.lastSelectedAccount ? this.lastSelectedAccount : JSON.parse(JSON.stringify(initialisedAcc));
    this.selectedAsset = this.selectedIndexFrom.Balance.Asset[0];
    this.selectedAssetBalance = this.toFloat(this.selectedIndexFrom.Balance.Asset[0].Available);
    this.selectedAsset.selected = true;
    this.selectedIndexTo = JSON.parse(JSON.stringify(initialisedAcc));
    this.selectedIndexTo.Name = "---- Select -----";
    this.selectedIndexTo.role = 'to';
    this.selectedIndexTo.selected = true;
  }

  getSelectedAssetBalance() {
    // Changes the Available balance from string to a number to test that it exists else returns 0
    return this.selectedAssetBalance;
  }

  doCheckReady() {
    this.readyToSubmit = this.checkReady();
  }

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

  goHome() {
    this.primeObjects();
    this.router.navigate(['home']);
  }

  toggleShowConfirm() {
    this.showConfirm = false;
  }

  async nextStep() {
    if (await this.validateAmount()) {
      this.transferObject.amount = "" + (Math.floor(await this.toFloat(this.transferObject.amount)));
      this.showConfirmAlert();
    } else {
      await this.user.setToast(this.errMsg);
    }
  }


  /* Adding working variables */
  primeAccountListData() {
    /* remove all accounts that don't have valid assest to tansfer */
    const cleanAccList: any = [];

    this.accountList.forEach((element: WalletData) => {
      if (element.Balance && element.Balance.Asset.length > 0 && element.Balance.Asset[0].FundId !== '0') {
        element.selected = false;
        element.show = true;
        cleanAccList.push(element);
      }
    });

    this.cleanAccList = cleanAccList;

    /* prime working variables items */
    let i = 0;
    this.cleanAccList.forEach((element) => {
      if (this.selectedIndexFrom.NodeAddress.length === 0) {
        this.selectedIndexFrom = element;
        this.selectedIndexFrom.selected = true;
        this.selectedIndexFrom.role = 'from';

        this.selectedAsset = element.Balance.Asset[0];

        this.fromItemIndex = i;

      } else if (this.selectedIndexTo.NodeAddress.length === 0) {
        this.selectedIndexTo = element;
        this.selectedIndexTo.selected = true;
        this.selectedIndexFrom.role = 'to';

        this.toItemIndex = i;

      } else {
        element.selected = false;
        element.role = null;
      }
      ++i;

    });
    this.selectedAssetBalance = this.toFloat(this.selectedAsset.Available);
    this.setTransferObject(this.selectedIndexFrom.NodeAddress, this.selectedIndexTo.NodeAddress, this.selectedAsset.Currency, null);
  }

  setValue(id: number) {

    // setting to
    if (this.selectedIndexTo.show) {
      /* if(this.selectedIndexTo.role === 'to')*/
      /* reset role for departing account */
      this.selectedIndexTo.role = null;
      this.accountList[id].selected = false;

      /* set new to account */
      this.selectedIndexTo = this.accountList[id];
      this.accountList[id].role = 'to';
      this.accountList[id].selected = true;

      /* add items to transfer object*/
      this.setTransferObject(null, this.selectedIndexTo.NodeAddress, null, null);

    } else {
      this.selectedIndexFrom.role = null;
      this.cleanAccList[id].selected = false;

      this.selectedIndexFrom = this.cleanAccList[id];
      this.cleanAccList[id].role = 'from';
      this.cleanAccList[id].selected = true;
      console.log(this.selectedIndexFrom);
      // should be safe as we've cleaned the account list
      this.selectedAssetBalance = this.toFloat(this.selectedIndexFrom.Balance.Asset[0].Available);

      this.setTransferObject(this.selectedIndexFrom.NodeAddress, null, null, null);
    }
    this.toggleSwitchAccount(null);

  }


  toggleSwitchAccount(source: string) {
    // show account list but disable the alternate (from/to) selected item i.e. user cannot select same account for to and from
    
    if (source === 'to') {
      this.selectedIndexTo.role = source;
      this.selectedIndexFrom.show = false;
      this.selectedIndexTo.show = true;

    } else if (source === 'from') {
      this.selectedIndexFrom.role = source;
      this.selectedIndexTo.show = false;
      this.selectedIndexFrom.show = true;

    }

    this.showAccountList = !this.showAccountList;

    return;

  }

  setCurrency(id: string) {
    this.selectedAsset.selected = null;
    this.selectedAsset = this.selectedIndexFrom.Balance.Asset[id];
    this.selectedAssetBalance = this.toFloat(this.selectedIndexFrom.Balance.Asset[id].Available);
    this.selectedAsset.selected = true;
    this.setTransferObject(null, null, this.selectedAsset.Currency, null);
    this.toggleSwitchCurrency();
  }


  toggleSwitchCurrency() {
    // no longer used
    this.showCurrencyList = !this.showCurrencyList;

  }

  setTransferObject(fromAcc?: string, toAcc?: string, cur?: string, amt?: string) {
    console.log("called setTransferObject()");
    if (fromAcc) { this.transferObject.walletfromaddress = fromAcc ? fromAcc : ''; }
    if (toAcc) { this.transferObject.wallettoaddress = toAcc ? toAcc : ''; }
    if (cur) { this.transferObject.currency = cur ? cur : ''; }
    if (amt) { this.transferObject.amount = amt ? amt : null; }
    this.readyToSubmit = this.checkReady();
  }

  checkReady(): boolean {
    if (!this.transferObject.walletfromaddress || this.transferObject.walletfromaddress.length < 1) {
      return false;
    }
    if (!this.transferObject.wallettoaddress || this.transferObject.wallettoaddress.length < 1) {
      return false;
    }
    if (!this.transferObject.currency || this.transferObject.currency.length < 1) {
      return false;
    }
    if (!this.transferObject.amount || isNaN(+this.transferObject.amount) || parseFloat(this.transferObject.amount) < 0.00000001 || parseFloat(this.transferObject.amount) > +this.selectedAsset.Available) {
      return false;
    }
    return true;
  }

  validateAmount() {
    if (this.toFloat(this.transferObject.amount) > this.toFloat(this.selectedAsset.Available)) {
      this.errMsg = "You cannot transfer more shares than you own.";
      return false;
    }
    return true;
  }

  async completeTransfer() {
    this.user.setShortToast("Transferring shares...");
    setTimeout(()=>{
      this.doTransfer().then((response: any) => {
      this.showTransferActivity = false;
      if (response && response.success) {
        this.primeObjects();
        this.user.setShortToast("Shares transferred!");
      }
    }, (error) => {
      this.user.setToast(error.message);
    });
    },750)
  }


  doTransfer() {
    this.showConfirm = false;

    this.showTransferActivity = true;

    return new Promise((resolve, reject) => {

      this.user.doTransfer("wallettransfer", this.transferObject.walletfromaddress, this.transferObject.wallettoaddress, this.transferObject.currency, this.transferObject.amount).then(async(data) => {

        this.user.dismissLoadingPopup();

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

  async showConfirmAlert() {
    const message = 'You are about to transfer ' +
    this.transferObject.amount +
     " " + 
     this.selectedAsset.SPVNAME +
    ' shares from your ' + this.selectedIndexFrom.Name +
    ' wallet to your ' + this.selectedIndexTo.Name + ' wallet';

    await this.alertController.create({
      header: 'Confirm transfer',
      cssClass: 'custom-alert',
      message,
      backdropDismiss: true,
      buttons: [{
        text: 'Cancel',
        role: 'cancel',
        handler: () => { }
      },
      {
        text: 'Confirm',
        handler: () => {
          this.completeTransfer();
        }
      }]
    })
      .then(alert => {
        alert.present();
      });
  }

  async fetchAccountList(): Promise<any> {

    return new Promise((resolve, reject) => {

      this.user.getAccountList('finance').then(async(data) => {

        if (!data || (!data.success && data.code === '1000')) {
          this.user.exitToLoginPage();
          resolve(false);
        }
        resolve(data);

      }, err => {
      });

    });

  }



  async loadAccountList(): Promise<any> {

    return new Promise((resolve, reject) => {

      this.fetchAccountList().then((data) => {
        if (!data) {
          reject(null);
          return;
        }

        resolve(data.data);

      }, (error) => {
        reject(null);

      });
    });
  }



  initAccountList(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.loadAccountList().then(async(data: AccountData) => {
        if (!data) {
          /* Handle no data response */
          reject(null);
          return;
        }
        if (data.length < 2) {
          reject(false);
          return;
        }

        this.accountList = await data;
        await this.primeAccountListData();
        resolve(true);
      }, (error) => {
        reject(null);
      });

    });
  }

  showHelp() {
    this.openModal();
  }

  async openModal() {
    let helpScreen: any = null;
    let helpText = null;
    console.log('currentPge', this.currentPage);

  }

  ionViewWillEnter(){
    this.doInitAccount();
  }

  async doInitAccount(){
    await this.initAccountList().then(
      async success => {
        this.showImpossibleMsg = false;
      },
      async failed => {
        this.showImpossibleMsg = true;
      });
    this.changeDetector.detectChanges();
  }

}
