type RegProcess = Array<{ 'step': string, 'step_name': string, 'description': string, 'complete': boolean }>;
type RegData = { "name": string, "surname": string, "homeaddress": string, "emailaddress": string, "password": string, "mnemonickeys": string | boolean, biometricKey?: string, referralCode?: string };
type EmailStateResponse = { success: boolean, msg: string, data: { "Exist": boolean, "Active": boolean, "Confirm": boolean, "KYC": boolean }, code: string };
type KYCDetails = { KYCComplete: boolean, KYCRequired: boolean, KYCMsg: string, KYCDocs: KYCDocs };
type KYCDocs = Array<{ lrid: string, uploaded: boolean, state: string }>;
type KYCDocItems = Array<KYCItem>;
type KYCItem = { name: string, lrid: string, b64img: string };
type EmailCheckResult = { Exist: boolean, Active: boolean, Confirm: boolean, KYC: boolean };
type BannerImage = { uri: string, page?: string };

// import { AvailableResult, BiometryType, NativeBiometric } from 'capacitor-native-biometric';
import { Component, ChangeDetectorRef } from '@angular/core';
import { MenuController, ModalController, Platform } from '@ionic/angular';
import { UserService } from '../providers/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { Browser, OpenOptions } from '@capacitor/browser';
import { VaultService } from '../providers/vault.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
})

export class AuthPage {

  rememberMe = { email: '', password: '', checked: false, agree: false };
  regData: RegData = { name: null, surname: null, homeaddress: null, emailaddress: null, password: null, mnemonickeys: null, biometricKey: "", referralCode: "" };

  kycDetails: KYCDetails = null;
  kycDocs: KYCDocs = null;
  kycDocItems: KYCDocItems = null;
  KycDocItemsOutstanding = 0;

  selectedOption = "login"; // front page options {"login, register, reset"}

  showRegisterLoading = false;  // control activity indicator for register while loading
  showLoginLoading = false;     // control activity indicator for login process (not biometric)
  showBiometricLoading = false; // control activity indicator for login process (biometric)
  showSignupSpinner = false;    // control activity indicator for signup process
  showResetSpinner = false;

  referralCode: string = null;
  autoconfirm = true; // set to false to force email address verification

