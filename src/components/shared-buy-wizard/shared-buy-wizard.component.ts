import { Component, ElementRef, ViewChild, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnInit } from '@angular/core';
import { UserService } from 'src/app/providers/user.service';

type TermsObj = { "terms1": boolean, "terms2": boolean, "terms3": boolean, "terms4": boolean, "terms5": boolean };
type OfferVitals = { "LegalId": string, "StartDate": string, 'EndDate': string, 'TokensIssued': string, 'TokensAvailable': string, 'TokenBasePrice': string, 'SalesCommission': string, 'TokenSalesPrice': string, 'TokensSold': string, 'TotalDays': string, 'DaysLeft': string, 'HoursLeft': string, 'MinsLeft': string, 'SecondsLeft': string, 'TotalBuyers': string, 'InEscrow': string, 'requestTimeStamp': string };
type FiatObject = { 'FundId': string, 'SPVNAME': string, 'Type': string, 'MemberId': string, 'Currency': string, 'Withdraw': string, 'Deposit': string, 'Spend': string, 'Income': string, 'Available': string, 'escrow_in': string, 'escrow_out': string, 'CurrencySymbol': string, 'CurrencySymbolPos': string, 'CurrencyName': string, 'LocalCurrency': string, 'LocalCurrencySymbol': string, 'LocalCurrencySymbolPos': string, 'Extra': string, 'RecStatus': string, 'locale_id': string, 'currency_code': string };
type checkoutObj = {
  'price': number,
  'totalShares': number,
  'totalValue': number,
  'fees': number,
  'vehicle': string,
  'terms': TermsObj,
  'confirm': boolean
};


@Component({
  selector: 'app-shared-buy-wizard',
  templateUrl: './shared-buy-wizard.component.html',
  styleUrls: ['./shared-buy-wizard.component.scss']
})

export class SharedBuyWizardComponent implements OnChanges, OnInit {

  @Output() checkoutMsg = new EventEmitter<string>();
  @Output() sendTransction = new EventEmitter<string>();
  @Input('step') step: number;
  @Input('fees') fees: number;
  @Input('vitals') vitals: OfferVitals;
  @Input('fiatdata') fiatdata: FiatObject;
  @Input('sharePrice') sharePrice: number;
  @ViewChild('fiat') fiat: ElementRef;
  @ViewChild('shares') shares: ElementRef;

  legalID: number;

  // buy-wizard
  public buyStep: number = 0;
  public fiatAmount: number;
  public checkoutData: checkoutObj;
  public spendableBalance = 0;

  showBuyPopup: boolean;
  sharesToggle: boolean;
  showLoadingSpinner: boolean;
  sharesAmount: number;
  maxBuySteps: number;
  assetName: string;
  sharesAvail: number;
  termsAllChecked = false;
  termsList: TermsObj;
  paymentStep = 1;
  fiatObj: FiatObject;

  constructor(public user: UserService) {
    this.primeVariables();
    this.maxBuySteps = 3; // 3 for primary market, 4 for secondary market (add step for offer-price)
  }

  ngOnInit(): void {
    // not implemented
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.fiatdata && changes.fiatdata.currentValue) {
      this.setWalletBalances(changes.fiatdata.currentValue);
    }

