import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, IonInfiniteScroll, LoadingController, MenuController, ModalController, IonList } from '@ionic/angular';
import { UserService } from '../providers/user.service';
import { NegotiationPopupPage } from '../negotiation-popup/negotiation-popup.page';
import { Browser, OpenOptions } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { VaultService } from '../providers/vault.service';
import { environment } from 'src/environments/environment';


type MarketListItem = { Asset: string, CompanyName: string, Name: string, Count: string };
type ResponseDataObject = { open: string, closed: string, total: string };
type OffersObject = { id: string, price: string, amount: string, total: string, fee: string, userid: string, status: string, pair: string, TimeStamp: string, uid: string, ModifyDate: string, lastselleroffer: string, lastbuyeroffer: string, Counter: [CounterObject] };


type CounterObject = { Price: string, BS: string, TimeStamp: string, uid: string };
type SellorderObject = { id: string, price: string, amount: string, total: string, left: string, sold: string, userid: string, status: string, pair: string, TimeStamp: string, uid: string, Name: string, LegalId: string, lastprice: string, currency: string, asset: string, currencySymbol: string, CompanyName: string, CompanyWebsite: string, state: string, ResponseCount: ResponseDataObject, Prospectus: string, bestbuyeroffer: string, offers: [OffersObject], Counter?: [CounterObject], responseDataLoaded?: boolean, showResponses?: boolean, showDetail?: boolean, showForm?: boolean, hide?: boolean, myso?: boolean, openoffer?: boolean };
type PurchaseOfferObject = { id: string, CompanyName: string, Name: string, price: string, amount: string, total: string, left: string, userid: string, status: string, pair: string, TimeStamp: string, uid: string, currency: string, asset: string, currencySymbol: string, Selluid: string, state: string, Counter: [CounterObject], offers?: [OffersObject] };
type TradeData = Array<{ TimeStamp: string, Volume: string, Value: string }>;

type MyTradeData = Array<{ pair: string, data: Array<PurchaseOfferObject> | Array<SellorderObject> }>;

type Pagination = { listsellorders: { step: number, limit: number }, listallmysellorders: { step: number, limit: number }, listmyofferstopurchase: { step: number, limit: number } }

@Component({
  selector: 'app-market',
  templateUrl: './market.page.html',
  styleUrls: ['./market.page.scss'],
})
export class MarketPage {

  // new vars

  pagination: Pagination;
  selectedTab = 'sellers'; // tabItem selector
  view = 'all-spvs';
  showSpinner = false;
  userdata = null;
  counterOfferAmount: number;
  subview = 'nooffers';
  showMySellordersList = true;
  offersOnSellorderList: Array<OffersObject> = null;
  sellorderIndex = 0;
  loadingMyOffersToPurchaseList = false;
  showNavHint = true;

  // initial SPV list
  marketListData: Array<MarketListItem>;
  allMySellOrderData: MyTradeData;
  allMyPurchaseOrderData: MyTradeData;

  // old vars
  currentPage = 'marketlist'; // marketlist, market, ...
  activeTab = 'activeTab';
  inactiveTab = 'inactiveTab';

  legalId: number;
  initial: 'InitialPage';
  firstEntry = true;

  myMemberID: string;
  showMyTrades: boolean;

  include = "all";

  intervalId: number;
  showLoader = true;

  currentAsset: string;
  currentSPVName: string;
  currentIndex: number;
  currentOTCItemUID: string;
  currentOfferUID: string;

  actionSheet: any;
  otcNegotiationPage: any;
  showOffersFromBuyers: boolean;


  tradeData: TradeData;
  numOffersReceived = 0;



  // my open purchase offers list
  myOffersToPurchaseList: Array<PurchaseOfferObject>;

  // my open sell orders list
  allMySellOrdersList: Array<SellorderObject>;

  // working arrays
  allSellOrderData: Array<SellorderObject>;
  origSellOrderData: Array<SellorderObject>;
  offersFromBuyersData: Array<OffersObject>;

  walletBalances: {
    "currency_symbol": 'R',
    "available_balance": 0
  };

  constructor(
    public actionSheetCtrl: ActionSheetController,
    public menuCtrl: MenuController,
    public user: UserService,
    public router: Router,
    public changeDetector: ChangeDetectorRef,
    public modalCtrl: ModalController,
    public alertController: AlertController,
    private vaultService: VaultService
  ) {
    this.resetPagination();
    this.primeDataObjects();
    this.showMyTrades = this.initShowMyTrades();
  }

  // new functions

  toggleSellerOrdersList() {
    this.showMySellordersList = !this.showMySellordersList;
  }

  // returns a list of all my open offers to purchase with responses
  async fetchMyOffersToPurchase(): Promise<any> {

    return new Promise((resolve, reject) => {

      this.loadMarketList("listmyofferstopurchase").then(async (data) => {

        if (data == null || !data) {
          this.user.exitToLoginPage();
          resolve(null);
        }

        if (data && !data.success && data.message) {
          this.user.setToast(data.message);
          resolve(false);

        }

        // TODO: ADD END OF DATA LIST CHECK

        if (data.data) {
          this.allMyPurchaseOrderData = data.data; // this is the main purchase order data array
          if (this.allMyPurchaseOrderData && this.allMyPurchaseOrderData.length > 0 && this.allMyPurchaseOrderData[0].data.length > 0) {
            this.setSubView("gotoffers");
          }
          resolve(true);
        }

      });

    });
  }

  // initialises all market data, loading data for all tabs
  async initMarket() {
    // this.user.createLoadingPopup("Loading market...", true);
    this.primeAllSellOrdersData();

    // Market List
    await this.fetchSPVList();

    // Loading My Trades
    this.loadMyTradeData();
    return;
  }

  async loadMyTradeData() {
    this.loadingMyOffersToPurchaseList = true;
    await this.fetchMySellOrders();
    await this.fetchMyOffersToPurchase();
    await this.countOffersReceived();
    this.loadingMyOffersToPurchaseList = false;
  }

