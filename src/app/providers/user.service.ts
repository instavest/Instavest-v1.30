import { Injectable } from '@angular/core';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Camera, CameraResultType, CameraDirection, CameraSource, ImageOptions } from '@capacitor/camera';
import { ServerService } from './server.service';
import { Preferences } from '@capacitor/preferences';
import { Router, NavigationExtras } from '@angular/router';
import { VideoModalPage } from '../video-modal/video-modal.page';
import { environment } from 'src/environments/environment';
import { VaultService } from '../providers/vault.service';

export class Login {
  username: string;
  password: string;
}

const sessionKey = "sessionKey";

@Injectable({
  providedIn: 'root'
})

export class UserService {

  public server: ServerService;
  public popupPage: ModalController;
  public commsStatusMsg: string;
  public loadingControl: LoadingController;
  public userdata: any;

  public spinnerPopup: any;

  constructor(
    public toastCtrl: ToastController,
    public serverService: ServerService,
    public modalPage: ModalController,
    public loadingCtrl: LoadingController,
    public router: Router,
    private vaultService: VaultService
  ) {
    this.server = serverService;
    this.popupPage = modalPage;
    this.loadingControl = loadingCtrl;
  }

  async getVideoPage(url, poster) {
    const modal = await this.modalPage.create({
      component: VideoModalPage,
      cssClass: 'videoModalCss',
      componentProps: {
        url,
        poster
      }
    });
    return modal;
  }

  getGatewayAddress() {
    return this.server.getGatewayPath();
  }


  async getUserInfo(token: string) {
    // Get Investment Data

    const params: {} = {};

    return await new Promise((resolve, reject) => {

      this.server.doPostRequest('userinfo', token, params).then((response) => {

        if (response && response.success) {
          // successful authentication
          resolve(response);
          return;
        }

        resolve(false);
        return;

      }, (err) => {
        resolve(false);
      });

    });

  }

  // checks that the state.session value is set
  // returns false if session token is not available
  checkSessionAvailable() {
    return (!this.vaultService.sessionState.session || this.vaultService.sessionState.session.length < 1) ? false : true;
  }

  /* 
  * Get Asset, Fiat and 
  */
  async requestProductVitals(legalId: number): Promise<any> {

    const params: {} = { vitals: 1, legalid: legalId };

    return await new Promise(async (resolve, reject) => {

      await this.server.doPostRequest('legallist', this.vaultService.sessionState.session, params).then((response) => {

        if (response && response.success) {
          // successful authentication
          resolve(response);

        } else if (response && response.data && response.data.state === 0) {
          // authentication error
          resolve(response.data.state);

        } else {

          reject(false);

        }

      }, (err) => {

        reject(false);
      });

    });

  }

  // Get Investment Trend Data
  /*
  * Access the watchcharts.com API is required to get live data. For now we use hardcoded data for demo purposes.
  */ 
  async getWatchValueTrendLineData(): Promise<any> {

    return await new Promise((resolve, reject) => {
      resolve(null);
    });
    /*
        const trendDataUrl = "https://watchcharts.com/watches/chart/21817.json?type=trend&_=1647508230853";
    
        return await new Promise((resolve, reject) => {
    
          this.server.getExternalData(trendDataUrl).then((response) => {
    
            if (response && response.data && response.data.all) {
              // successful authentication
              resolve(response.data.all);
    
            } else {
              reject(false);
    
            }
    
          }, (err) => {
    
            reject(false);
          });
    
        });
        */

  }

  // fetch fetch banking source
  async loadBankingOptions(amount: number, currency: string = 'ZAR', denomination: string = 'ZAR', type: string = 'EFT'): Promise<any> {


    const params: { 'amount': number, 'currency': string, 'type': string, 'denomination': string } = { amount, currency, type, denomination };

    return await new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }


      this.server.doPostRequest('userdeposit', this.vaultService.sessionState.session, params).then((response) => {

        if (response) {
          // successful return data
          resolve(response);

          return;

        }

        resolve(null);

      }, (err) => {

        reject(false);
      });

    });

  }

  // fetch supported currency and exchange rate list
  public async getSupportedCurrenciesAndRates(): Promise<any> {

    const params: {} = {};

    return await new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }


      this.server.doPostRequest('rates', this.vaultService.sessionState.session, params).then((response) => {

        if (response) {
          // successful return data
          resolve(response);

          return;

        }

        resolve(null);

      }, (err) => {

        reject(false);
      });

    });

  }


  // fetch support topic list
  async getSupportTopics(): Promise<any> {

    const params: { 'field': string } = { field: 'supporttopic' };

    return await new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.server.doPostRequest('listvalues', this.vaultService.sessionState.session, params).then((response) => {

        if (response) {
          // successful return data
          resolve(response);

          return;

        }

        resolve(null);

      }, (err) => {

        reject(false);
      });

    });

  }


  // Returns My OTC Response data - Seller getting info from potential buyers
  async getAccountBalances(): Promise<any> {

    const params: { 'type': string } = { type: 'balance' };

    return await new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }


      this.server.doPostRequest('finance', this.vaultService.sessionState.session, params).then((response) => {

        if (response) {
          // successful return data
          resolve(response);

          return;

        }

        resolve(null);

      }, (err) => {

        reject(false);
      });

    });

  }


  public async getKYCList(type: string): Promise<any> {

    const params = {};

    return await new Promise(async (resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      await this.server.doPostRequest(type, this.vaultService.sessionState.session, params).then((response) => {


        // not logged in - reauth
        if (response === null || !response) {

          resolve(null);
          return;
        }


        if (response.success) {
          resolve(response);
          return;

        }

        if (!response.success && response.message) {
          resolve(response);
          return;

        }

        reject(false);
        return;



      }, (err) => {

        reject(false);
        return;
      });

    });

  }


  // Get Investment Data
  async getTransactionList(type: string, limit: number, page: number, walletid: string, isEscrow: boolean, _event?: string): Promise<any> {

    let event = '';

    const escrow = isEscrow ? '1' : '0';


    if (_event) {
      event = _event;
    }

    const params: { 'page': number, 'limit': number, 'scope': string, 'groupby': string, 'walletid': string, 'escrow': string, 'event'?: string, } = { page, limit, scope: '', groupby: 'Event', walletid, escrow, event };

    type = type + '&type=transaction';

    return await new Promise(async (resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      await this.server.doPostRequest(type, this.vaultService.sessionState.session, params).then((response) => {

        console.log(response);

        // not logged in - reauth
        if (response === null || !response) {

          resolve(null);
          return;
        }


        if (response.success) {
          // successful authentication
          resolve(response);
          return;

        }

        if (!response.success && response.message) {
          resolve(response);
          return;

        }

        reject(false);
        return;



      }, (err) => {

        reject(false);
        return;
      });

    });

  }

  public async dismissLoadingPopup() {

    if (this.spinnerPopup) {
      try {
        await this.spinnerPopup.dismiss().then(() => {
          return;
        }, () => {
          console.log('Caught view not found error');
        });

      } catch (err) {
        console.log('Caught view not found error');
      }

    }
  }


  // Get Account List Data - for transaction list
  async doTransfer(type: string, walletfromaddress: string, wallettoaddress: string, currency: string, amount: string): Promise<any> {

    const params: { 'walletfromaddress': string, 'wallettoaddress': string, 'currency': string, 'Amount': string } = { walletfromaddress: walletfromaddress, wallettoaddress: wallettoaddress, currency: currency, Amount: amount };

    return await new Promise(async (resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      await this.server.doPostRequest(type, this.vaultService.sessionState.session, params).then((response) => {

        // not logged in - reauth
        if (response === null || !response) {

          resolve(null);
          return;
        }


        if (response.success) {
          // successful authentication
          resolve(response);
          return;

        }

        if (!response.success && response.message) {
          resolve(response);
          return;

        }

        reject(false);
        return;

      }, (err) => {

        reject(false);
        return;
      });

    });

  }

  // Get Account List Data - for transaction list
  async doDonate(type: string, walletfromid: string, wallettoid: string, currency: string, amount: string): Promise<any> {

    const params: { 'walletfromid': string, 'wallettoid': string, 'currency': string, 'Amount': string } = { walletfromid, wallettoid, currency, Amount: amount };

    return await new Promise(async (resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      await this.server.doPostRequest(type, this.vaultService.sessionState.session, params).then((response) => {

        console.log(response);

        // not logged in - reauth
        if (response === null || !response) {

          resolve(null);
          return;
        }


        if (response.success) {
          // successful authentication
          resolve(response);
          return;

        }

        if (!response.success && response.message) {
          resolve(response);
          return;

        }

        reject(false);
        return;

      }, (err) => {

        reject(false);
        return;
      });

    });

  }

  // Get Account List Data - for transaction list
  async getAccountList(type: string): Promise<any> {

    type = type + '&type=transaction';

    return await new Promise(async (resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      await this.server.doPostRequest(type, this.vaultService.sessionState.session).then((response) => {

        // not logged in - reauth
        if (response === null || !response) {

          resolve(null);
          return;
        }


        if (response.success) {
          // successful authentication
          resolve(response);
          return;

        }

        if (!response.success && response.message) {
          resolve(response);
          return;

        }

        reject(false);
        return;

      }, (err) => {

        reject(false);
        return;
      });

    });

  }

  // Get Account List Data - for transaction list
  async createNewWallet(name: string): Promise<any> {

    const params: { 'name': string } = { name };


    return await new Promise(async (resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      await this.server.doPostRequest('newwallet', this.vaultService.sessionState.session, params).then((response) => {

        // not logged in - reauth
        if (response === null || !response) {

          resolve(null);
          return;
        }


        if (response.success) {
          // successful authentication
          console.log('NEW WALLET');
          console.log(response);
          resolve(response);
          return;

        }

        if (!response.success && response.message) {
          resolve(response);
          return;

        }

        reject(false);
        return;

      }, (err) => {

        reject(false);
        return;
      });

    });

  }

  public async getLRList(type: string, JurisdictionId: number, SectorId: number, Type: number): Promise<any> {

    const params: { 'JurisdictionId': number, 'SectorId': number, 'Type': number } = { JurisdictionId, SectorId, Type };

    return await new Promise(async (resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      await this.server.doPostRequest(type, this.vaultService.sessionState.session, params).then((response) => {

        console.log(response);

        // not logged in - reauth
        if (response === null || !response) {

          resolve(null);
          return;
        }


        if (response.success) {
          resolve(response);
          return;

        }

        if (!response.success && response.message) {
          resolve(response);
          return;

        }

        reject(false);
        return;



      }, (err) => {

        reject(false);
        return;
      });

    });

  }

  // Returns My OTC Response data - Seller getting info from potential buyers
  async getAllMySalesOrdersData(asset: string): Promise<any> {

    const params: { 'asset': string } = { asset };

    return await new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.server.doPostRequest('listallmysellorders', this.vaultService.sessionState.session, params).then((response) => {

        if (response) {
          // successful return data
          resolve(response);

          return;

        }

        resolve(null);

      }, (err) => {

        reject(false);
      });

    });

  }


  // Returns My OTC Response data - Seller getting info from potential buyers
  async getMyTradeOfferData(type: string, offerid: string): Promise<any> {

    const params: { 'offerid': string } = { offerid };

    return await new Promise((resolve, reject) => {
      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.server.doGetRequest(type, this.vaultService.sessionState.session, params).then((response) => {

        if (response && response.success) {
          // successful return data
          resolve(response);

        } else if (response && !response.success) {

          // successful but not logged in return data
          resolve(response);

        } else if (response && response.data && response.data.state === 0) {
          // authentication error
          resolve(response.data.state);

        } else {

          reject(false);

        }

      }, (err) => {

        reject(false);
      });

    });

  }




  // Returns My OTC Response data - buyer getting info between him/her and seller
  async getMyOffersToBuyData(type: string, offerid: string): Promise<any> {

    const params: { 'Selleruid': string } = { Selleruid: offerid };

    return await new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.server.doGetRequest(type, this.vaultService.sessionState.session, params).then((response) => {

        if (response && response.success) {
          // successful authentication
          resolve(response);

        } else if (response && response.data && response.data.state === 0) {
          // authentication error
          resolve(response.data.state);

        } else {

          reject(false);

        }

      }, (err) => {

        reject(false);
      });

    });

  }


  // Get Share Advert Data
  public async getMarketList(type: string): Promise<any> {

    const params = {
      groupby: 'pair'
    };

    return await new Promise(async (resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      await this.server.doPostRequest(type, this.vaultService.sessionState.session, params).then((response) => {
        // not logged in - reauth
        if (response === null || !response) {
          resolve(null);
          return;
        }

        if (response) {
          // successful authentication
          resolve(response);
          return;

        }
        reject(false);
        return;

      }, (err) => {

        reject(false);
        return;
      });

    });

  }

  public checkEmailExists(params: { email: string }): Promise<any> {

    return new Promise((resolve, reject) => {

      this.server.doPostRequest('userexist', null, params).then((response) => {

        if (response && response.success) {
          // successful authentication
          resolve(response);

        } else {
          reject(response);

        }

      }, (err) => {

        reject(false);
      });

    });

  }

  public async processWithdrawRequest(amount: string, currency: string): Promise<any> {

    const params: { Currency: string, Amount: string } = { Currency: currency, Amount: amount };

    return new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.server.doPostRequest('withdraw', this.vaultService.sessionState.session, params).then((response) => {

        if (response && response.success) {
          // successful authentication
          resolve(response);

        } else {
          reject(response);

        }

      }, (err) => {

        reject(false);
      });

    });

  }



  // Login Api
  public bioMetriclogin(params: {}): Promise<any> {

    return new Promise((resolve, reject) => {

      this.server.doPostRequest('checkBiometric', null, params).then((response) => {

        if (response && response.success) {
          // successful authentication
          resolve(response);

        } else if (response && response.data && response.data.state === 0) {
          // authentication error
          resolve(response);

        } else {
          reject(false);

        }

      }, (err) => {

        reject(false);
      });

    });

  }



  // Login Api
  public login(params: {}): Promise<any> {

    return new Promise((resolve, reject) => {

      this.server.doPostRequest('auth', null, params).then((response) => {

        if (response) {
          resolve(response);
          return;
        } else {
          reject(false);
          return;
        }

      }, (err) => {

        reject(false);
      });

    });

  }


  // store profile data temporarily
  public storeItem(name: string, value: any) {

    Preferences.set({ key: name, value: value }).then(() => {
      return true;
    });

  }

  // uploads KYC image
  public async uploadKYCImage(image: string, temptoken: string, lrid: string, description: string): Promise<any> {

    const filename = "L_RID_" + lrid;
    const descr = "description[" + filename + "]";

    const params = {
      token: temptoken
    };

    params[descr] = description;
    params[filename] = await encodeURIComponent(image);

    return new Promise((resolve, reject) => {
      this.server.doPostRequest('kycsave', temptoken, params).then((response) => {
        resolve(response);
      }, (err) => {
        reject(err);
      });
    });

  }


  // Get Keywords
  public getRandomWords(): Promise<any> {

    const params = {
      lang: 'eng',
      number: '12'
    };

    return new Promise((resolve, reject) => {
      this.server.doPostRequest('randomwords', null, params).then((response) => {
        resolve(response);
      }, (response) => {
        reject(response);
      });
    });
  }


  // Register Api
  public register(email: string, password: string, countryId: number, tags: string | boolean, autoconfirm: boolean): Promise<any> {

    const params = {
      email,
      username: email,
      password,
      CountryId: countryId,
      seed: tags,
      autoconfirm
    };

    return new Promise((resolve, reject) => {
      this.server.doPostRequest('signup', null, params).then((response) => {
        resolve(response);
      }, (response) => {
        reject(response);
      });
    });
  }

  dismissPopup(): Promise<boolean> {
    if (!this.spinnerPopup) { return; }

    return new Promise((resolve, reject) => {
      try {
        this.spinnerPopup.dismiss();
        resolve(true);
      } catch (err) {
        resolve(false);
        console.log('error message: ' + err.message);
      }
    });
  }

  async createLoadingPopup(message?: string, showText?: boolean) {

    this.spinnerPopup = await this.loadingControl.create({
      animated: true,
      backdropDismiss: true,
      spinner: null
    });
    await this.spinnerPopup.present();
    return this.spinnerPopup;
  }

  updateLoaderMessage(message: string) {
    // this.spinnerPopup.setContent(message);
    this.createLoadingPopup(message);
  }

  async setShortToast(message: string) {
    const alert = await this.toastCtrl.create({
      message,
      duration: 750,
      position: 'top',
      cssClass: 'toastCss'
    });
    alert.present();
  }

  async setSignupToast(message: string) {
    const alert = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      cssClass: 'toastCss',
      buttons: [{
        text: 'Sign up',
        handler: () => {
          Preferences.set({ key: "target", value: '1' }).then(() => {
            this.router.navigate(['/auth']);
          });
        }
      }]
    });
    alert.present();
  }

  async setToast(message: string, promptDismiss: boolean = false) {
    const alert = await this.toastCtrl.create({
      message,
      duration: promptDismiss ? 5000 : 3000,
      position: 'top',
      cssClass: 'toastCss'
    });
    alert.present();
  }

  async setPermaToast(message: string) {
    const alert = await this.toastCtrl.create({
      message,
      position: 'top',
      cssClass: 'toastCss',
      buttons: [{
        text: 'OK',
        role: 'cancel',
        handler: () => {
        }
      }]
    });
    alert.present();
  }


  // Reset Api
  resetPassword(email: string, tags: string | boolean): Promise<any> {

    const params: {} = {
      email,
      seed: tags
    };

    return new Promise((resolve, reject) => {
      this.server.doPostRequest('userreset', null, params).then((response) => {
        if (response && response.success) {
          // successful authentication
          resolve(response);

        } else if (response && response.success) {
          // authentication error
          resolve(response);

        } else {
          reject(response);

        }

      }, (err) => {

        reject(false);
      });

    });

  }

  // Reset Api
  async changePassword(newPass: string, token: string): Promise<any> {

    const params = {
      type: 'savepassword',
      newpassword: newPass
    };

    return await new Promise((resolve, reject) => {

      this.server.doPostRequest('usersecurity', token, params).then((response) => {

        // not logged in - reauth
        if (response === null || !response) {
          resolve(null);
          return;
        }

        if (response) {
          resolve(response);
          return;
        }

        resolve(false);


      }, (err) => {

        reject(false);
      });

    });
  }



  // check token validity
  async checkToken() {

    const params: {} = { ver: environment.values.apiVersion, iCn: environment.values.network };

    return await new Promise(async (resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.server.doPostRequest('session', this.vaultService.sessionState.session, params).then(async (response) => {
        if (await response) {
          resolve(response.success);
          return;
        } else {
          resolve(false);
        }

      }, (error) => {
        resolve(false);
      });

    });
  }

  // fetches wallet balances from server - returns data structure
  async getPublicAccountBalance(walletId?: string, walletAddress?: string) {

    const params: {} = walletId ? { walletId } : { walletAddress };

    return await new Promise((resolve, reject) => {

      this.server.doPostRequest('getPublicWalletBalances', this.vaultService.sessionState.session, params).then((response) => {

        if (response && response.success) {
          // successful authentication
          resolve(response.data);
          return;

        }
        if (response && response.data && response.data.state === 0) {
          // not logged in
          resolve(null);
          return;

        } else {
          reject(false);
          return;
        }

      }, (err) => {
        reject(false);
        return;
      });

    });

  }


  // fetches wallet balances from server - returns data structure
  async refreshWalletBalances() {

    const params: {} = { type: 'balance' };


    return await new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.server.doPostRequest('finance', this.vaultService.sessionState.session, params).then((response) => {

        if (response && response.success) {
          // successful authentication
          resolve(response.data);
          return;

        }
        if (response && response.data && response.data.state === 0) {
          // not logged in
          resolve(null);
          return;

        } else {
          reject(false);
          return;
        }

      }, (err) => {
        reject(false);
        return;
      });

    });

  }

  // Get Investment Data
  async getSellOrderData(type: string, asset: string, step: number, limit: number, include: string): Promise<any> {

    console.log("user.service.getSellOrderData('" + type + "')");

    const curAsset = asset ? asset : ',';

    const params: { 'page': number, 'limit': number, 'include': string, 'asset': string } = { page: step, limit, include, asset: curAsset };


    return await new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.server.doPostRequest(type, this.vaultService.sessionState.session, params).then((response) => {

        // not logged in - reauth
        if (response === null || !response) {
          resolve(null);
          return;
        }


        if (response) {
          // successful authentication
          resolve(response);
          return;

        }
        resolve(false);
      }, (err) => {
        reject(false);
      });

    });

  }

  // enroll Biometric key
  async enrollBiometric(sessionToken: string, hash: string): Promise<any> {
    if (!sessionToken) {
      return;
    }

    const params = { hash };

    const token = sessionToken;

    return await new Promise((resolve, reject) => {

      this.server.doPostRequest('enrollFingerprint', token, params).then((response) => {

        // not logged in - reauth
        if (response === null || !response) {
          console.log('NULL RESPONSE AFTER doGetRequest - log in');
          resolve(null);
          return;
        }

        if (response) {
          // successful authentication
          resolve(response);
          return;
        }

        resolve(false);

      }, (err) => {
        reject(false);
      });

    });

  }


  // Used to register user
  async storeUserdata(type: string, params: any): Promise<any> {

    return await new Promise((resolve, reject) => {

      this.server.doPostRequest('usersave', this.vaultService.sessionState.session, params).then((response) => {

        // not logged in - reauth
        if (response === null || !response) {
          resolve(null);
          return;
        }

        if (response) {
          // successful authentication
          resolve(response);
          return;
        }

        resolve(response);

      }, (err) => {
        reject(false);
      });

    });

  }


  // Update User
  async updateUserdata(type: string, fieldname: string, value: string): Promise<any> {

    const val = value ? value : "";
    if (!type || !fieldname) { return; }

    const params = { type };
    params[fieldname] = val; // variable key like FirstName/Surname etc.

    return await new Promise((resolve, reject) => {

      this.server.doPostRequest('usersave', this.vaultService.sessionState.session, params).then((response) => {

        // not logged in - reauth
        if (response === null || !response) {
          resolve(null);
          return;
        }

        if (response) {
          // successful authentication
          resolve(response);
          return;

        }
        resolve(false);

      }, (err) => {

        reject(false);
      });

    });

  }


  // Get Investment Data
  async doOTCRequest(action: string, OffersUId: string, udata: { 'price'?: number, 'amount'?: number, 'Asset'?: string }): Promise<any> {

    if (!udata.hasOwnProperty('Asset')) { udata.Asset = ','; }

    if (!udata.hasOwnProperty('price')) { udata.price = 0; }

    if (!udata.hasOwnProperty('amount')) { udata.amount = 0; }


    const params: { 'OffersUId': string, 'termsaccepted': number, 'Price'?: number, 'Amount'?: number, 'Asset'?: string } = { OffersUId, Price: udata.price, Amount: udata.amount, termsaccepted: 1, Asset: udata.Asset };


    return await new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.server.doPostRequest(action, this.vaultService.sessionState.session, params).then((response) => {

        resolve(response);

      }, (err) => {

        reject(false);
      });

    });

  }

  // fetch support topic list
  async sendSupportMessage(supportId: string, heading: string, message: string, supporttopic: number): Promise<any> {

    const params: { 'supportid': string, 'header': string, 'msg': string, 'supporttopic': number } = { supportid: supportId, header: heading, msg: message, supporttopic };

    return await new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.server.doPostRequest('addsupport', this.vaultService.sessionState.session, params).then((response) => {

        if (response) {
          // successful return data
          resolve(response);

          return;

        }

        resolve(null);

      }, (err) => {

        reject(false);
      });

    });

  }

  // fetch support message list
  async getSupportMessages(): Promise<any> {

    const params: {} = {};

    return await new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.server.doPostRequest('listsupport', this.vaultService.sessionState.session, params).then((response) => {

        if (response && response.success) {
          // successful return data
          resolve(response);

          return;

        }
        resolve(false);

      }, (err) => {

        reject(false);
      });

    });

  }


  // Buy Shares Api
  async doBuyShares(params?: {}): Promise<any> {

    return new Promise((resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.server.doPostRequest('userorder', this.vaultService.sessionState.session, params).then((response) => {

        if (response && response.success) {
          // successful authentication
          resolve(response);

        } else if (response && response.data && response.data.state === 0) {
          // authentication error
          resolve(response);

        } else {
          reject(false);

        }

      }, (err) => {

        reject(false);
      });

    });

  }

  async takePicture(): Promise<any> {

    const options: ImageOptions = {
      quality: 100,
      source: CameraSource.Prompt,
      width: 800,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      correctOrientation: true,
      presentationStyle: 'popover',
      direction: CameraDirection.Rear
    }


    return new Promise((resolve, reject) => {
      Camera.getPhoto(options).then(async (b64str) => {
        resolve(await b64str);
        return;
      }, (err) => {
        reject(err);
        return;
      });
    });
  }

  processUpload(image, lrid, description): Promise<any> {

    return new Promise(async (resolve, reject) => {

      if (!this.checkSessionAvailable()) {
        resolve(false);
      }

      this.uploadKYCImage(image, this.vaultService.sessionState.session, lrid, description).then(async (response) => {
        if (response && response.success) {
          resolve(true);
          return;
        } else {
          if (!response) {
            reject(null);
            return;
          } else {
            resolve(response);
            return;
          }
        }
      }, (err) => {
        reject(err);
      });

    });
  }

  /* ****************** */

  // exits user login page
  public async exitToLoginPage(message?: string, hideMessage?: boolean) {

    let show = !hideMessage ? true : false;

    show = false; // disabled session expired message

    // const navigationExtras: NavigationExtras = { queryParams: { currentPage: 'auth' } };

    if (!message && show) { message = 'Your session has expired. Please log in again.'; }
    try{
      this.vaultService.lockVault(this.vaultService.getBiometricVaultKey());
    } catch(error){
      // do nothing, the vault will lock itself upon app exit
    }

    // This part should no longer be required. Vault should take the app back to login page once the vault is locked.
  
    this.dismissPopup();
    this.router.navigate(['auth']);
    
    if (message && show) {
      this.setToast(message);
    }
  }

}