    if (!changes.step.isFirstChange && changes.step && changes.step.currentValue !== changes.step.previousValue) {
      if (typeof changes.step.currentValue === 'number') {
        this.nextStep(changes.step.currentValue);
      }
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

  checkEnterPressed(event: any) {
    if (event.keyCode === 13 || event.charCode === 13 || event.code === "Enter") {
      this.nextStep(1);
      return;
    }
    return;
  }

  public formatNum(num: number): number {

    if (num && typeof num === 'string') {
      return parseInt(num);
    } else { return num; }
  }


  public setLegalID(id: number) {
    this.legalID = id;
  }

  public setSharePrice(price: number) {
    this.sharePrice = price;
  }

  public setMarketType(market: string) {
    if (market === 'S') {
      // add extra step to buy wizard
      this.buyStep = 0;
      this.maxBuySteps = 4;

    } else {
      this.maxBuySteps = 3; // default
      this.buyStep = 1;

    }
  }

  async primeVariables() {

    this.termsList = {
      terms1: false,
      terms2: false,
      terms3: false,
      terms4: false,
      terms5: false
    };

    this.termsAllChecked = false;

    this.sharesAmount = 0;
    this.fiatAmount = 0;

    this.checkoutData = {
      price: 0,
      totalShares: 0,
      totalValue: 0.00,
      fees: 0.00,
      vehicle: 'spv',
      terms: this.termsList,
      confirm: false
    };

    this.showLoadingSpinner = false;
    this.showBuyPopup = false;
    this.sharesToggle = true; // true = start on money, false = start on shares
    this.buyStep = 1;
    this.assetName = '';

    this.sharePrice = 0;
    this.fees = 0;

    this.toggleShareToggle();
    this.calcAmount();

  }

  // toggles between show/hide wizard
  public toggleBuyWizard(legalId: number, sharePrice: number, market: string, assetName: string) {
    this.assetName = assetName;

    this.setMarketType(market);

    legalId ? this.setLegalID(legalId) : false;

    sharePrice ? this.setSharePrice(sharePrice) : 0;

    this.showBuyPopup = legalId ? !this.showBuyPopup : this.showBuyPopup;

  }


  // calls getWalletBalances to set wallet balances
  async setWalletBalances(currentValue: FiatObject) {

    this.fiatObj = await currentValue;
    this.sharesAvail = this.toFloat(this.vitals.TokensAvailable);
    this.fees = +this.vitals.SalesCommission;
    this.sharesAvail = Math.floor(this.sharesAvail); // ensuring that the decimals are removed
    this.spendableBalance = this.toFloat(this.fiatObj.Available);

    await this.setInitialPurchaseValue();
  }

  setInitialPurchaseValue(): Promise<boolean> {

    return new Promise((resolve, reject) => {
      this.fiatAmount = this.spendableBalance;
      this.setFiatWalletBalance().then(async () => {
        await this.calcAmount();
      });

    });
  }

  /*
  * Calculates the shopping cart checkout value.
  * Note: fiatAmount and sharesAmount hold textField values. Not to be used in calculations.
  * 
  */
  public async calcAmount() {

    // do transaction calculations based on user's fiat amount input
    if (!this.sharesToggle) {
     
      if(this.fiatAmount == undefined || this.fiatAmount == null) return;

      // ensuring non-negative values
      let amt = this.fiatAmount;
      if (amt && amt < 0) {
        amt = Math.abs(amt);
      }

      await this.calculateUsingFiatAmount(this.fiatAmount);

      return;
    }

    // do transaction calculations based on user's shares amount input
    if (this.sharesToggle) {
      let amt = this.sharesAmount;

      if (amt) {
        amt = Math.abs(amt); // no negative shares
        amt = Math.trunc(amt); // no fractions of shares
      }
      await this.calculateUsingSharesAmount(amt);

      return;
    }

    // update parent component
    this.emitCheckoutEvent(JSON.stringify(this.checkoutData));
    
    return;
  }

  async calculateUsingSharesAmount(amt: number): Promise<boolean> {
    console.log("Calculating based on Shares amount entered");

    return new Promise((resolve, reject)=>{
      if(this.sharesAmount == undefined || this.sharesAmount == null) return;

    // handle negative or incorrect input
    if (typeof(amt) != "number" || isNaN(amt) || amt < 0 ) {
      this.checkoutData.totalShares = 0;
      this.checkoutData.totalValue = 0;
      return;
    }

    let fiatAmt = -1;
    let sharesAmt = Math.trunc(amt); // ensure decimal input is dropped

  
    // trying to buy more shares than is available
    // NOTE: Fix issue where fees are excluded
    if (sharesAmt > this.sharesAvail) {
      sharesAmt = Math.trunc(this.sharesAvail);
      fiatAmt = sharesAmt * this.sharePrice;
      this.checkoutData.totalShares = this.sharesAmount = sharesAmt;
      this.checkoutData.totalValue = this.fiatAmount = fiatAmt;
      this.showAvailSharesExceeded();
      return;
    }

    fiatAmt = sharesAmt * this.sharePrice;
    
    // Normalising purchase amount (precision of 2  (2 places after comma))
    try {
      fiatAmt = parseFloat(fiatAmt.toFixed(2));
    } catch (err) {
      // no implementation required
    }

    if (fiatAmt > 1000000) {
      this.showMaxExceeded();
      return;
    }

    if (fiatAmt > this.spendableBalance) {
      this.showBalanceExceeded();
      return;
    }

    this.checkoutData.totalShares = this.sharesAmount = Math.trunc(sharesAmt);
    this.checkoutData.totalValue = this.fiatAmount = +fiatAmt.toFixed(2);
    
    resolve(true);
    return;

    });
    
  }


  async calculateUsingFiatAmount(amt: number): Promise<boolean> {
    // User selected to input number of shares to purchase
    console.log("Calculating based on Fiat amount entered");

    return new Promise((resolve, reject)=>{

    let fiatAmt = amt;
    let sharesAmt = -1;

    // set number of shares based on non-zero fiat amount (shares amount used in checkout for purchase processing)
    if (fiatAmt > 0) {
      try {
        sharesAmt = fiatAmt / this.sharePrice;
        sharesAmt = Math.trunc(sharesAmt);

      } catch (err) {
        sharesAmt = 0;
      }
    }


    // money too little to buy a single share. Return and wait for user to add more money.
    if (!sharesAmt) {
      this.checkoutData.totalShares = this.sharesAmount = 0;
      this.checkoutData.totalValue = 0;
      return;
    }

    // trying to buy more shares than is available, set max money to match max shares
    // note: fix issue pertaining to fees (max shares money may not be enough to include fees)
    if (sharesAmt > this.sharesAvail) {
      sharesAmt = Math.trunc(this.sharesAvail);
      fiatAmt = this.sharesAvail * this.sharePrice;
      this.checkoutData.totalShares = this.sharesAmount = sharesAmt;
      this.checkoutData.totalValue = this.fiatAmount = +fiatAmt.toFixed(2);
      this.showAvailSharesExceeded();
      return;
    }

    if (this.checkoutData.totalValue > 100000000) {
      this.showMaxExceeded();
      return;
    }

    if (fiatAmt > this.spendableBalance) {
      this.showBalanceExceeded();
      return;
    }

    try {
      fiatAmt = parseFloat(fiatAmt.toFixed(2));
    } catch (err) {

    }

    this.fiatAmount = this.checkoutData.totalValue = +fiatAmt.toFixed(2);
    this.sharesAmount = this.checkoutData.totalShares = Math.trunc(sharesAmt);
    resolve(true);
    return;
  });

  }

  showMaxExceeded() {
    const message = 'The maximum single investment one can make is one million Rand';
    this.user.setToast(message, true);
  }

  showBalanceExceeded() {
    const message = 'You need to deposit more money to buy that number shares.';
    this.user.setToast(message, true);
  }

  showAvailSharesExceeded() {
    const message = "You cannot buy more shares than is available.";
    this.user.setToast(message, true);
  }

  acceptTerms(item: number) {
    switch (item) {
      case 1: {
        this.termsList.terms1 = !this.termsList.terms1;
        this.checkTermsList();
        break;
      }
      case 2: {
        this.termsList.terms2 = !this.termsList.terms2;
        this.checkTermsList();
        break;
      }
      case 3: {
        this.termsList.terms3 = !this.termsList.terms3;
        this.checkTermsList();
        break;
      }
      case 4: {
        this.termsList.terms4 = !this.termsList.terms4;
        this.checkTermsList();
        break;
      }
      case 5: {
        this.termsList.terms5 = !this.termsList.terms5;
        this.checkTermsList();
        break;
      }


    }

  }

  allTermsChecked(): Promise<boolean> {

    return new Promise((resolve, reject) => {

      for (const item in this.termsList) {
        if (!this.termsList[item]) {
          resolve(false);
          break;
        }
      }

      resolve(true);

    });

  }

  checkTermsList(): boolean {
    let checked = false;
    this.allTermsChecked().then((result) => {
      this.termsAllChecked = checked = result;
      if (result) {
        this.checkoutData.terms = this.termsList;
        this.checkoutData.confirm = result;
      }
    });
    return checked;
  }

  nextStep(showPart: number) {
    if (this.buyStep === 1 && this.checkoutData.totalShares < 1) {
      this.user.setToast('Your investment amount is too low. You must buy at least one share.');
      return;
    }

    if (showPart === -1) {
      this.step = --this.buyStep;
      if(this.buyStep < 0){
        console.log("IMPLEMENT HIDE POPUP");
        this.buyStep = 0;
      }
      return;
    }

    if (showPart === 1) {
      this.step = ++this.buyStep;
      return;
    }


    if (showPart === 0) {
      this.emitSendTransctionEvent(this.checkoutData);
    }

  }

  emitCheckoutEvent(message: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.checkoutMsg.emit(JSON.stringify(message));
    });
  }

  emitSendTransctionEvent(data: checkoutObj): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.toggleSpinner();
      this.sendTransction.emit(JSON.stringify(data));
    });
  }


  toggleSpinner(){
    this.showLoadingSpinner = !this.showLoadingSpinner;
  }


  toggleShareToggle(): void {
    this.sharesToggle = !this.sharesToggle;
    console.log(this.sharesToggle ? "SharesToggle => true" : "SharesToggle => false");
  }


  setVehicle(value: string) {
    this.checkoutData.vehicle = 'spv';
  }

  // Returns the maximum amount of shares are sold as whole units, no floating point fractals allowed
  getMaxBuyableShares(fiatAmount: number): number {

    let maxShares = 0;

    if(!fiatAmount || fiatAmount < 0){
      return maxShares;
    }

    try {
      maxShares = Math.trunc(( fiatAmount / this.sharePrice));
    } catch (err) {

    }

    return maxShares;

  }


  setFiatWalletBalance(): Promise<boolean> {

    return new Promise((resolve, reject) => {

      this.sharePrice = typeof (this.sharePrice) === 'undefined' ? 0 : this.sharePrice;

      if (this.sharesToggle) { // shares input - calculate shares for available balance
        if (this.spendableBalance <= 0 || this.sharePrice <= 0) {
          this.sharesAmount = 0;
          return;
        }

        this.sharesAmount = this.checkoutData.totalShares = this.getMaxBuyableShares(this.spendableBalance);

      } else {

        if (this.spendableBalance <= 0) {
          this.fiatAmount = 0;
          return;
        }


        this.sharesAmount = this.checkoutData.totalShares = this.getMaxBuyableShares(this.spendableBalance);

        this.checkoutData.totalValue = this.fiatAmount = (this.sharesAmount * this.sharePrice);

      }

      this.emitCheckoutEvent(JSON.stringify(this.checkoutData));

    });


  }

}