  async matchMyOtpToOpenSo() {
    console.log("Matching OTP to Open SO");
    if (this.myOffersToPurchaseList && this.myOffersToPurchaseList.length > 0) {
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < this.myOffersToPurchaseList.length; i++) {
        console.log("checking " + this.myOffersToPurchaseList[i].Selluid);

        for (let j = 0; j < this.allSellOrderData.length; j++) {
          console.log("matching " + this.allSellOrderData[j].uid);
          if (this.myOffersToPurchaseList[i].Selluid === this.allSellOrderData[j].uid) {
            console.log("---- MATCHED");
            this.allSellOrderData[j].openoffer = true;
            j = this.allSellOrderData.length; // break out of loop
          }
        }
      }
    }
    return;
  }


  getBuyerOfferString(index1: number, index2: number, side: string) {

    let str = null;

    if (this.allMyPurchaseOrderData[index1].data[index2].Counter.length === 1) {
      str = "R " + this.allMyPurchaseOrderData[index1].data[index2].Counter[0].Price;
    }

    // last offer in array from buyer - return buyer last price
    if (!str && this.allMyPurchaseOrderData[index1].data[index2].Counter[this.allMyPurchaseOrderData[index1].data[index2].Counter.length - 1].BS === 'B' && this.allMyPurchaseOrderData[index1].data[index2].Counter.length > 0) {
      str = "R " + this.allMyPurchaseOrderData[index1].data[index2].Counter[this.allMyPurchaseOrderData[index1].data[index2].Counter.length - 1].Price;
    }

    // last offer in array was counter offer by seller, return offer before this item 
    // each of buyer and seller alternate offers, one party cannot counter before the other has responded
    if (!str && this.allMyPurchaseOrderData[index1].data[index2].Counter[this.allMyPurchaseOrderData[index1].data[index2].Counter.length - 1].BS === 'S' && this.allMyPurchaseOrderData[index1].data[index2].Counter.length > 1) {
      str = "R " + this.allMyPurchaseOrderData[index1].data[index2].Counter[this.allMyPurchaseOrderData[index1].data[index2].Counter.length - 2].Price;
    }

    // if all else fails return initial offer
    if (!str) {
      str = "R " + this.allMyPurchaseOrderData[index1].data[index2].Counter[0].Price;
    }

    return this.trimDecimalZeros(str);
  }

  getSellerCounterString(index1, index2, side) {

    let str = null;
    // last offer in array was counter offer by seller, return offer before this item 
    // each of buyer and seller alternate offers, one party cannot counter before the other has responded
    if (this.allMyPurchaseOrderData[index1].data[index2].Counter[0].BS === 'S') {
      str = "R " + this.allMyPurchaseOrderData[index1].data[index2].Counter[0].Price;
    }

    return this.trimDecimalZeros(str);

  }

  /* shows offers received on specific sell order */
  showSellItemOffers(itemuid: string, userid: string, index1: number, index2: number,) {
    this.sellorderIndex = index2; // index of the sell order on which offers were made
    this.offersOnSellorderList = this.allMySellOrderData[index1].data[index2].offers;
    this.currentSPVName = this.allMySellOrderData[index1].data[index2].Name;

    this.subview = "showoffersonsellorder";
    // this.subview = "gotoffers";
    return;
  }

  // formats the offers made by buyers on a specific sell order
  formatDecimalNumber(numbr: string, side: string) {

    let str = numbr;
    // last offer in array was counter offer by seller, return offer before this item 
    // each of buyer and seller alternate offers, one party cannot counter before the other has responded
    if (!str) {
      return side === "left" ? "-" : '';
    }

    str = "R " + numbr;

    return this.trimDecimalZeros(str);
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
      if (parts[1].length === 2) {
        return numberStr;
      }
      if (parts[1].length === 1) {
        return numberStr + "0";
      }
      if (parts[1].length === 0) {
        return "00";
      }
    }

    const intPartArr = parts[0].split("");
    const decPartArr = parts[1].split("");

    let newDecPart = "";
    let i = decPartArr.length - 1;

    for (i; i > 2; i--) {
      if (decPartArr[i] === '0') {
        newDecPart = parts[1].substr(0, i);
        console.log(newDecPart);
      } else {
        // break out of loop
        i = 0;
      }
    }

    return parts[0] + "." + newDecPart;
  }


  async addUIFields(data: any) {

    const dataset = data;

    if (dataset) {
      // add market item to JSON
      await dataset.forEach((item: any) => {
        item.showForm = false;
        item.showDetail = false;
        item.showResponses = false;
        item.responseDataLoaded = false;
        item.hide = false;
      });
      this.allSellOrderData = await dataset;
    }

    return;
  }


  async loadMarketData(asset: string, type: string) {

    if (type === 'allsellorders') {
      this.loadSPVSellOrders(asset, "all").then(async () => {
        // slow process alert - run outside of critical path
        await this.matchMyOtpToOpenSo(); // updates the offered flag in allSellOrderData{}
        this.changeDetector.detectChanges();
      });
    }

    if (type === 'ownsellorders') {
      return await this.loadSPVSellOrders(asset, "own");
    }

    if (type === 'othersellorders') {
      return await this.loadSPVSellOrders(asset, "others");
    }

    if (type === 'myoffersreceived') {
      return await this.loadMyOffersReceived(asset, 0, 15, null);
    }

  }


  async loadAllSellOrdersData(asset: string, dir?: string, event?: any) {

    this.currentAsset = asset;

    if (dir && (dir === "bwd")) {
      this.pagination.listsellorders.step--;
    } else { this.pagination.listsellorders.step++; }

    if (this.pagination.listsellorders.step < 0) {
      this.pagination.listsellorders.step = 0;
    }

    await this.loadMarketData(this.currentAsset, "allsellorders");

    return;
  }

  async showCounterForm(uid: string, userid: string, index: number) {

    this.currentIndex = index;
    this.currentOTCItemUID = uid;

    console.log("index: " + this.currentIndex);


    const alert = await this.alertController.create({
      header: 'Create counter offer',
      cssClass: 'custom-alert',
      subHeader: '',
      message: 'Enter the new price per share in the line below and then select <i>Next</i> to continue.',
      inputs: [
        {
          name: 'Price per share',
          placeholder: "Offered: " + this.offersOnSellorderList[index].lastbuyeroffer
        },
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
            let offerPrice = data['Price per share'];
            if (!offerPrice) {
              this.user.setToast('Counter offer price cannot be empty');
              return;
            }
            console.log("this.currentIndex: " + this.currentIndex);
            offerPrice = this.formatPrice(offerPrice, index);
            const offerAmount = this.formatNum(this.offersOnSellorderList[index].amount); // number of shares is fixed in counter offer
            this.doOTCAction({ action: 'counteroffer', price: offerPrice, amount: offerAmount });

          }
        }
      ]
    });

    await alert.present();

  }

  async showBuyerCounterForm(uid: string, index1: number, index2: number) {

    this.currentIndex = index2;
    this.currentOTCItemUID = uid;

    console.log("this.allMyPurchaseOrderData[index]");
    console.log("This......");
    console.log(this.allMyPurchaseOrderData[index1].data[index2]);
    console.log("DONE");

    console.log("index: " + this.currentIndex);

    const alert = await this.alertController.create({
      header: 'Create counter offer',
      cssClass: 'custom-alert',
      subHeader: '',
      message: 'Enter the new price per share in the line below and then select <i>Next</i> to continue.',
      inputs: [
        {
          name: 'Price per share',
          placeholder: "Offered: " + this.allMyPurchaseOrderData[index1].data[index2].Counter[0].Price
        },
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
            let offerPrice = data['Price per share'];
            if (!offerPrice) {
              this.user.setToast('Counter offer price cannot be empty');
              return;
            }
            console.log("this.currentIndex: " + this.currentIndex);
            offerPrice = this.formatPrice(offerPrice, index2);
            const offerAmount = this.formatNum(this.allMyPurchaseOrderData[index1].data[index2].Counter[0].Price); // number of shares is fixed in counter offer
            this.doOTCAction({ action: 'counteroffer', price: offerPrice, amount: offerAmount });

          }
        }
      ]
    });

    await alert.present();

  }

  async showBuyerAcceptForm(uid: string, userid: string, index: number) {

    this.currentIndex = index;
    this.currentOTCItemUID = uid;

    const alert = await this.alertController.create({
      header: 'Buying shares',
      cssClass: 'custom-alert',
      subHeader: '',
      message: 'You are about to confirm this transaction. This action cannot be undone. Press <i>Next</i> to continue.',
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
            this.doOTCAction({ action: 'acceptbid', price: 0, amount: 0 });
          }
        }
      ]
    });

    await alert.present();

  }

  formatPrice(num: string, index: number) {
    if (isNaN(Number(num))) { return null; }

    return Number(num);
  }


  togglePageTab(tab: string) {
    if (tab === 'market') { // market tab selected
      this.resetPagination();
      this.selectedTab = 'sellers';
      this.view = 'all-spvs';
      return;
    }

    // trades tab selected
    this.selectedTab = 'mytrades';
    this.view = 'mytrades';
    this.toggleNavHint();
  }

  toggleNavHint() {
    if (this.showNavHint) { // switches off the navhint for the rest of this market session.
      setTimeout(() => {
        this.showNavHint = false;
        return;
      }, 5000);
    }
  }

  setSubView(view: string) {
    this.subview = view;
    return;
  }

  getCompanyName(symbol: string) {
    for (let i = 0; i < this.marketListData.length; i++) {
      if (this.marketListData[i].Asset === symbol) {
        return this.marketListData[i].CompanyName;
      }
    }
  }



  ionViewWillEnter() {
    this.menuCtrl.enable(true, 'menu');
    this.initUserData();
  }

  //Should be managed with a service
  async initUserData() {
    await this.getUserInfo(this.vaultService.sessionState.session).then(async (userdata) => {
      if (await userdata) {
        this.userdata = userdata;
        this.setWalletBalances();
        await this.initMarket();
      } else { // no data received
        this.user.exitToLoginPage();
      }
    });
  }

  // list all sell order data for the given asset holder SPV
  async loadSPVSellOrders(asset: string, include: string): Promise<any> {

    this.currentAsset = asset;

    return new Promise((resolve, reject) => {

      this.loadSellOrderData("listallsellorders", asset, this.pagination.listsellorders.step, this.pagination.listsellorders.limit, include)
        .then((data) => {
          if (data && data.data) {
            this.origSellOrderData = data.data; // might not need this a
            this.currentSPVName = data.data[0].Name;
            this.addUIFields(data.data).then(async (response) => {
              console.log("this.allSellOrderData:");
              console.log(this.allSellOrderData);
              // keeping a duplicate because we add JSON elements to the allSellOrderData array making it impossible to share items with TradeWiz
              this.view = "allsellorders";
              // resolve(data.data);
              resolve(true);
              return;
            });// adds UI show/hide fields to each item


          } else if (data && !data.success && data.message) {
            const msg: string = data.message;

            this.router.navigate(['auth']);
            const message = "You were inactive for too long. Please log in again.";
            this.user.setToast(message);

            resolve(null);
            return;

          } else {

            const message = "You have reached the end of the share classifieds list.";
            this.user.setToast(message);

            resolve(false);
            return;

          }

        });

    });
  }

  // gets userdata for auto login if session is still valid
  async getUserInfo(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.user.getUserInfo(token).then((response: any) => {
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

  getBackgroundColor(idx: number) {
    return (idx % 2 !== 0) ? { background: "#356081" } : { background: "#255479" };
  }

  // opens a specific seller item for negotiation. buyOfferId is the buyer offer item id on a particular share sales offer
  async openSellerOfferItem(index: number) {
    this.currentOTCItemUID = this.allSellOrderData[index].offers[0].uid;
    this.currentIndex = index;
    this.currentOfferUID = this.allSellOrderData[index].uid;

    console.log("sellOfferId (item UID)=" + this.currentOfferUID);
    console.log(this.allSellOrderData);
    console.log(this.allSellOrderData[index].offers);

    let lastbid = this.allSellOrderData[index].offers[0].price;

    if (this.allSellOrderData[index].offers[0].Counter && this.allSellOrderData[index].offers[0].Counter[0].Price) {
      lastbid = this.allSellOrderData[index].offers[0].Counter[0].Price;
    }

    const lastitem = this.allSellOrderData[index].offers.length - 1;

    const data = {
      Name: this.allSellOrderData[index].Name,
      price: lastbid,
      amount: this.allSellOrderData[index].offers[0].amount,
      lastbidder: this.allSellOrderData[index].offers[0].Counter[0].BS,
      left: this.allSellOrderData[index].left,
      originalprice: this.allSellOrderData[index].price,
      totalforsale: this.allSellOrderData[index].amount,
      lastprice: this.allSellOrderData[index].lastprice,
      history: this.allSellOrderData[index].offers,
      Counter: this.allSellOrderData[index].offers[0].Counter,
      whoami: "B"
    };
  }

  primeAllSellOrdersData() {

    this.showOffersFromBuyers = null;

    this.marketListData = [];

    this.allSellOrderData = [{
      id: "0", price: "0.00", amount: "0", total: "0.00", left: "0", sold: "0", userid: "0", status: "O",
      pair: "", TimeStamp: "2020-01-01 00:00:01", uid: "0", Name: "", LegalId: "0", lastprice: "0.00", currency: "ZAR", asset: "",
      currencySymbol: "", CompanyName: "", CompanyWebsite: "", state: "", Prospectus: null, ResponseCount: { open: "0", closed: "0", total: "0" },
      bestbuyeroffer: "",
      offers: [{
        id: "", price: "", amount: "", total: "", fee: "", userid: "", status: "", pair: "", TimeStamp: "", uid: "", ModifyDate: "", lastselleroffer: "", lastbuyeroffer: "",
        Counter: [{ Price: "", BS: "", TimeStamp: "", uid: "" }]
      }], responseDataLoaded: false, showResponses: false, showDetail: false, showForm: false, hide: false, myso: false, openoffer: false
    }];

    this.resetOffersFromBuyersData();

  }

  // seller withdrawing own sales order
  async createOTCOfferBuyOffer(uid: string, index: number) {

    this.currentOTCItemUID = uid;
    this.currentIndex = index;
    this.currentAsset = this.allSellOrderData[index].pair;

    console.log("this is selected item index: " + index);

    const alert = await this.alertController.create({
      header: 'Purchase offer',
      cssClass: 'custom-alert',
      message: 'Enter the price per share and the number of shares that you would like to buy below then select <i>Next</i> to continue.',
      inputs: [
        {
          name: 'Price per share (R)',
          placeholder: "Price ex: " + this.allSellOrderData[index].price, //asking price as opposed to last price,
          type: "number"
        },
        {
          name: 'Number of shares',
          placeholder: "Total shares ex: " + this.allSellOrderData[index].left //the total number of shares currently left
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

            const p: any = data["Price per share (R)"];

            const a: any = data["Number of shares"];

            let validation: { response: boolean, message: string } = this.validateOfferPrice(index, p);
            if (!validation.response) {
              this.user.setToast(validation.message);
              return;
            }

            validation = this.validateOfferAmount(index, a);
            if (!validation.response) {
              this.user.setToast(validation.message);
              return;
            }

            this.doOTCAction({ action: "newoffertopurchase", price: p, amount: a, data });
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  validateOfferPrice(index: number, offerPrice: string): { response: boolean, message: string } {
    const ask = +this.allSellOrderData[index].price;
    const offer = +offerPrice;

    if (ask < offer) {
      return { response: false, message: "Make an offer that is lower or equal to the asking price." };
    }

    return { response: true, message: null };
  }

  validateOfferAmount(index: number, offerAmount: string): { response: boolean, message: string } {
    const ask = +this.allSellOrderData[index].amount;
    const offer = +offerAmount;

    if (ask < offer) {
      return { response: false, message: "The most you can buy is " + ask + " shares." };
    }

    return { response: true, message: null };
  }

  convertDate(dateStr) {
    return Date.parse(dateStr);
  }

  // Called from HTML to load SPV specific sell orders
  async fetchAllData(asset: string) {
    await this.loadAllSellOrdersData(asset);
    return;
  }


  // buyer buying shares at the price specified
  async createOTCBuyDirectOffer(uid: string, index: number) {

    this.currentOTCItemUID = uid;

    this.currentIndex = index;

    // let sellprice: number = this.getSellPrice(index);
    const sellprice: number = this.getSellPrice(this.allSellOrderData[index].price);

    const alert = await this.alertController.create({
      header: 'Buy shares',
      cssClass: 'custom-alert',
      message: 'You are buying ' + this.allSellOrderData[index].Name + ' at R' + sellprice.toFixed(2) + ' a share. Enter the number of shares you want and press <i>Next</i> to continue.',
      inputs: [
        {
          name: 'Number of shares',
          placeholder: "Max available: " + this.allSellOrderData[index].left // the total number of shares currently left
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
            this.doOTCAction({ action: "buysellersask", price: sellprice, amount: data["Number of shares"], data });
            return true;
          }
        }
      ]
    });

    await alert.present();
  }



  //****************************  old functions *************************/


  /*
    // finds the first instance of buyer/seller ('B' or 'S') and returns that price. (The array received is ordered last received price first)
    getLastAskingPrice(buyerSeller: string, counterArray: Array<CounterObject>, defaultPrice: number): number {
      if (!counterArray) { return defaultPrice; }
  
      let price = 0;
  
      if (counterArray && counterArray.length > 0) {
        for (let i = 0; i < counterArray.length; i++) {
          if (counterArray[i].BS === buyerSeller) {
            // console.log("found " + buyerSeller + "'s price = " + counterArray[i].Price);
            price = +counterArray[i].Price;
            i = counterArray.length;
          }
        }
      }
  
      return price;
    }
  */

  // seller withdrawing own sales order
  async confirmCancelMySalesOrder(uid: string, index: number) {

    this.currentOTCItemUID = uid;

    const alert = await this.alertController.create({
      header: 'Cancel sales order',
      cssClass: 'custom-alert',
      message: 'You are about to cancel your sales order and withdraw it from the market. Select <i>Next</i> to continue.',
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
            this.doOTCAction({ action: "cancelsellorder", price: 0, amount: 0 });
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // seller withdrawing a purchase order
  async confirmCancelMyOffer(uid: string, asset: string) {

    this.currentOTCItemUID = uid;
    this.currentAsset = asset;

    const alert = await this.alertController.create({
      header: 'Cancel offer',
      cssClass: 'custom-alert',
      message: 'You are about to cancel your offer and withdraw from this negotiation. Select <i>Next</i> to complete this action.',
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
            this.doOTCAction({ action: "cancelbid", price: 0, amount: 0 });
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  getBuyerLastOffer(index) {
    return this.allSellOrderData[this.currentIndex].offers[index].lastbuyeroffer;
  }


  async confirmSellerAcceptBuyerOffer(index, uid) {
    // buyer buying shares at the price specified

    this.currentOfferUID = uid;

    const sellprice: number = parseFloat(this.getBuyerLastOffer(index));

    let fees = parseFloat(this.allSellOrderData[this.currentIndex].offers[index].total) * 0.025;
    if (fees > 50) {
      fees = 50;
    }

    const feesStr = fees.toFixed(2);

    // ADD TOTAL
    const alert = await this.alertController.create({
      header: 'Selling shares',
      cssClass: 'custom-alert',
      message: 'You are selling ' + this.allSellOrderData[this.currentIndex].offers[index].amount + ' '
        + this.allSellOrderData[this.currentIndex].Name + ' shares at R' + sellprice.toFixed(2)
        + ' a share for a total of R' + this.allSellOrderData[this.currentIndex].offers[index].total + '. Total transaction fees: R' + feesStr + 'Select <i>Next</i> to continue.',

      buttons: [
        {
          text: 'Close',
          handler: data => {
            return true;
          }
        },
        {
          text: 'Sell now!',
          handler: () => {
            const data = {
              price: +this.allSellOrderData[this.currentIndex].offers[index].price,
              amount: +this.allSellOrderData[this.currentIndex].offers[index].amount,
              Asset: this.currentAsset
            };
            this.doOTCAction({ action: "acceptbid", price: 0, amount: 0, data });
            return true;
          }
        }
      ]
    });

    await alert.present();

  }



  // returns null if price is not a number
  getSellPrice(price: string): number {
    if (isNaN(+price)) {
      return null;
    }

    const sellprice: number = parseFloat(price);

    return Number(sellprice);
  }


  async listActionSheet(index: number, asset) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Options',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'View share adverts',
          handler: () => {
            this.loadSPVSellOrders(asset, this.include);
          }
        },
        {
          text: 'View company',
          handler: () => {
            const url = this.allSellOrderData[index] !== undefined ? this.allSellOrderData[index].CompanyWebsite : environment.values.websiteUrl;
            this.launchExternalWebsite(url);
            console.log('view company clicked');
          }
        },
        {
          text: 'Dismiss',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        }
      ]
    });

    await actionSheet.present();
  }

  getOriginalPrice() {
    return this.allSellOrderData[this.currentIndex].price;
  }


  async presentNewBuyerActionSheet(uid: string, index: number) {

    if (this.actionSheet) { await this.actionSheet.dismiss(); }

    this.actionSheet = await this.actionSheetCtrl.create({
      header: 'Options',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Buy (R ' + parseFloat(this.getOriginalPrice()).toFixed(2) + "/share)",
          role: 'destructive',
          handler: () => {
            try {
              this.actionSheet.dismiss();
            } catch (error) { }

            this.createOTCBuyDirectOffer(uid, index);

            return false;
          }
        },
        {
          text: 'Make offer',
          handler: () => {
            try {
              this.actionSheet.dismiss();
            } catch (error) { }

            this.createOTCOfferBuyOffer(uid, index);
          }
        },
        {
          text: 'View company',
          handler: () => {
            const url = this.allSellOrderData[index].CompanyWebsite;
            this.launchExternalWebsite(url);
            console.log('view company clicked');
          }
        },
        {
          text: 'Dismiss',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        }
      ]
    });

    await this.actionSheet.present();
  }

  getSellerLastPrice(index) {
    const price = this.allSellOrderData[index].price;
    if (this.allSellOrderData[index].offers && this.allSellOrderData[index].offers.length > 0) {
      if (this.allSellOrderData[index].offers[0].lastselleroffer) {
        return this.allSellOrderData[index].offers[0].lastselleroffer;
      }
    }
    return price;
  }


  initShowMyTrades(): boolean {
    const show = Preferences.get({ key: 'showMyTrades' });
    if (typeof show === 'undefined' || show == null) {
      return false; // if not set then hide own trades
    }

    return true;
  }

  toggleShowOffersList(index: number) {
    // NO LONGER IN USE I THINK
    if (index === null) {
      this.allSellOrderData[index].responseDataLoaded = false;
      this.allSellOrderData[index].showResponses = false;
      return;
    }
  }

  hideOfferFromBuyers() {
    this.updateData();
    this.showOffersFromBuyers = false;

  }


  openTab(tabname: string) {
    this.currentPage = tabname;
    return;
  }

  launchExternalWebsite(url: string) {

    if (url) {
      const options: OpenOptions = { url, presentationStyle: 'popover', windowName: 'Instavest' };
      Browser.open(options);

    }

    return;
  }

  primeDataObjects() {
    this.primeAllSellOrdersData();
  }



  makeLabelArray() {
    const labels = new Array();
    let date = null;

    this.tradeData.forEach(element => {
      if (+element.Value > 0 || +element.Value > 0) {
        date = new Date(element.TimeStamp);
        labels.push(date.getDate() + "/" + date.getMonth());
      }
    });
    console.log(labels);
    return labels;
  }

  makeVolumeArray() {
    const labels = new Array();
    this.tradeData.forEach(element => {
      if (+element.Volume > 0) {
        labels.push(+element.Volume * 10);
      }
    });
    console.log(labels);
    return labels;
  }

  makeValueArray() {
    const labels = new Array();
    this.tradeData.forEach(element => {
      if (+element.Value > 0) {
        labels.push(element.Value);
      }
    });
    console.log(labels);
    return labels;
  }

  resetOffersFromBuyersData() {
    this.offersFromBuyersData = [{ id: "", price: "", amount: "", total: "", fee: "", userid: "", status: "", pair: "", TimeStamp: "", uid: "", ModifyDate: "", lastselleroffer: "", lastbuyeroffer: "", Counter: [{ Price: "", BS: "", TimeStamp: "", uid: "" }] }];
    return;
  }

  async fetchSummaryData(showLoader?: boolean) {

    if (this.firstEntry) {
      this.firstEntry = false;

      setTimeout(() => {
      }, 1000 * 2);
    }

    return;
  }



  resetPagination() {
    this.pagination = {
      listsellorders: {
        step: -1,
        limit: 15
      },
      listallmysellorders: {
        step: -1,
        limit: 15
      },
      listmyofferstopurchase: {
        step: -1,
        limit: 15
      }
    };
  }



  async pollData() {
    const data = await this.updateData();
    return;
  }

  // returns a list of all my open sell orders with bids
  async fetchMySellOrders(): Promise<any> {

    return new Promise((resolve, reject) => {

      this.loadMarketList("listallmysellorders").then(async (data) => {

        if (data == null || !data) {
          this.user.exitToLoginPage();
          resolve(null);
        }

        if (data && !data.success && data.message) {
          this.user.setToast(data.message);
          resolve(false);

        }

        // TODO: ADD END OF DATA LIST CHECK

        if (data.data) {
          this.allMySellOrderData = data.data; // This is the main sellorderdata array (pair: string, data: array)
          if (this.allMySellOrderData && this.allMySellOrderData.length > 0 && this.allMySellOrderData[0].data.length > 0) {
            this.setSubView("gotoffers");
          }
          resolve(true);
        }

      });

    });
  }



  countOffersReceived() {
    if (!this.allMySellOrderData || this.allMySellOrderData.length === 0) {
      this.numOffersReceived = 0;
      return;
    }
    this.allMySellOrderData.forEach((soArrayElement) => {
      soArrayElement.data.forEach((element) => {
        if (element.offers && element.offers.length > 0) {
          this.numOffersReceived += element.offers.length;
        }
      });
    });
    console.log("NumOffersReceived = " + this.numOffersReceived);
  }

  // Fetches SPV List for first page
  async fetchSPVList(): Promise<any> {

    this.view = null;
    this.showSpinner = true;

    return new Promise((resolve, reject) => {

      this.loadMarketList("listallsellorderssummary").then(async (data) => {

        this.showSpinner = false;

        if (data == null || !data) {
          this.user.exitToLoginPage();
          resolve(null);
        }

        if (data && !data.success && data.message) {
          this.user.setToast(data.message);
          resolve(false);

        }

        // TODO: ADD END OF DATA LIST CHECK

        if (data.data) {
          this.marketListData = data.data;
          this.view = "all-spvs";
          resolve(true);
        }
      });

    });

  }


  // set @asset:string to null for all offers received over all assets
  async loadMyOffersReceived(asset: string, step: number, limit: number, include: string) {

    if (step < 0) {
      step = 0;
    }

    this.user.getSellOrderData("listallmysellorders", asset, step, limit, include).then(async (response) => {
      console.log("list all my sellorders response");
      console.log(response);

      try {
        this.user.dismissLoadingPopup();
      } catch (error) {
        console.log(error.message);
      }

      if (!response) {
        console.log("failed to retrieve market data");
        return;
      }

      if (response && !response.success && response.code === '1000') {
        this.user.exitToLoginPage();
        return;
      }

      if (response) {
        this.myMemberID = this.userdata.general.Id; // set member ID
        return response;

      }
      return false;

    }, (result: any) => {

      this.user.dismissLoadingPopup();
      this.user.setToast("A network error occurred. Please try again or contact AZUZA support if the problem persists.");
      return;
    });

  }


  async updateBalances() {
    this.refreshBalances();
  }

  async updateData() {
    console.log("Updating Arrays...");
    const data: any = await this.loadSellOrderData("listallsellorders", this.currentAsset, /*this.pagination.listsellorders.step*/ 0, this.pagination.listsellorders.limit, this.include);

    if (data && data.data) {

      this.updateDataArrays(data.data);

      return;

    } else if (data && !data.success && data.message) {

      const msg: string = data.message;

      // break to login page
      this.router.navigate(['auth']);
      const message = "You were inactive for too long. Please log in again.";
      this.user.setToast(message);
      return;

    } else {
      if (data) {
        const message = "You have reached the end of the share classifieds list.";
        this.user.setToast(message);
        return false;
      }
    }
  }


  async updateDataArrays(data: Array<string>) {

    console.log("UPDATING DATA ARRAYS:");

    if (!data || !Array.isArray(data)) {
      console.log("ABORT: Not an array");
      console.log(data);
      return;
    }


    const index = 0;

    data.forEach(async (newDataItem, index: number) => {

      const item = JSON.parse(JSON.stringify(newDataItem));

      for (let i = 0; i < this.allSellOrderData.length; i++) {


        if (this.allSellOrderData[i].uid === item.uid) {

          item.showForm = this.allSellOrderData[index].showForm;
          item.showDetail = this.allSellOrderData[index].showDetail;
          item.showResponses = this.allSellOrderData[index].showResponses;
          item.responseDataLoaded = this.allSellOrderData[index].responseDataLoaded;
          item.hide = false;

          this.allSellOrderData[index] = item;

          i = this.allSellOrderData.length;

        }
      }

    });

  }

  // loads my trade offer data - specific to one trade
  async loadAllMySalesOrders(index: number, asset: string) {

    const data = await this.user.getAllMySalesOrdersData(asset).then((response) => {

      if (response == null) {
        return null;
      }

      if (response && response.code === '1000') {

        this.user.exitToLoginPage();
        return false;
      }

      return response.data;



    }, (result: any) => {

      this.user.setToast("A network error occurred. Please try again or contact AZUZA support if the problem persists.");
      return;
    });


    return data;
  }

  // loads my trade offer data - specific to one trade
  async loadMyTradeOfferData(offerid: string, type: string) {

    // console.log("getMyTradeOfferData(=" + type + ", offerid=" + offerid + ")");
    const data = await this.user.getMyTradeOfferData(type, offerid).then((response) => {

      if (response == null) {
        return null;
      }

      if (response && response.code === '1000') {

        return null;
      }

      return response.data;



    }, (result: any) => {

      this.user.setToast("A network error occurred. Please try again or contact AZUZA support if the problem persists.");
      return;
    });


    return data;
  }



  // loads my trade offer data - specific to one trade
  async loadMyOffersToBuyData(offerid: string, type: string) {


    const data = await this.user.getMyOffersToBuyData(type, offerid).then((response) => {


      if (response == null || !response) {
        console.log("failed to retrieve market data");
        return null;
      }

      return response.data;

    }, (result: any) => {

      this.user.setToast("A network error occurred. Please try again or contact AZUZA support if the problem persists.");
      return null;
    });

    return data;
  }

  // opens a specific buyer offer for negotiation. buyOfferId is the buyer offer item id on a particular share sales offer
  async openBuyerOfferItem(index: number, buyOfferId: string) {

    console.log("buyOfferId=" + buyOfferId + " and " + "shareOfferId=" + index);
    console.log(this.allSellOrderData);
    console.log(this.offersFromBuyersData);

    // NOTE: index here is the buyOfferList index

    // this.currentIndex = index;
    this.currentOTCItemUID = this.offersFromBuyersData[index].uid;
    console.log("Offer to accept UID: " + this.currentOTCItemUID);
    this.currentAsset = this.offersFromBuyersData[index].pair;

    console.log("UID 1 ======> " + this.currentOTCItemUID);

    let lastbid = this.offersFromBuyersData[index].price;

    if (this.offersFromBuyersData[index].Counter && this.offersFromBuyersData[index].Counter[0].Price) {
      lastbid = this.offersFromBuyersData[index].Counter[0].Price;
    }

    const data = {
      Name: this.allSellOrderData[this.currentIndex].Name,
      price: lastbid,
      amount: this.offersFromBuyersData[index].amount,
      lastbidder: this.offersFromBuyersData[index].Counter[0].BS,
      left: this.allSellOrderData[this.currentIndex].left,
      originalprice: this.allSellOrderData[this.currentIndex].price,
      totalforsale: this.allSellOrderData[this.currentIndex].amount,
      lastprice: this.allSellOrderData[this.currentIndex].lastprice,
      history: this.offersFromBuyersData,
      Counter: this.offersFromBuyersData[index].Counter,
      whoami: "S"
    };


    console.log("Sell Offer Item (using uid: " + this.currentOTCItemUID + ")");

    console.log(data);


    // this.setOTCNegotiationPage(data);

    return;

  }

  async setOTCNegotiationPage(dataSet) {

    this.otcNegotiationPage = await this.modalCtrl.create({
      component: NegotiationPopupPage,
      cssClass: 'my-custom-class',
      componentProps: {
        dataSet,
      }
    });

    this.otcNegotiationPage.onDidDismiss(async (data) => {

      if (data == null || !data) {
        return;
      }
      console.log("Dismissed OTC Negotiation Page");
      console.log(data);

      if (data) {

        this.doOTCAction(data);
        return;
      }

      return;
    });

    await this.otcNegotiationPage.present();
  }



  async doOTCAction(data: { action: string, price: number, amount: number, data?: any }) {
    if (!data || !data.action) { return; }

    let message = null;

    // accept, reject, cancel an offer to purchase

    switch (data.action) {

      case "acceptbid":
        message = "Selling shares...";

        this.completeOTCAction("acceptbid", message, this.currentOTCItemUID, data).then((response) => {
          if (response) {
            this.user.setToast("The share sale has been completed. Your money has been transferred to your wallet.");
            this.hideOfferFromBuyers();
          } else {
            this.user.setToast("There was a problem completing the sale. No share were sold.");
          }

        }).then(() => {
          this.updateData();
        }).then(() => {
          this.updateBalances();
        });

        break;

      case "buysellersask":
        message = "Buying shares...";
        const tdata: { amount: number } = { amount: 0 };
        tdata.amount = this.manageInput(data.data["Number of shares"], true);

        if (tdata.amount < 0) {
          tdata.amount === -1 ? this.user.setToast("You must provide an number of shares you would like to buy") : this.user.setToast("The number of share must be a positive, whole number.");
          return;
        }


        if (parseInt(this.allSellOrderData[this.currentIndex].left) < tdata.amount) {
          this.user.setToast("There are only " + this.allSellOrderData[this.currentIndex].left + " shares left to buy.");
          return;
        }

        this.completeOTCAction("buysellersask", message, this.currentOTCItemUID, data).then((response) => {
          if (response) {
            this.user.setToast("Your shares have been bought and transferred to your wallet");
          } else {
            this.user.setToast("The share purchase failed. Your money has been returned to your wallet.");
          }

        }, () => { }).then(() => {
          this.updateData();
        }).then(() => {
          this.updateBalances();
        });


        break;
      case "reject":
        message = "Rejecting bid...";
        this.completeOTCAction("cancelbid", message, this.currentOTCItemUID, data).then((response) => {
          if (response) {
            this.user.setToast("Offer rejected successfully");
          } else {
            this.user.setToast("This bid could not be rejected. Please try again or contact support.");
          }

        }, () => { }).then(() => {
          this.updateData();
        }).then(() => {
          this.updateBalances();
        });

        break;

      case "cancelbid":
        message = "Cancelling bid...";
        await this.completeOTCAction("cancelbid", message, this.currentOTCItemUID, data).then((response) => {
          if (response) {
            this.user.setToast("Offer cancelled successfully");
          } else {
            this.user.setToast("This bid could not be cancelled. Please try again or contact support.");
          }

        }, () => { }).then(() => {
          this.updateData();
        }).then(() => {
          this.updateBalances();
        });
        console.log("Update data pending...");

        break;

      case "cancelsellorder":
        message = "Cancelling sell order...";

        this.completeOTCAction("cancelsellorder", message, this.currentOTCItemUID, data).then((response) => {
          if (response) {
            this.removeCancelledItem();
            this.user.setToast("Sell order cancelled successfully");
          } else {
            this.user.setToast("This sell order could not be cancelled. Please try again or contact support.");
          }

        }, () => { }).then(() => {
          this.updateData();
        }).then(() => {
          this.updateBalances();
        });
        break;

      case "newoffertopurchase":
        message = "Sending offer...";

        if (!data.data) { return; }

        console.log("This is data.data: ");
        console.log(data.data);

        const trxdata: { price: number, amount: number, "Asset": string } = { price: 0, amount: 0, Asset: this.currentAsset };

        trxdata.price = this.manageInput(data.data["Price per share (R)"], false);

        if (trxdata.price < 0) {
          trxdata.price === -1 ? this.user.setToast("You must provide an offer price") : this.user.setToast("Your offer must be a positive number");
          return;
        }

        trxdata.amount = this.manageInput(data.data["Number of shares"], true);
        if (trxdata.amount < 0) {
          trxdata.amount === -1 ? this.user.setToast("You must provide an number of shares you would like to buy") : this.user.setToast("The number of share must be a positive, whole number.");
          return;
        }

        await this.completeOTCAction("newoffertopurchase", message, this.currentOTCItemUID, trxdata)
          .then((response) => {
            if (response) {
              this.user.setToast("Offer to purchase created");
            } else {
              this.user.setToast("We were unable to create this offer to purchase");
            }

          }, () => {
            this.user.setToast("We were unable to create this offer to purchase");
          })
          .then(async () => {
            await this.fetchMyOffersToPurchase();
          })
          .then(async () => {
            await this.loadMarketData(this.currentAsset, "allsellorders");
          })
          .finally(async () => {
            // this.updateData();
            this.updateBalances();
            return;
          });
        break;

      case "counteroffer":
        console.log("currentIndex: " + this.currentIndex);
        console.log("current offersFromBuyersData: ");
        console.log(this.offersFromBuyersData);

        this.completeOTCAction("counteroffer", message, this.currentOTCItemUID, data)

          .then((response) => {
            if (response) {
              this.user.setToast("Counter offer created");
            } else {
              this.user.setToast("Counter offer could not be set. Please try again or contact support.");
            }

          }, () => { })

          .then(async () => {
            await this.loadMyTradeData();
          });

        break;
    }

    return;

  }

  closeItem(item) {
    item.close();
  }

  manageInput(value: any, doFractionCheck): number {
    console.log("value in: " + value);

    if (!value) {
      console.log("Manage Input: Value doesn't exist - abort: ");
      console.log(value);
      return -1;
    }

    if (isNaN(Number(value))) {
      console.log("Not a number");
      console.log(value);
      return -2;
    }

    if (Number(value) < 0) {
      console.log("Negative number");
      console.log(value);
      return -3;
    }

    if (doFractionCheck) {
      if (!Number.isSafeInteger(Number(value))) {
        console.log("Not an integer");
        console.log(value);
        return -4;
      }
    }

    return Number(value);

  }

  removeCancelledItem() {

    for (let i = 0; i < this.allSellOrderData.length; i++) {
      console.log("this.allSellOrderData[" + i + "]");
      console.log(this.allSellOrderData[i].uid);

      if (this.allSellOrderData[i].uid === this.currentOTCItemUID) {
        this.allSellOrderData[i].hide = true;
        i = this.allSellOrderData.length;

      }
    }

    return;
  }

  async completeOTCAction(action: string, message: string, uid: string, udata?: { price: number, amount?: number, Asset?: string }): Promise<any> {

    if (!udata) { udata = { price: 0, amount: 0, Asset: "" }; }

    console.log("udata: ");

    console.log(JSON.stringify(udata));

    // this.user.createLoadingPopup(message, true);

    return new Promise((resolve, reject) => {

      this.user.doOTCRequest(action, uid, udata).then((response) => {

        try {
          this.user.dismissLoadingPopup();
        } catch (error) {
          console.log("Couldn't dismiss popup");
          console.log(error);
        }

        if (!response) {
          console.log("failed to retrieve market data");
          resolve(null);
        }

        if (response && !response.success && response.code === '1000') {
          this.user.exitToLoginPage();
          resolve(false);
        }
        console.log("returning to caller function");

        resolve(true);

      }, (response: any) => {

        try {
          this.user.dismissLoadingPopup();
        } catch (error) {
          console.log("Couldn't dismiss popup");
          console.log(error);
        }

        if (response.msg) {
          this.user.setToast(response.message);
          resolve(false);
        }
        this.user.setToast("Transaction failed. Please try again later.");

        resolve(false);

      });

    });

  }

  loadMarketList(type: string): Promise<any> {

    return new Promise(async (resolve, reject) => {

      await this.user.getMarketList(type).then((response) => {

        if (response == null) {
          console.log("Not logged in. Reauthenticate.");
          resolve(null);
          return;
        }

        resolve(response);

      }, (result: any) => {
        resolve(false);
        return;
      });
    });
  }



  loadSellOrderData(type: string, asset: string, step: number, limit: number, include: string): Promise<any> {

    if (step < 0) {
      step = 0;
    }

    this.view = null;
    this.showSpinner = true;

    return new Promise((resolve, reject) => {
      this.user.getSellOrderData(type, asset, step, limit, include).then((response) => {

        this.showSpinner = false;

        if (!response) {
          console.log("failed to retrieve market data");
          resolve(null);
          return;
        }

        if (response && !response.success && response.code === '1000') {
          this.user.exitToLoginPage();
          resolve(null);
          return;
        }

        if (response) {
          console.log(this.userdata);
          this.myMemberID = this.userdata.general.Id; // set member ID
          resolve(response);
          return;
        }
        resolve(false);
        return;

      }, (result: any) => {
        this.user.dismissLoadingPopup();
        this.user.setToast("A network error occurred. Please try again or contact AZUZA support if the problem persists.");
        resolve(null);
        return;
      });
    });
  }

  async refreshBalances(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.user.refreshWalletBalances().then(async (data: any) => {
        resolve(data);
        return;
      }, err => {
        reject(); // service potentially unavailable
      });
    });

  }

  // returns wallet balance from server userdata
  async refreshWalletBalances(): Promise<any> {

    this.refreshBalances().then(
      async (walletData) => {

        if (await walletData) {
          this.walletBalances = {
            currency_symbol: walletData.Balance.Fiat[0].CurrencySymbol,
            available_balance: walletData.Balance.Fiat[0].Available
          };

          return;
        }

        this.walletBalances = {
          currency_symbol: "R",
          available_balance: 0
        };

      },
      err => {
        this.walletBalances = {
          currency_symbol: "R",
          available_balance: 0
        };
      });
  }

  setWalletBalances() {
    if (this.userdata && this.userdata.Balance) {
      this.walletBalances = {
        currency_symbol: this.userdata.Balance.Fiat[0]?.CurrencySymbol,
        available_balance: this.userdata.Balance.Fiat[0]?.Available
      };
    }
  }


  handleRowClick(uid: string, userid: string, index: number) {

    // show create buy offer popup
    if (userid !== this.myMemberID) {
      this.createOTCOfferBuyOffer(uid, index);
      return;
    }

    // show cancel my sales order popup
    if (userid === this.myMemberID) { // current user as buyer or seller
      this.confirmCancelMySalesOrder(uid, index);
      return;
    }
    return;
  }


  openSharesList() {

    this.primeDataObjects();
    this.fetchSPVList();
    this.fetchSummaryData().then(() => {
      this.currentPage = 'marketlist';
    });
  }


  public formatNum(num: any) {

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

  dismissLoader() {
    this.user.dismissLoadingPopup();
  }

  refresh() {
    this.pollData();
  }

  closeMarket() {

    this.router.navigate(['home']);
  }

  getSellerOfferItemClass(index: number) {

    // new offer - no negotiations yet: white star
    if (!this.offersFromBuyersData[index].Counter) {
      return 'text-white';
    }

    // existing offer - seller to respond: red star
    if (this.offersFromBuyersData[index].Counter.length > 0 && this.offersFromBuyersData[index].Counter[0].BS === 'S') {
      return 'danger';
    }

    // existing offer - buyer to respond
    return 'yellow';

  }


  checkOfferElementExists(index: number): boolean {
    const exists = false;

    if (this.allSellOrderData[index].hasOwnProperty("offers")) {
      if (this.allSellOrderData[index].offers[0] && Object.keys(this.allSellOrderData[index].offers[0]).length > 0) {
        return true;
      }
      return false;
    }

    console.log("false");
    return false;

  }


  ionViewWillLeave() {
    try {
      clearInterval(this.intervalId);
    } catch (error) {
      console.log("Interval Clear Error - OTC Market Main");
      console.log(error);
    }

  }

  callConsoleLog(index: number) {
    console.log("Index: " + index);
  }



  showHelp() {
    this.openModal();
  }

  async openModal() {
    let helpScreen: any = null;
    let helpText = null;
    console.log('currentPge', this.currentPage);

  }

}
