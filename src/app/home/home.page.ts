import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { NavigationExtras, Router, Navigation, ActivatedRoute } from '@angular/router';
import { ActionSheetController, AlertController, MenuController, Platform } from '@ionic/angular';
import { UserService } from '../providers/user.service';
import { Browser, OpenOptions } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { VaultService } from '../providers/vault.service';
import { environment } from 'src/environments/environment';

type BannerImage = { uri: string, routerLink?: string };
type DataMessage = { type: string, action: string, message: string };
type PushMessage = { data: DataMessage };

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {

  menu: MenuController;
  doneLoading = false; // used in setting loading screen
  ccclass: string;
  public shares: any[];
  public money: any[];
  public native: any[];
  isInitialLoad = true;
  userName: string;
  userdata = null;
  currentPage: any;
  showWithdrawButton = false;

  bannerImages: Array<BannerImage> = [
    { uri: 'assets/sections/login_banner.png', routerLink: '/investment-detail-one' }
  ];

  constructor(
    public actionSheetCtrl: ActionSheetController,
    public alertController: AlertController,
    public changeRef: ChangeDetectorRef,
    public menuCtrl: MenuController,
    public userService: UserService,
    public route: ActivatedRoute,
    public platform: Platform,
    public router: Router,
    private vaultService: VaultService
  ) {
    this.menu = menuCtrl;
    this.menu.enable(true, 'main');
    this.setEventsListenerService();
  }

  setEventsListenerService() {
    /*
    this.globalEventService.getObservable().subscribe((messageBody: PushMessage) => {
      
      messageBody dataStructure { data: { type: "deposit", action: "reload", message: "Your wallet has been credited with 10 ZAR" }}
      

      if(messageBody && messageBody.data && (messageBody.data.type === "deposit" && messageBody.data.action === "reload")){
        this.refreshBalances();
        this.userService.setToast(messageBody.data.message, true);
      }
    });
    */
    return;
  }

  async toggleMenu() {
    await this.menu.toggle("main");
  }

  // Fetches user data from the server if this is the first time this screen loads... 
  // the entire user data handling should be a service
  ionViewWillEnter() {

    /* User session is stored in a vault on the device chip. The vault locks after
    * a period of inactivity. Once locked the session var is cleared.
    * A locked vault (or clear session variable) means the user needs to re-authenticate.
    */

    if(this.vaultService.sessionState.isLocked || this.vaultService.sessionState.session.length < 1){
      this.userService.exitToLoginPage();
      return;
    }

    if (this.isInitialLoad) {
      this.initUserData();
    }
  }

  async initUserData() {
    await this.getUserInfo(this.vaultService.sessionState.session).then(async (userdata) => {
      if (await userdata) {
        await this.setupHome(userdata);
      } else { // no data received
        this.userService.exitToLoginPage();
      }
      await this.userService.dismissLoadingPopup();
    });
    return;
  }

  primeAssetObjects() {
    // this.money = [{ FundId: '', SPVNAME: '', Type: '', MemberId: '', Currency: 'ZAR', Withdraw: '', Deposit: '', Spend: '', Income: '', Available: '0.00', escrow_in: '', escrow_out: '', CurrencySymbol: '', CurrencySymbolPos: '', CurrencyName: '', LocalCurrency: '', LocalCurrencySymbol: '', LocalCurrencySymbolPos: '', Extra: '', RecStatus: '', locale_id: '', currency_code: '' }];
    // this.shares = [{ FundId: '', SPVNAME: '', Type: '', MemberId: '', Currency: '', Withdraw: '', Deposit: '', Spend: '', Income: '', Available: '', escrow_in: '', escrow_out: '', CurrencySymbol: '', CurrencySymbolPos: '', CurrencyName: '', LocalCurrency: '', LocalCurrencySymbol: '', LocalCurrencySymbolPos: '', Extra: '', RecStatus: '', locale_id: '', currency_code: '', Lock: true, LockEnd: '', LegalId: '', market: '', share_value: '', LegalMemberId: '', Stats: { totalOnOffer: '', totalBids: '', offerMin: '', offerMax: '', timestamp: '' }, showShares: true, showMarket: false, showDetail: false }];
    this.native = [];
  }


  async setupHome(userdata) {
    this.userdata = userdata;

    if (this.isInitialLoad) {
      // setting data structures
      await this.setDataStructures().then(async () => {
        this.isInitialLoad = false;
        this.doneLoading = true;
      });
    }
  }

  // gets userdata for auto login if session is still valid
  async getUserInfo(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.userService.getUserInfo(token).then((response: any) => {
        if (response && response.success && response.data) {
          resolve(response.data);
          return;
        }
        resolve(false);
      }, err => {
        resolve(false);
      });
    });
  }

  ionViewDidEnter() {
    this.menu.enable(true, "main");
    this.menu.swipeGesture(true);
    this.userService.dismissLoadingPopup();

    if (!this.isInitialLoad) {
      this.refreshBalances();
    }
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

  refreshBalances() {

    this.userService.refreshWalletBalances().then((data: any) => {
      if (data.Fiat && data.Fiat.length > 0) {
        this.money = data.Fiat;
      }

      if (data.Asset && data.Asset.length > 0) {
        this.shares = this.setSharesBalances(data.Asset);
      }

      if (data.Native && data.Native.length > 0) {
        this.native = data.Native;
      }

      this.changeRef.detectChanges();
    }, () => {

    });
  }

  shareViewCarousel(index?: number, name?: string) {

    if (name) {
      switch (name) {
        case 'market':
          this.shares[index].showDetail = false;
          this.shares[index].showMarket = true;
          this.shares[index].showShares = false;
          break;
        case 'details':
          this.shares[index].showDetail = true;
          this.shares[index].showMarket = false;
          this.shares[index].showShares = false;
          break;
      }
      return;
    }

    // show detail
    if (!this.shares[index].showMarket && !this.shares[index].showDetail) {
      this.shares[index].showMarket = false;
      this.shares[index].showDetail = true;
      this.shares[index].showShares = false;
      return;
    }
    // show market
    if (this.shares[index].showDetail) {
      this.shares[index].showDetail = false;
      this.shares[index].showMarket = true;
      this.shares[index].showShares = false;
      return;
    }
    // hide both
    this.shares[index].showDetail = false;
    this.shares[index].showMarket = false;
    this.shares[index].showShares = true;
    return;

  }


  async setDataStructures(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.userdata) {
        this.showWithdrawButton = this.userdata.BankingLoaded;

        this.money = this.userdata.Balance.Fiat ? this.userdata.Balance.Fiat : '0.00';
        this.native = this.userdata.Balance.Native ? this.userdata.Balance.Native : '0.00000000';
        const assetBalance = this.userdata.Balance.Asset ? this.userdata.Balance.Asset : '0';

        this.shares = this.setSharesBalances(assetBalance);

        this.userName = this.makeSalutation();

        this.changeRef.detectChanges();
        resolve(true);
      } else {

        this.userName = null;
        resolve(false);
      }
    });

  }

  async showWithdrawMoneyAlert() {
    let maxAvail = 0;
    if (this.money[0].Available !== 'undefined' && parseFloat(this.money[0].Available) != null) {
      try {
        maxAvail = parseFloat(this.money[0].Available);
      } catch (err) {
        console.log(err);
      }
    }

    if (!maxAvail || maxAvail < 15) {
      this.userService.setToast("The minimum withdrawal limit is R15.");
      return;
    }

    const alert = await this.alertController.create({
      header: 'Withdraw money',
      cssClass: 'custom-alert',
      message: 'Enter the amount that you would like to withdraw. (Withdrawal fee: R10)',
      mode: 'ios',
      backdropDismiss: true,
      inputs: [
        {
          name: 'Amount (R)',
          placeholder: "Max: " + (maxAvail - 15), /* Withdrawal charge = R10. R15 to add payout buffer */
          type: "number"
        }
      ],
      buttons: [{
        text: 'Close',
        role: 'cancel',
        handler: () => {
        }
      }, {
        text: 'Next',
        handler: async data => {
          const amount: string = data["Amount (R)"];
          this.showConfirmAlert(amount);
        }
      }]
    })
      .then(alertObj => {
        alertObj.present();
      });
  }

  async showConfirmAlert(amount: string) {
    await this.alertController.create({
      header: 'Confirm withdrawal',
      cssClass: 'custom-alert',
      message: 'You are about to withdraw R' + amount + '. Withdrawal fees of R15 will be deducated from the withdrawal amount.',
      mode: 'ios',
      backdropDismiss: true,
      buttons: [{
        text: 'Close',
        role: 'cancel',
        handler: () => { }
      },
      {
        text: 'Confirm',
        handler: () => {
          this.doWithdrawal(amount);
          console.log("Amount: " + amount);
        }
      }]
    })
      .then(alert => {
        alert.present();
      });
  }

  doWithdrawal(amount: string) {
    this.processWithdrawRequest(amount).then(
      success => {
        if (success) {
          this.userService.setToast("Your request has been logged. Money has been moved into your escrow wallet.");
          return;
        } else {
          this.userService.setToast("Your request could not be processed. Please contact Instavest (support@instavestcapital.com) for assistance.");
        }
      },
      error => {
        this.userService.setToast("Your request could not be processed. Please contact Instavest (support@instavestcapital.com) for assistance.");
      }
    );
  }

  processWithdrawRequest(amount: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.userService.processWithdrawRequest(amount, this.money[0].Currency).then(
        response => {
          if (response && response.success) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error => {
          reject(error);
        }
      );
    });
  }



  showAddBankAlert() {
    this.alertController.create({
      header: 'Add bank details',
      cssClass: 'custom-alert',
      message: 'Add your banking details to your profile to continue.',
      mode: 'ios',
      backdropDismiss: false,
      buttons: [{
        text: 'Close',
        role: 'cancel',
        handler: () => {
          console.log('Application exit prevented!');
        }
      }, {
        text: 'Add bank details',
        handler: () => {
          const navigationExtras: NavigationExtras = {
            state: {
              currentPage: 'banking',
            }
          };
          this.router.navigate(['account-settings'], navigationExtras);
        }
      }]
    })
      .then(alert => {
        alert.present();
      });
  }

  depositMoney() {
    this.router.navigate(['deposit-money']);
  }

  setSharesBalances(data: any): any[] {
    if (!data) {
      return null;
    }

    if (data && data.length > 0) {
      // add market item to JSON
      data.forEach((item: any, index: number) => {
        item.showShares = true;
        item.showMarket = false;
        item.showDetail = false;
      });
    }

    return data;
  }


  makeSalutation(): string {
    let un = this.userdata.general.FirstName;
    un = un ? un : '';

    let ln = this.userdata.general.LastName;
    ln = ln ? ln : '';

    let userName = un + ' ' + ln;

    if (userName.length === 0) {
      userName = 'Wealth Builder';
    }
    return userName;
  }

  getCountryName(countryCode: string): string {

    let str = '';

    switch (countryCode) {
      case 'ZAR': {
        str = 'South African Rand';
        break;
      }
      case 'FRX': {
        str = 'Frax Coin';
        break;
      }
    }

    return str;
  }

  getCountryCurrencyClass(countryCode: string): string {

    const str = 'flag-icon-background country-flag';

    switch (countryCode) {
      case 'ZAR': {
        this.ccclass = str + ' ' + 'flag-icon-za';
        break;
      }
      case 'FRX': {
        this.ccclass = str + ' ' + 'flag-icon-frx';
        break;
      }
    }

    return this.ccclass;
  }

  showActionSheet(name: string, index: number) {
    switch (name) {
      case 'sharesActions': {
        this.shareActions(index);
        break;
      }
      case 'moneyActions': {
        this.moneyActions(index);
        break;
      }

    }
  }

  async moneyActions(index: number) {
    let buttons = [
      {
        text: 'Deposit money',
        handler: () => {
          this.router.navigate(['deposit-money']);
          return;
        }
      },
      {
        text: 'View transactions',
        handler: () => {
          this.router.navigate(['wallet']);
          return;
        }
      },
      {
        text: 'Dismiss',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      }
    ];

    if (this.showWithdrawButton && this.checkValidBalance()) {
      buttons.push({
        text: 'Withdraw money',
        handler: () => {
          this.showWithdrawMoneyAlert();
          this.actionSheetCtrl.dismiss();
          return;
        }
      });

    }

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Money options',
      cssClass: 'action-sheet-bg',
      buttons
    });

    await actionSheet.present();
  }

  checkValidBalance(): boolean {
    if (!this.money || this.money.length < 1) {
      return false;
    }
    for (let item of this.money) {
      if (+item.Available > 15) {
        return true;
      }
    }
  }


  async shareActions(index: number) {

    console.log('This is index');
    console.log(index);

    const buttons = [
      {
        text: 'Open Market Place',
        handler: () => {
          this.openOTCMarket();
          return;
        }
      },
      {
        text: 'View share details',
        handler: () => {
          this.shareViewCarousel(index, 'details');
          return;
        }
      },
      {
        text: 'View market summary',
        handler: () => {
          this.shareViewCarousel(index, 'market');
          return;
        }
      },
      {
        text: 'Open company website',
        handler: () => {
          const url = this.shares[index].CompanyWebsite;
          this.launchExternalWebsite(url ? url : environment.values.websiteUrl);
        }
      },
      {
        text: 'Dismiss',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      }
    ];

    const sell_button = {
      text: 'Sell shares',
      handler: () => {
        this.createOTCSalesOrder(index);
        return;
      }
    };

    const lock_button = {
      text: 'Share Locked',
      role: 'cancel',
      icon: 'lock',
      handler: () => {
        this.userService.setToast("Trade on this share is currently locked.");
      }
    };

    // add conditional sell button
    if (!this.shares[index].Lock && this.shares[index].Available > 0) {
      buttons.splice(0, 0, sell_button);

    }
    // add conditional lock button
    if (this.shares[index].Lock && this.shares[index].Available > 1) {
      buttons.splice(0, 0, lock_button);
    }


    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Options',
      cssClass: 'action-sheet-bg',
      buttons
    });

    await actionSheet.present();
  }



  async createOTCSalesOrder(index: number) {

    const alert = await this.alertController.create({
      header: 'Sell shares',
      message: 'Enter a price per share and the number of shares you want to sell then select <i>Next</i> to continue.',
      cssClass: 'custom-alert',
      inputs: [
        {
          name: 'Price per share (R)',
          placeholder: 'Price per share ' + this.shares[index].share_value // asking price as opposed to last price
        },
        {
          name: 'Number of shares',
          placeholder: 'Num shares (Max: ' + parseInt(this.shares[index].Available) + ')' // the total number of shares currently left
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

            const price = this.manageInput(data['Price per share (R)'], false);
            if (price < 0) {
              price === -1 ? this.userService.setToast('You must provide a selling price') : this.userService.setToast('The selling price must be a positive natural number.');
              return;
            }

            const amount = this.manageInput(data['Number of shares'], true);
            if (amount < 0) {
              amount === -1 ? this.userService.setToast('You must provide an number of shares you would like to buy') : this.userService.setToast('The number of share must be a positive, whole number.');
              return;
            }

            this.doOTCAction({ action: 'newsellorder', price, amount, Asset: this.shares[index].Currency, data });
            return true;
          }
        }
      ]
    });

    await alert.present();
    return true;

  }



  manageInput(value: any, doFractionCheck) {
    console.log('value in: ' + value);

    if (!value) {
      console.log('Manage Input: Value doesn\'t exist - abort: ');
      console.log(value);
      return -1;
    }

    if (isNaN(Number(value))) {
      console.log('Not a number');
      console.log(value);
      return -2;
    }

    if (Number(value) < 0) {
      console.log('Negative number');
      console.log(value);
      return -3;
    }

    if (doFractionCheck) {
      if (!Number.isSafeInteger(Number(value))) {
        console.log('Not an integer');
        console.log(value);
        return -4;
      }
    }

    return Number(value);

  }

  checkNumber(number: string, canBeFloat?: boolean): boolean {

    if (isNaN(+number)) {
      return false;
    }

    if (!canBeFloat && +number % 1 !== 0) {
      console.log('float test');
      return false;
    }

    return true;
  }

  trimDecimalZeros(numberStr: string): string {
    if (!numberStr) {
      return "0";
    }

    const counter = 0;
    const maxConsecZeros = 2;
    const parts = numberStr.split('.');

    if (!parts || parts.length < 2) {
      return numberStr;
    }

    if (parts[1]) {
      if (parts[1].length === 0) {
        return numberStr;
      }
    }

    const intPartArr = parts[0].split("");
    const decPartArr = parts[1].split("");

    let newDecPart = "";
    let i = decPartArr.length - 1;

    for (i; i >= 0; i--) {
      if (decPartArr[i] === '0') {
        newDecPart = parts[1].substr(0, i);
      } else {
        // break out of loop
        i = 0;
      }
    }

    return newDecPart.length > 0 ? (parts[0] + "." + newDecPart) : parts[0];
  }

  async doOTCAction(data: { 'action': string, 'price': number, 'amount': number, 'Asset'?: string, data?: any }) {

    let message = '';

    switch (data.action) {
      case 'newsellorder':
        const udata: { 'price': number, 'amount': number, 'Asset': string } = { price: data.price, amount: data.amount, Asset: data.Asset };
        message = '';
        const currentuid = '';

        this.completeOTCAction(data.action, message, currentuid, data).then(async (result) => {
          if (result == null) {
            this.userService.exitToLoginPage();
          }

          if (!result) {
            this.userService.setToast('We unable to create this sales order. Please try again or contact Instavest support for assistance.');
            return;
          }

          this.userService.setToast("Your sell order has been created and the sale shares has been moved to your escrow wallet.");
          await this.updatePortfolioCard();

        }, () => {
          this.userService.setToast('We could not connect to the Instavest servers. Please try again or contact Instavest support for assistance.');
          return;
        });

        break;
    }
  }

  async completeOTCAction(action: string, message: string, uid: string, udata?: { 'price': number, 'amount'?: number, 'Asset'?: string }): Promise<any> {


    return new Promise(async (resolve, reject) => {

      return await this.userService.doOTCRequest(action, uid, udata).then((response) => {
        this.userService.dismissPopup();

        if (response == null) {
          resolve(null);
          return;
        }

        if (!response) {
          resolve(false);
          return;
        }

        resolve(response);


      }, (response: any) => {
        reject(null);
        return;
      });

    });


  }

  toggleShowMarket(index: number) {
    if (this.shares[index].showDetail) { this.shares[index].showDetail = false; }
    this.shares[index].showMarket = !this.shares[index].showMarket;

  }

  toggleShowDetail(index: number) {
    if (this.shares[index].showMarket) { this.shares[index].showMarket = false; }
    this.shares[index].showDetail = !this.shares[index].showDetail;
  }

  openOTCMarket() {
    this.router.navigate(['market']);
    return;
  }

  launchExternalWebsite(url: string) {
    if (url) {
      const options: OpenOptions = { url, presentationStyle: 'popover', windowName: 'Instavest' };
      const browser = Browser.open(options);
    }
    return;
  }

  async updatePortfolioCard() {
    this.refreshBalances();
  }

  convertDate(dateStr) {
    return Date.parse(dateStr);
  }


  public formatNum(num: number): number {

    if (!num) {
      return 0;
    }

    if (typeof num === 'number') {
      return num;
    }

    if (typeof num === 'string') {
      return parseInt(num, 10);
    }
    else { return 0; }
  }

  // opens the selected current investment detail page
  showDetailPage(pageId: string): void {
    if (!pageId) { return; }

    this.router.navigate(['investment-detail-' + pageId]);
    return;
  }

  // ensuring the spinner doesn't show after forced eject
  ionViewDidLoad() {
    this.userService.dismissPopup();
  }

  showHelp() {
    this.openModal();
  }


  async openModal() {
    let helpScreen: any = null;
    let helpText = null;
    this.currentPage = 'home';
    console.log('currentPge', this.currentPage);
  }

}