  numberNames = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'nineth', 'tenth', 'elevent', 'last'];

  registrationProcess: RegProcess = [];

  initRegStep = 1; // Starting registration step

  navHistory: Array<{ page: string }> = [];



  showPassword = false;
  fieldType = 'password';
  tempToken: string;

  arr: Array<string> = [];
  userOrderedArr: Array<string> = [];
  originalArr: Array<string> = [];
  currentPage = "";
  target: any;
  newWord = "";
  count = 0;

  emailValid: boolean;
  passwordValid: boolean;

  gota = false;
  gotA = false;
  got$ = false;
  got8 = false;
  got1 = false;
  selectedCountryCode = 710;

  passwordRegex = new RegExp('^(?=[ -~]*?[A-Z])(?=[ -~]*?[a-z])(?=[ -~]*?[0-9])(?=[ -~]*?[#?!@$%^&*-])[ -~]{8,72}$');
  lcRegx = new RegExp('(?=[ -~]*?[a-z])');
  ucRegx = new RegExp('(?=[ -~]*?[A-Z])');
  numRegx = new RegExp('(?=[ -~]*?[0-9])');
  scRegx = new RegExp('(?=[ -~]*?[#?!@$%^&*-])');
  /* lenRegx = new RegExp('(^\s*(?:\S\s*){10,100}$)'); */

  showPWhints = true;
  tagsfield;
  checkEmail = false;

  oneSignalId: any;

  biometricState = false;

  showPage = "login";
  showHomeBtn = false;

  pageLogo = 'logo';

  bannerImages: Array<BannerImage> = [
    { uri: 'assets/sections/login_banner.png', page: '/investment-detail-one' } // 1 Rolex Mariner Watch
  ];

  // DEBUG
  result = null;
  imgSize = 0;
  message = "";

  constructor(
    public user: UserService,
    public menu: MenuController,
    public route: ActivatedRoute,
    public router: Router,
    public modalController: ModalController,
    public changeDetector: ChangeDetectorRef,
    public platform: Platform,
    private vaultService: VaultService
  ) {
    this.primeVariables();
    this.init();
  }

  // initialises the auth page for login/registration
  async init() {
    this.currentPage = "login";
    return;
  }

  randomString(len: number): string {
    let str = "";                                // String result
    for (let i = 0; i < len; i++) {              // Loop `len` times
      let rand = Math.floor(Math.random() * 62); // random: 0..61
      const charCode = rand += rand > 9 ? (rand < 36 ? 55 : 61) : 48; // Get correct charCode
      str += String.fromCharCode(charCode);      // add Character to str
    }
    return str; // After all loops are done, return the concatenated string
  }

  // completes biometric registration
  async registerBiometrics(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      await this.enableBiometrics().then((result: string) => {
        this.regData.biometricKey = result ? result : "";
        resolve();

      }, () => {
        this.regData.biometricKey = "";
        resolve();

      });
    });
  }

  async enableBiometrics(): Promise<string> {
    // creating a new random key to start in the secure vault
    const key = crypto.randomUUID();

    console.log("Biometric key: " + key);

    return new Promise(async (resolve, reject) => {
      await this.vaultService.unlockVault(this.vaultService.getBiometricVaultKey()).then(async () => {
        await this.vaultService.storeItem(this.vaultService.getBiometricVaultKey(), "hash", key).then(async (result) => {
          if (result) {
            resolve(key);
          }
          resolve(null);
        });
      }, () => {
        resolve(null);
      });
    });
  }

  async processFingerPrintLogin(secret: string) {
    let params: {} = { hash: secret };

    this.user.bioMetriclogin(params).then(async (data: any) => {

      if (!data.data) {
        this.user.setToast(data.msg);
        return;
      }

      if (!data.success) {
        // authentication error
        if (data.data.state === 0 && data.msg) {
          this.user.setToast(data.msg);
          return;
        }

        // all other errors.
        this.user.setToast(data.msg);
        return;
      }

      if (await data.data) {
        // commit login date to storage

        // secure storage of session token
        await this.vaultService.unlockVault(this.vaultService.getSessionVaultKey());
        await this.vaultService.setSession(data.data.token);

        // load landingPage
        if (!data.data.KYCDetails.KYCRequired || data.data.KYCDetails.KYCComplete) {
          this.loadLandingPage();
          return;
        }

        // load KYC page
        await this.initHome(data.data);
        return;

      } else {
        this.menu.enable(false, "main");
        const errMsg = "Log in failed. Please try again.";
        const msg = data.data.msg ? data.data.msg : errMsg;
        this.user.setToast(msg);
      }
    },
      () => {
        // login error 
        this.menu.enable(false, "main");
        const errMsg = "We're unable to complete this request. Please try again or contact Instavest Support (support@instavestcapital.com).";
        this.user.setToast(errMsg);
      });

  }

  async primeVariables() {
    await this.vaultService.getBiometricStatus().then((state)=>{
      this.biometricState = !state;
    });

    console.log("Biometric State Object (Auth): ");
    console.log(this.vaultService.biometricState);
    
    this.initRegProcessVars();
    this.fieldType = this.showPassword ? 'text' : 'password';
    this.kycDocs = []; // docs uploaded
    // this.kycDetails = { KYCComplete: false, KYCRequired: true, KYCMsg: '', KYCDocs: [] }
    this.kycDocItems = [{ name: "Proof of ID", lrid: "41", b64img: "" },
    { name: "Proof of ID (Card back)", lrid: "42", b64img: "" },
    { name: "Proof of Address", lrid: "43", b64img: "" },
    { name: "Proof of Life", lrid: "44", b64img: "" },
    { name: "Proof of Bank Account", lrid: "45", b64img: "" }];
    return;
  }

  // utility function to initialise the registration process object
  initRegProcessVars() {
    this.registrationProcess = [
      { step: '1', step_name: "reg-step-1", description: 'intro', complete: false },
      { step: '2', step_name: "reg-step-2", description: 'Terms of service', complete: false },
      { step: '3', step_name: "reg-step-3", description: "Capture email address", complete: false },
      { step: '4', step_name: "reg-step-4", description: "Choose Password", complete: false },
      { step: '5', step_name: "reg-step-5", description: "Register biometrics", complete: false },
      // Register biometrics is an implicity step that the OS takes care of if biometrics are available
      { step: '6', step_name: "reg-step-5", description: "FICA", complete: false }
      // step 7 returns to the login screen
    ];
    return;
  }

  // toggle password
  toggleShowPassword() {
    this.showPassword = !this.showPassword;
    this.fieldType = this.showPassword ? 'text' : 'password';
  }

  acceptTerms() {
    this.rememberMe.agree = !this.rememberMe.agree;
    if (this.rememberMe.agree) {
      setTimeout(() => {
        this.registrationNav();
      }, 300);
    }
  }

  checkKeypadEnter(event) {
    if (this.checkEnterPressed(event)) {
      this.registrationNav();
    }
  }

  checkLoginEnter(event) {
    if (!this.emailValid || (this.rememberMe.password.length < 1)) {
      return;
    }

    if (this.checkEnterPressed(event)) {
      this.login();
    }
  }

  // checks the registrationProcess array and returns the next step that has not yet been completed
  getNextRegistrationPage(): number {
    let count = this.initRegStep; // start at the first step
    this.registrationProcess.forEach(element => {
      element.complete ? ++count : false;
    });

    return count;
  }

  /* Registration process steps */
  async registrationNav() {

    // gets last next element where !regstrationProcess.complete
    const step = this.getNextRegistrationPage();

    // can't simply set "nextPage" to this value because we need to validate input before moving ahead
    const regStep = "reg-step-" + step;
    console.log("Registration step: " + regStep);

    switch (regStep) {

      case 'reg-step-1': // show info page
      case 'reg-step-2': // show t&c page
      case 'reg-step-3': { // enter email address page
        this.registrationProcess[step - 1].complete = true;
        this._move(step);
        break;
      }

      case 'reg-step-4': { // register email address on the server and return uuid
        await this.storeEmailAddress().then(result => {
          if (result) {
            this.registrationProcess[step - 1].complete = true;
            this._move(step);
            return;
          }
        }, () => { // handle any reject situation
          this.user.setToast("Connection error. Please try again or contact Instavest (support@instavestcapital.com) for assistance.");
          return;
        });

        break;
      }

      case 'reg-step-5': {
        this.regData.biometricKey = "";

        if (this.biometricState && !this.regData.biometricKey) { // biometricKey of null is default, "" is set for no biometric support
          await this.registerBiometrics().then(() => {
            // we need to wait for registration to complete before moving ahead. Else reg-step-5 might be called again
            this.registrationProcess[step - 1].complete = true;
            this._move(step);
          });
        } else {
          // step complete whether bio registration successful or not
          this.registrationProcess[step - 1].complete = true;
          this._move(step);
        }
        break;
      }

      case 'reg-step-6': {
        const msgSuccess = this.autoconfirm
          ? "Welcome to Instavest! You can log in."
          : "Please confirm your email address to log in.";
        const msgFailed = "Registration failed. Please try again later.";


        this.doRegiserUser().then(result => {
          if (result) {
            const msg = result ? msgSuccess : msgFailed;
            this._reset();
            this.user.setToast(msg);
          }
        });
        break;
      }
    }

    return;
  }

  /* Checks if the user's email address is unique, then stores it and returns a sessionKey 
  that is used to complete the registration process. Returns this object:  
  {
    "success": true, <--- network/server success
    "msg": "This username is already associated with an account.",
    "data": {
        "Exist": true, <--- Does email addy exist in db
        "Active": true, <--- If email addy exists, is the account state active
        "Confirm": true, <--- If email addy exists, has it been confirmed
        "KYC": false <--- Has KYC been completed
    },
    "code": "11008"
    } NOTE: PERSONAL PRIVACY LEAK? WE'LL NEED TO PATCH THIS.
  */
  async storeEmailAddress(): Promise<boolean> {

    return new Promise(async (resolve, reject) => {
      await this.registerEmailAddress().then((result: EmailStateResponse) => {
        if (result && result.success) {
          if (!result.data.Exist) {
            resolve(true);
            return;
          }
          if (result.data.Exist) {
            if (result.data.Active) {
              this.user.setPermaToast("Email address already in use. Please reset your password or contact support (support@instavestcapital.com) for assistance.");
              resolve(false);
              return;
            }
            if (!result.data.Confirm) {
              this.user.setToast("Email address already registered but not confirmed.");
              resolve(false);
              return;
            }
            if (!result.data.Active) {
              this.user.setToast("This account has been deactivated. Please contact support (support@instavestcapital.com) for assistance.");
              resolve(false);
              return;
            }

          }
          resolve(false);
        }
        reject(false);

      }, () => {
        // leave unimplemented. Handled hereafter.
        reject(null);
      });

    });

  }

  // Sends user registration information to the server
  doRegiserUser(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      // register user
      await this.submitBasicInfo().then(result => {
        if (result) {
          resolve(result ? true : false);
        } // failed results are handled by the submitBasicInfo function
      }, error => {
        resolve(false);
      });
    });
  }

  async registerEmailAddress(): Promise<EmailStateResponse> {
    this.checkEmail = true;
    // set loading spinner
    return new Promise(async (resolve, reject) => {
      await this.checkEmailExists().then(async (response: EmailStateResponse) => {
        this.checkEmail = false;
        resolve(response);
        return;
      },
        async () => {
          this.checkEmail = false;
          resolve(null);
          return;
        }
      );
    });
    // check email address valid
  }

  processEmailCheckResponse(response: EmailCheckResult): Promise<boolean> {

    return new Promise((resolve, reject) => {

      if (!response.Exist) { // email address doesn't exist in the system
        resolve(true);
        return;

      } else {
        this.showHomeBtn = true;

        if (!response.Confirm) { // email address not confirmed

          resolve(false);
          return;

        }

        if (!response.Active) { // account is  not active because email not confirmed and/or KYC docs hasn't been provided and/or approved.
          this.user.setPermaToast("This account has been deactivated. Please contact support (support@instavestcapital.com) for assistance.");
          resolve(false);
          return;
        }

        // account is active - KYC docs could be outdated - this scenario is handled with login
        this.user.setPermaToast("This email address is already associated with an Instavest account. Use a different email address to register another account or log in to access an existing account.");
        resolve(false);
        return;

      }

    });

  }

  _reset() {
    this.initRegProcessVars();
    this.vaultService.resetVault(this.vaultService.getSessionVaultKey());
    this.selectedOption = 'login';
    this.showSignupSpinner = false;
    this.showLoginLoading = false;
    this.showRegisterLoading = false;
    this.showHomeBtn = false;
    this.regData = { name: null, surname: null, homeaddress: null, emailaddress: null, password: null, mnemonickeys: null, biometricKey: null, referralCode: null };
    this.arr.length = 0;
    this.emailValid = false;
    this.rememberMe.agree = false;
    this.rememberMe.checked = false;
    this.originalArr.length = 0;
    this.userOrderedArr.length = 0;
    this.navHistory.length = 0;
    this.tempToken = null;
    this.currentPage = "login";
    this.pageLogo = "logo";
    this.router.navigate(['auth']);
  }

  _move(step: number) {
    this.currentPage = "reg-step-" + step;
    console.log("this.currentPage: " + this.currentPage);
    this.pageLogo = (this.currentPage === 'login' || this.currentPage === 'reg-step-1') ? "logo" : "small-logo";
    this.navHistory.push({ page: this.currentPage });
    return;
  }

  loadPage(index: number) {
    this.navHistory.push({ page: this.bannerImages[index].page });
    this.router.navigate(['/' + this.bannerImages[index].page]);
  }

  checkEmailExists(): Promise<EmailStateResponse> {
    return new Promise((resolve, reject) => {
      this.user.checkEmailExists({ email: this.rememberMe.email }).then(
        (result) => {
          resolve(result);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  async doBioMetricLogin() {

    this.showBiometricLoading = true;

    await this.vaultService.unlockVault(this.vaultService.getBiometricVaultKey())
      .then(() => {
        // vault successfully unlocked
        this.vaultService.getItem(this.vaultService.getBiometricVaultKey(), "hash").then(
          async (secret) => {
            if (secret) {
              await this.processFingerPrintLogin(secret).finally(() => {
                this.showBiometricLoading = false;
              });
              return;
            }

            this.fallbackNormalLogin();
            return;
          },
          () => {
            // secret not found - show error message. Go to login page.
            this.fallbackNormalLogin();
            return;
          });
      },
        () => {
          this.fallbackNormalLogin();
          return;
          
        });

    this.showBiometricLoading = false;

    return;
  }

  fallbackNormalLogin() {
    this.showBiometricLoading = false;
    this.biometricState = false;
    this.vaultService.biometricState.biometricCapability = 'NotEnabled';
    this.biometricState = false;
    this.menu.enable(false, "main");
    this.user.setToast("Biometric login not set up. Please log in with your username and password.", true);

    setTimeout(() => {
      this.router.navigate(['auth']);
    }, 3000);

    return;
  }


  // login and go to home page
  async login() {
    if (!this.rememberMe.email || this.rememberMe.email.length < 1) {
      this.user.setToast("Enter your email address or Instavest username in the username line");
      return;
    }

    if (!this.rememberMe.password || this.rememberMe.password.length < 1) {
      this.user.setToast("Enter your password in the password line");
      return;
    }

    // set spinner
    this.showLoginLoading = true;

    // do login
    const params: {} = { username: this.rememberMe.email, password: this.rememberMe.password };

    this.user.login(params).then(async (response: any) => {
      this.showLoginLoading = false;

      const data = await response;

      if (!data) {
        this.menu.enable(false, "main");
        const errMsg = "We're unable to complete this request. Please try again or contact Instavest Support (support@instavestcapital.com).";
        this.user.setToast(errMsg);
        return;
      }

      // succesfully logged in
      if (data.success) {
        await this.vaultService.setSession(data.data.token);

        // commit referral code to general storage
        await Preferences.set({ key: 'refCode', value: data.data.referral });

        // load landing page if KYC is not required AND there is no withdrawal pending, or if there is, banking data has been loaded

        /******************************************************************************/
        /***    DELETE true in the condition below to enable KYC Document check     ***/
        /******************************************************************************/
        if (true || !data.data.KYCDetails.KYCRequired && (!data.data.withdrawPending || (data.data.withdrawPending && data.data.BankingLoaded)) /*|| data.data.KYCDetails.KYCComplete*/) { // load landing page
          this.loadLandingPage();
          return;
        }

        // gets skipped if "true" is added as first item in statement above.
        await this.initHome(data.data); // load KYC page

        return;

      }


      // authentication error
      if (data.data.state === 0) {
        if (data.bio) {
          Preferences.set({ key: "biostate", value: data.bio });
        }
        this.user.setPermaToast(data.msg);
        return;
      }

      // all other errors.
      this.user.setPermaToast(data.msg);
      return;

    }, error => {
      this.showLoginLoading = false;
      this.menu.enable(false, "main");
      this.user.setToast("We're unable to complete this request. Please try again or contact Instavest Support (support@instavestcapital.com).", true);

      setTimeout(() => {
        this.router.navigate(['auth']);
      }, 3000);

    });

  }

  async completedKYC() {
    this._reset();
    this.user.setPermaToast("Thank you! Your documents will be reviewed by one of our team members shortly. You will be able to log into your account once it's been approved.");
  }

  getKYCItemIdFromLRID(lrid) {
    switch (lrid) {
      case "41": { return 0; }
      case "42": { return 1; }
      case "43": { return 2; }
      case "44": { return 3; }
      case "45": { return 4; }
    }
  }

  getKYCItemLabelFromId(lrid) {
    switch (lrid) {
      case '41': { return "ID / ID Card / Passport"; }
      case '42': { return "ID Card (Back)"; }
      case '43': { return "Proof of address"; }
      case '44': { return "Selfie"; }
      case "45": { return "Proof of bank account"; }
    }
  }

  loadLandingPage() {
    this.router.navigate(['home']);
    return;
  }

  async initHome(loginData) {

    // prepare to load KYC docs

    // const kycRequired: KYCDocs = [];
    this.kycDocs = loginData.KYCDetails.KYCDocs;

    this.KycDocItemsOutstanding = 0; // zero means KYC approval in process - currenly no new docs to submit

    // test code
    // this.kycDocs = [{lrid: "41", uploaded: true, state: "X"}, {lrid: "42", uploaded: true, state: "Y"},{lrid: "43", uploaded: true, state: "X"},{lrid: "44", uploaded: true, state: "X"}];

    if (loginData.BankingLoaded === false && loginData.withdrawPending === true) {
      this.kycDocs.push({ lrid: '45', uploaded: false, state: 'X' }); // add proof of bank account if required
      ++this.KycDocItemsOutstanding;
    }

    if (!loginData.KYCComplete) {
      // check which kyc docs are outstanding and passes only the outstanding list to the KYC page
      for (const item of this.kycDocs) {
        if (item.state === "R" || (!item.uploaded && item.state === "X")) {
          ++this.KycDocItemsOutstanding;
        }
      }
    }

    // pass control to kyc page
    if (this.KycDocItemsOutstanding > 0) {
      Preferences.set({ key: "kyc", value: JSON.stringify(this.kycDocs) }).then(() => {
        this.router.navigate(['kyc']);
        return;
      }, err => {
        this.user.exitToLoginPage("Your request could not be completed. Please try again later.");
      });

      return;
    }
    // finally since nothing else is required show message and load landing page

    this.loadLandingPage();
    this.user.setPermaToast("Your FICA documents are being verified. Deposits will only be loaded to your wallet after successful FICA verification.");
    return;
  }


  setSignupToast() {
    // KYC Docs all submited - awaiting approval
    this.user.setPermaToast("Your membership application is being processed. We will be in touch soon.");
  }

  confirmKeywords() {
    this.checkTag().then((result) => {
      if (result) {
        this.registrationNav();
      }

    });
  }


  async openModal() {
    let helpScreen: any = null;
    let helpText = null;
  }

  goHome() {
    this._reset();
  }



  goBack() {

    // reset the previous registrationProcess element 'complete' parameter
    const step = this.getNextRegistrationPage();
    if (step > 0) {
      this.registrationProcess[step - 1].complete = false;
    }

    // pop the last navHistory item
    const nextPage = this.navHistory[this.navHistory.length - 2 < 0 ? 0 : this.navHistory.length - 2].page;
    this.navHistory.pop();

    this.showPWhints = true; // reset showPassword hints toggle

    switch (nextPage) {
      case ('register' || 'reg-step-1'): {
        break;
      }

      default:
        this.currentPage = nextPage;
    }

    return;
  }


  showHelp() {
    this.openModal();
  }

  async showRegister() {

    this.selectedOption = "register";
    this.showRegisterLoading = true;
    this.navHistory = [];

    await this.registrationNav(); // increment registration step count
    this.selectedOption = 'login'; // resets auth page button style 
  }

  showTerms() {
    this.currentPage = "terms-condition";

  }

  checkTermsCondition() {
    if (this.rememberMe.agree === false) { return false; }
    this.currentPage = "keywords";

  }



  /* Checking for enter-action */
  async checkEnter(event: any) {

    if (await this.checkListOfWords()) {
      return;
    }

    if (await this.a11yClick(event)) {
      this.updateList();
    }
    return;
  }

  async checkListOfWords() {

    const wordArray = this.newWord.split(" ");
    if (Array.isArray(wordArray) && wordArray.length > 1) {
      const upperlimit = 12;
      let i = 0;

      wordArray.forEach(async (word) => {
        if (this.arr.length < 13) {
          this.newWord = word;
          await this.updateList();
          i++;
        }
      });

      return true;
    }
    return false;
  }

  checkEnterPressed(event: any) {
    if (event.keyCode === 13 || event.charCode === 13 || event.code === "Enter") {
      return true;
    }
    return false;
  }

  async a11yClick(event: any) {
    // new word on white space
    const regex = /\s/;
    if (await regex.test(this.newWord)) {
      return true;
    }

    if (event.keyCode === 32 || event.charCode === 32 || event.code === "Space" ||
      event.keyCode === 13 || event.charCode === 13 || event.code === "Enter") {
      return true;
    }
  }

  // add item to array once add/enter/space is pressed
  async updateList() {

    let word = this.newWord;

    if (!word || word.length < 0) {
      return;
    }

    setTimeout(async () => {
      this.newWord = "";
      // experimental
      this.tagsfield = await document.getElementById('resettagsfield');
      if (this.tagsfield) {
        await this.tagsfield.setFocus();
      }
    }, 100);

    word = word.trim();

    // checking that only valid characters are used
    let regExp = new RegExp(/^[a-zA-Z0-9]{1,12}$/);

    const res = await regExp.test(word);

    if (!res) {
      this.user.setToast('Words can be made up of English alphabet letters and numbers and must be 3 to 12 characters long.');
      word = word.slice(0, -1);
      this.newWord = word;
      return false;
    }

    if (this.arr.length === 12) {
      this.user.setToast("You can define a maximum of twelve words.");
      return false;
    }

    // removing illegal characters
    regExp = new RegExp(/[`~!@#$%^&*()_|+\-=?;:",.<>\s\{\}\[\]\\\/\-]/gi);
    const outString = word.replace(regExp, '');

    this.arr.push(outString);

    /* force scope to re-evaulate */
    this.changeDetector.detectChanges();
    return;
  }


  removeTag(tagId: number) {
    this.arr.splice(tagId, 1);
    return;
  }

  checkTag(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.arr = this.arr.filter((v) => v !== '');

      if (this.arr.length >= 9 && this.arr.length <= 12) {

        this.count = this.arr.length;

        if (this.arr != null) {
          this.shuffle(this.arr).then((shuffled_array) => {
            this.arr = shuffled_array;
          });
        }

        resolve(true);

      } else {
        this.user.setToast("You must enter a minimum of 9 words and a maximum 12 words.");
        resolve(false);
      }
    });
  }


  orderItem(itemName: string, i: number) {
    const pos = this.userOrderedArr.length;

    if (itemName.trim() === this.originalArr[pos].trim()) {
      this.userOrderedArr.push(itemName.trim());
      this.arr.splice(i, 1);

    } else {
      this.user.setToast("The selected word is not in the correct order");

    }
  }

  shuffle(arr: Array<string>): Promise<any> {

    this.userOrderedArr = [];
    this.originalArr = [...this.arr];

    return new Promise(async (resolve, reject) => {

      let i = 0;
      let j = 0;
      let temp: string;

      for (i = arr.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }

      resolve(arr);
    });

  }

  validateEmailAddressCreated() {
    this.emailValid = false;

    if (!this.checkValidEmailAddress()) {
      const stringUsernameRegex = new RegExp('^([a-zA-Z0-9_\\-\\.]+)$');
      if (!this.rememberMe.email.match(stringUsernameRegex)) {
        this.emailValid = false;
        return false;
      }
      this.emailValid = false;
      return;
    }
    this.emailValid = true;
    return;
  }

  validatePasswordCreated() {
    if (!this.checkValidPassword()) {
      this.passwordValid = false;
      return;
    }

    this.passwordValid = true;
    return;
  }


  /*** REGISTER VALIDATION CHECK ****/
  doRegValidationCheck(): boolean {

    if (this.currentPage === 'register') {
      if (!this.rememberMe.email || this.rememberMe.email.length < 1) {
        this.user.setToast("You need a valid email address to create an Instavest account");
        return;
      }

      if (!this.checkValidEmailAddress()) {
        const stringUsernameRegex = new RegExp('^([a-zA-Z0-9_\\-\\.]+)$');
        if (!this.rememberMe.email.match(stringUsernameRegex)) {
          this.emailValid = false;
          this.user.setToast("Your email address doesn't look so lekker hey");
          return false;
        }
      }
      return true;
    }

    if (this.currentPage === 'add-password') {
      if (!this.rememberMe.password || this.rememberMe.password.length < 1) {
        this.user.setToast("You must create a password for your account");
        if (!this.checkValidPassword()) {
          this.passwordValid = false;
          this.user.setToast("Use a combination of UPPERCASE and lowercase letters, numbers, and special characters");
          return false;
        }
        this.passwordValid = false;
      }
      return true;
    }

  }

  togglePWHints() {
    this.showPWhints = true;
    return;
  }

  checkValidEmailAddress() {

    const validEmailFormatRegex = new RegExp(/^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|aaa|aarp|abarth|abb|abbott|abbvie|abc|able|abogado|abudhabi|ac|academy|accenture|accountant|accountants|aco|actor|ad|adac|ads|adult|ae|aeg|aero|aetna|af|afamilycompany|afl|africa|ag|agakhan|agency|ai|aig|airbus|airforce|airtel|akdn|al|alfaromeo|alibaba|alipay|allfinanz|allstate|ally|alsace|alstom|am|amazon|americanexpress|americanfamily|amex|amfam|amica|amsterdam|analytics|android|anquan|anz|ao|aol|apartments|app|apple|aq|aquarelle|ar|arab|aramco|archi|army|arpa|art|arte|as|asda|asia|associates|at|athleta|attorney|au|auction|audi|audible|audio|auspost|author|auto|autos|avianca|aw|aws|ax|axa|az|azure|ba|baby|baidu|banamex|bananarepublic|band|bank|bar|barcelona|barclaycard|barclays|barefoot|bargains|baseball|basketball|bauhaus|bayern|bb|bbc|bbt|bbva|bcg|bcn|bd|be|beats|beauty|beer|bentley|berlin|best|bestbuy|bet|bf|bg|bh|bharti|bi|bible|bid|bike|bing|bingo|bio|biz|bj|black|blackfriday|blockbuster|blog|bloomberg|blue|bm|bms|bmw|bn|bnpparibas|bo|boats|boehringer|bofa|bom|bond|boo|book|booking|bosch|bostik|boston|bot|boutique|box|br|bradesco|bridgestone|broadway|broker|brother|brussels|bs|bt|budapest|bugatti|build|builders|business|buy|buzz|bv|bw|by|bz|bzh|ca|cab|cafe|cal|call|calvinklein|cam|camera|camp|cancerresearch|canon|capetown|capital|capitalone|car|caravan|cards|care|career|careers|cars|casa|case|cash|casino|cat|catering|catholic|cba|cbn|cbre|cbs|cc|cd|center|ceo|cern|cf|cfa|cfd|cg|ch|chanel|channel|charity|chase|chat|cheap|chintai|christmas|chrome|church|ci|cipriani|circle|cisco|citadel|citi|citic|city|cityeats|ck|cl|claims|cleaning|click|clinic|clinique|clothing|cloud|club|clubmed|cm|cn|co|coach|codes|coffee|college|cologne|com|comcast|commbank|community|company|compare|computer|comsec|condos|construction|consulting|contact|contractors|cooking|cookingchannel|cool|coop|corsica|country|coupon|coupons|courses|cpa|cr|credit|creditcard|creditunion|cricket|crown|crs|cruise|cruises|csc|cu|cuisinella|cv|cw|cx|cy|cymru|cyou|cz|dabur|dad|dance|data|date|dating|datsun|day|dclk|dds|de|deal|dealer|deals|degree|delivery|dell|deloitte|delta|democrat|dental|dentist|desi|design|dev|dhl|diamonds|diet|digital|direct|directory|discount|discover|dish|diy|dj|dk|dm|dnp|do|docs|doctor|dog|domains|dot|download|drive|dtv|dubai|duck|dunlop|dupont|durban|dvag|dvr|dz|earth|eat|ec|eco|edeka|edu|education|ee|eg|email|emerck|energy|engineer|engineering|enterprises|epson|equipment|er|ericsson|erni|es|esq|estate|et|etisalat|eu|eurovision|eus|events|exchange|expert|exposed|express|extraspace|fage|fail|fairwinds|faith|family|fan|fans|farm|farmers|fashion|fast|fedex|feedback|ferrari|ferrero|fi|fiat|fidelity|fido|film|final|finance|financial|fire|firestone|firmdale|fish|fishing|fit|fitness|fj|fk|flickr|flights|flir|florist|flowers|fly|fm|fo|foo|food|foodnetwork|football|ford|forex|forsale|forum|foundation|fox|fr|free|fresenius|frl|frogans|frontdoor|frontier|ftr|fujitsu|fujixerox|fun|fund|furniture|futbol|fyi|ga|gal|gallery|gallo|gallup|game|games|gap|garden|gay|gb|gbiz|gd|gdn|ge|gea|gent|genting|george|gf|gg|ggee|gh|gi|gift|gifts|gives|giving|gl|glade|glass|gle|global|globo|gm|gmail|gmbh|gmo|gmx|gn|godaddy|gold|goldpoint|golf|goo|goodyear|goog|google|gop|got|gov|gp|gq|gr|grainger|graphics|gratis|green|gripe|grocery|group|gs|gt|gu|guardian|gucci|guge|guide|guitars|guru|gw|gy|hair|hamburg|hangout|haus|hbo|hdfc|hdfcbank|health|healthcare|help|helsinki|here|hermes|hgtv|hiphop|hisamitsu|hitachi|hiv|hk|hkt|hm|hn|hockey|holdings|holiday|homedepot|homegoods|homes|homesense|honda|horse|hospital|host|hosting|hot|hoteles|hotels|hotmail|house|how|hr|hsbc|ht|hu|hughes|hyatt|hyundai|ibm|icbc|ice|icu|id|ie|ieee|ifm|ikano|il|im|imamat|imdb|immo|immobilien|in|inc|industries|infiniti|info|ing|ink|institute|insurance|insure|int|international|intuit|investments|io|ipiranga|iq|ir|irish|is|ismaili|ist|istanbul|it|itau|itv|iveco|jaguar|java|jcb|je|jeep|jetzt|jewelry|jio|jll|jm|jmp|jnj|jo|jobs|joburg|jot|joy|jp|jpmorgan|jprs|juegos|juniper|kaufen|kddi|ke|kerryhotels|kerrylogistics|kerryproperties|kfh|kg|kh|ki|kia|kim|kinder|kindle|kitchen|kiwi|km|kn|koeln|komatsu|kosher|kp|kpmg|kpn|kr|krd|kred|kuokgroup|kw|ky|kyoto|kz|la|lacaixa|lamborghini|lamer|lancaster|lancia|land|landrover|lanxess|lasalle|lat|latino|latrobe|law|lawyer|lb|lc|lds|lease|leclerc|lefrak|legal|lego|lexus|lgbt|li|lidl|life|lifeinsurance|lifestyle|lighting|like|lilly|limited|limo|lincoln|linde|link|lipsy|live|living|lixil|lk|llc|llp|loan|loans|locker|locus|loft|lol|london|lotte|lotto|love|lpl|lplfinancial|lr|ls|lt|ltd|ltda|lu|lundbeck|luxe|luxury|lv|ly|ma|macys|madrid|maif|maison|makeup|man|management|mango|map|market|marketing|markets|marriott|marshalls|maserati|mattel|mba|mc|mckinsey|md|me|med|media|meet|melbourne|meme|memorial|men|menu|merckmsd|mg|mh|miami|microsoft|mil|mini|mint|mit|mitsubishi|mk|ml|mlb|mls|mm|mma|mn|mo|mobi|mobile|moda|moe|moi|mom|monash|money|monster|mormon|mortgage|moscow|moto|motorcycles|mov|movie|mp|mq|mr|ms|msd|mt|mtn|mtr|mu|museum|mutual|mv|mw|mx|my|mz|na|nab|nagoya|name|nationwide|natura|navy|nba|nc|ne|nec|net|netbank|netflix|network|neustar|new|news|next|nextdirect|nexus|nf|nfl|ng|ngo|nhk|ni|nico|nike|nikon|ninja|nissan|nissay|nl|no|nokia|northwesternmutual|norton|now|nowruz|nowtv|np|nr|nra|nrw|ntt|nu|nyc|nz|obi|observer|off|office|okinawa|olayan|olayangroup|oldnavy|ollo|om|omega|one|ong|onl|online|onyourside|ooo|open|oracle|orange|org|organic|origins|osaka|otsuka|ott|ovh|pa|page|panasonic|paris|pars|partners|parts|party|passagens|pay|pccw|pe|pet|pf|pfizer|pg|ph|pharmacy|phd|philips|phone|photo|photography|photos|physio|pics|pictet|pictures|pid|pin|ping|pink|pioneer|pizza|pk|pl|place|play|playstation|plumbing|plus|pm|pn|pnc|pohl|poker|politie|porn|post|pr|pramerica|praxi|press|prime|pro|prod|productions|prof|progressive|promo|properties|property|protection|pru|prudential|ps|pt|pub|pw|pwc|py|qa|qpon|quebec|quest|qvc|racing|radio|raid|re|read|realestate|realtor|realty|recipes|red|redstone|redumbrella|rehab|reise|reisen|reit|reliance|ren|rent|rentals|repair|report|republican|rest|restaurant|review|reviews|rexroth|rich|richardli|ricoh|ril|rio|rip|rmit|ro|rocher|rocks|rodeo|rogers|room|rs|rsvp|ru|rugby|ruhr|run|rw|rwe|ryukyu|sa|saarland|safe|safety|sakura|sale|salon|samsclub|samsung|sandvik|sandvikcoromant|sanofi|sap|sarl|sas|save|saxo|sb|sbi|sbs|sc|sca|scb|schaeffler|schmidt|scholarships|school|schule|schwarz|science|scjohnson|scot|sd|se|search|seat|secure|security|seek|select|sener|services|ses|seven|sew|sex|sexy|sfr|sg|sh|shangrila|sharp|shaw|shell|shia|shiksha|shoes|shop|shopping|shouji|show|showtime|si|silk|sina|singles|site|sj|sk|ski|skin|sky|skype|sl|sling|sm|smart|smile|sn|sncf|so|soccer|social|softbank|software|sohu|solar|solutions|song|sony|soy|spa|space|sport|spot|spreadbetting|sr|srl|ss|st|stada|staples|star|statebank|statefarm|stc|stcgroup|stockholm|storage|store|stream|studio|study|style|su|sucks|supplies|supply|support|surf|surgery|suzuki|sv|swatch|swiftcover|swiss|sx|sy|sydney|systems|sz|tab|taipei|talk|taobao|target|tatamotors|tatar|tattoo|tax|taxi|tc|tci|td|tdk|team|tech|technology|tel|temasek|tennis|teva|tf|tg|th|thd|theater|theatre|tiaa|tickets|tienda|tiffany|tips|tires|tirol|tj|tjmaxx|tjx|tk|tkmaxx|tl|tm|tmall|tn|to|today|tokyo|tools|top|toray|toshiba|total|tours|town|toyota|toys|tr|trade|trading|training|travel|travelchannel|travelers|travelersinsurance|trust|trv|tt|tube|tui|tunes|tushu|tv|tvs|tw|tz|ua|ubank|ubs|ug|uk|unicom|university|uno|uol|ups|us|uy|uz|va|vacations|vana|vanguard|vc|ve|vegas|ventures|verisign|versicherung|vet|vg|vi|viajes|video|vig|viking|villas|vin|vip|virgin|visa|vision|viva|vivo|vlaanderen|vn|vodka|volkswagen|volvo|vote|voting|voto|voyage|vu|vuelos|wales|walmart|walter|wang|wanggou|watch|watches|weather|weatherchannel|webcam|weber|website|wed|wedding|weibo|weir|wf|whoswho|wien|wiki|williamhill|win|windows|wine|winners|wme|wolterskluwer|woodside|work|works|world|wow|ws|wtc|wtf|xbox|xerox|xfinity|xihuan|xin|xxx|xyz|yachts|yahoo|yamaxun|yandex|ye|yodobashi|yoga|yokohama|you|youtube|yt|yun|za|zappos|zara|zero|zip|zm|zone|zuerich|zw|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i);

    if (!this.rememberMe.email.match(validEmailFormatRegex)) {
      this.emailValid = false;
      return false;
    }

    this.emailValid = true;
    return true;
  }

  checkValidPassword() {

    if (!this.rememberMe.password.match(this.passwordRegex)) {
      this.passwordValid = false;
      this.showPWhints = true;

    } else {
      this.passwordValid = this.gota = this.gotA = this.got$ = this.got1 = this.got8 = true;
      this.showPWhints = false;
      return this.passwordValid;
    }

    if (this.rememberMe.password.match(this.lcRegx)) {
      this.gota = true;
    } else { this.gota = false; }

    if (this.rememberMe.password.match(this.ucRegx)) {
      this.gotA = true;
    } else { this.gotA = false; }

    if (this.rememberMe.password.match(this.numRegx)) {
      this.got1 = true;
    } else { this.got1 = false; }

    if (this.rememberMe.password.match(this.scRegx)) {
      this.got$ = true;
    } else { this.got$ = false; }

    if (this.rememberMe.password.length > 7 && this.rememberMe.password.length < 73) {
      this.got8 = true;
    } else { this.got8 = false; }


    return this.passwordValid;
  }

  async doPasswordReset() {
    this.showResetSpinner = true;

    const seedstr: string | boolean = this.makePipedList(this.arr);

    this.user.resetPassword(this.rememberMe.email, seedstr).then((data: any) => {

      this.showResetSpinner = false;

      if (!data) {
        this.router.navigate(['auth']);
        this.user.setToast("The Instavest system is currently unavailable. Please try again later.");
        return;
      }
      if (data.token && data.token.length > 0) {
        this.tempToken = data.token;
        this.currentPage = 'password-choose-new';
        return;
      }

    }, (data) => {
      this.showResetSpinner = false;
      let msg = "A network error occured. Please try again later.";

      if (data && data.msg && data.msg.length > 1) {
        msg = data.msg;
      }
      this.user.setToast(msg, true);
      this.router.navigate(['auth']);
    });

  }

  // returns a piped string of seed words
  makePipedList(array: Array<string>): string {
    if (!array) { return null; }

    let seedstring = "";

    const filteredArray = array.filter((el) => {
      return el != null;
    });


    filteredArray.forEach((word, index) => {
      seedstring += word;
      if (index !== filteredArray.length - 1) {
        seedstring += "|";
      }
    });
    return seedstring;
  }

  populateData(seed) {
    this.regData.emailaddress = this.rememberMe.email;
    this.regData.password = this.rememberMe.password;
    this.regData.mnemonickeys = seed;
  }

  // complete the first part of registration
  async submitBasicInfo(): Promise<any> {
    const errmsg = "An error occurred during the signup process. Try again or contact out support@instavestcapital.com for assistance.";

    // create seed word string
    const seedstr = await this.makePipedList(this.userOrderedArr);
    this.populateData(seedstr);

    // load first popup
    this.showSignupSpinner = true;

    return new Promise(async (resolve, reject) => {
      // create user account
      await this._registerUserStep1().then(
        async (sessionToken) => {

          this.vaultService.sessionState.session = sessionToken; // username/email has been registered. Use same session to store user data

          let userdata = {
            type: 'general',
            FirstName: this.regData.name,
            LastName: this.regData.surname,
            fcm: this.oneSignalId, // oneSignal ID
            autoconfirm: this.autoconfirm, // set to false to verify email address
            hash: this.regData.biometricKey, // biometric hash
            UserName: this.regData.emailaddress,
            CountryId: this.selectedCountryCode,
            RefBy: this.regData.referralCode
          };

          // store user personal information
          await this.user.storeUserdata('general', userdata)
            .then(
              async (response) => {
                userdata.hash = null; // remove the biometricKey from memory

                let resp = await response;

                if (resp && !resp.success) {
                  this.handleMemberCreateError(response.msg, 0);
                  resolve(false);
                }
              }, err => {
                this.handleMemberCreateError(errmsg, 0);
                resolve(false);
              })
            // store address information
            .then(
              async response => {
                await this.user.updateUserdata('address', 'AddrLine1', this.regData.homeaddress);
              },
              err => {
                // address store error
                this.handleMemberCreateError(errmsg, 0);
                resolve(false);
              })
            // store
            .then(
              async response => {

                this.showSignupSpinner = false;
                resolve(true);
              },
              err => {
                resolve(false);
              });

        }, err => {
          this.emailValid = false;
          this.handleMemberCreateError(errmsg, 3);
          resolve(false);
        });
    });
  }

  async handleMemberCreateError(message: string, pageId: number) {
    this.showSignupSpinner = false;
    if (message) {
      this.user.setToast(message);
    } else {
      this.user.setToast("The Instavest server failed to confirm your membership registration request. Please contact Instavest support (support@instavestcapital.com).");
    }
  }

  async _registerUserStep1(): Promise<string> {

    return new Promise((resolve, reject) => {
      this.user.register(this.regData.emailaddress, this.regData.password, 710, this.regData.mnemonickeys, this.autoconfirm).then((data: any) => {

        if (!data) {
          reject(null);
          return;
        }

        if (!data.success) {
          // throw network error toast
          reject(data.msg);
          return;
        }

        if (data && data.success) {
          resolve(data.data.token);
        }

      });
    });

  }

  launchExternalWebsite(option: string) {
    let url: string;

    switch (option) {
      case "terms-of-use":
        url = "http://instavestcapital.com/legal/Instavesttos.pdf";
        break;
      case "privacy-policy":
        url = "https://instavestcapital.com/legal/privacy.pdf";
        break;
      case "cookies-policy":
        url = "https://instavestcapital.com/cookie-policy-za/";
        break;
    }
    if (url) {
      const options: OpenOptions = { url, presentationStyle: 'popover', windowName: 'Instavest' };
      const browser = Browser.open(options);
    }
    return;
  }

  async changePassword() {
    if (!this.rememberMe.password) {
      return;
    }

    await this.user.changePassword(this.rememberMe.password, this.tempToken).then((response) => {
      this.arr = [];
      this.userOrderedArr = [];
      this.originalArr = [];
      this.navHistory = [];
      this.tempToken = null;

      if (response && response.success) {
        this.rememberMe.password = null;
        this.currentPage = "login";
        this.user.setToast("Your password has been changed. You can use it to log in.");
        return;
      }

      if (response && response.msg) {
        this.rememberMe.password = null;
        this.currentPage = "login";
        this.user.setToast(response.msg);
        return;
      }

      this.currentPage = "login";
      this.user.setToast("We couldn't reset your password. PLease contact our support team for assistance.");
      return;
    });
  }

  // forget password popup
  forgotPass() {
    this.selectedOption = "reset";
    this.arr = [];
    this.userOrderedArr = [];
    this.originalArr = [];
    this.navHistory = [];
    this.navHistory.push({ page: this.currentPage });
    this.navHistory.push({ page: 'lost-password' });
    this.currentPage = 'lost-password';
    return;
  }

  checkCallback() {
    Preferences.get({ key: "target" }).then(async (result) => {
      this.target = await result.value;
      if (this.target) {
        Preferences.remove({ key: "target" }).then(() => {
          this.showRegister();
        });
      }
    });
  }

  ionViewWillEnter() {

    this.checkCallback();
  }

}
