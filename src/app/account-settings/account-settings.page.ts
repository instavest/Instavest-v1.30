import { Location } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, MenuController, NavController, NavParams, Platform } from '@ionic/angular';
import { UserService } from '../providers/user.service';
import { PushNotifications } from '@capacitor/push-notifications';
import { VaultService } from '../providers/vault.service';

type User = { 'MemberId': string, 'FirstName': string, 'LastName': string, 'IdNo': string, 'IdType': string, 'Gender': string, 'UserName': string, 'Email': string, 'RefBy': string, 'DOB': string, 'Status': string, 'KYCLevel': string, 'CountryId': string, 'Role': string, 'MemberType': string, 'RoleName': string };
type BankAcc = { 'type': string, 'Id': '0', 'Country': string, 'BankName': string, 'AccountNumber': string, 'BranchCode': string };
type KYCItem = { 'MediaId': string, 'linkid': string, L_RID: string, 'LinkTo': string, 'FieldName': string, 'FileURL': string, 'oldname': string, 'Description': string, 'Group': string, 'Type': string, 'Status': string, 'TimeStamp': string, 'Name': string, 'User': string };
type KYCList = Array<KYCItem>;
type KycDocItems = Array<{ name: string, lrid: string, b64img: string }>;
type SectorItem = { 'Id': string, 'SectorId': string, 'L_RID': string, 'RecStatus': string, 'Name': string, 'Mandatory': string, 'ValidTypes': Array<string>, 'Type': string, 'AdminApproved': string, 'FileSize': string, 'CurrencyId': string, 'JurisdictionId': string, 'uploaded'?: boolean, 'status'?: string };
type SectorList = Array<SectorItem>;
type EditTracker = Array<{ id: number, state: string }>;

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.page.html',
  styleUrls: ['./account-settings.page.scss'],
})

export class AccountSettingsPage {
  @ViewChild('docsForm') docsForm: ElementRef;

  currentPage = 'personal';
  darkTheme = false;

  pages: Array<{ page: string }> = [{ page: 'personal' }, { page: 'docs' }, { page: 'banking' }];
  cPage = 0;
  countries: Array<{ name: string, id: number, selected: boolean }>;
  user: User;
  banking: BankAcc;
  docs: { 'VerificationLevel': string, 'KYCLevel': string };
  security: { 'fa2': string, 'ipaddress': string };
  referral: { 'referral': string };
  fieldState: EditTracker = null;
  kycList: KYCList;
  sectorList: SectorList;
  KycDocItems: KycDocItems;
  bankingLoaded = false;
  debug: string;
  debug2: string;
  debug3: string;
  showNotificationToggle = true;

  currentBankName: string;
  direction = -5;
  actionSheet: any;
  image: string;

  notificationLabel = "Enable notications";
  notificationPermission = false;
  notificationSetting = false;

  biometricState = false;
  biometricLabel = "Enable biometric access";

  uploadResponse = '';
  showDocsLists = false;

  showDocsReceivedHeading = false;
  showDocsRequiredHeading = false;
  editedItemId = 0;

  pnSubState = null;
  biometricAvailable = false;
  userdata = null;

  constructor(
    public navCtrl: NavController,
    public menuCtrl: MenuController,
    public userProv: UserService,
    public router: Router,
    public location: Location,
    public actionSheetCtrl: ActionSheetController,
    public platform: Platform,
    private vaultService: VaultService
  ) {

    const navigation = this.router.getCurrentNavigation().extras.state !== undefined ? this.router.getCurrentNavigation().extras.state.currentPage : 'personal';
    this.currentPage = navigation;

    this.initVariables();
  }

  getBiometricLabel(): string {
    return this.biometricState ? "Disable biometrics" : "Enable biometrics";
  }

  async toggleBiometricState() {

    await this.vaultService.getBiometricStatus().then((state) => { // confirm current biometric state
      this.biometricState = !state;
    })

    /**** if biometric state is on, clear vault and set biometric state to off ****/
    if (this.biometricState) { 
      await this.vaultService.resetVault(this.vaultService.getBiometricVaultKey()).then(() => {
        this.biometricState = false;
      }, () => {
        return;
      });

      return;
    }

    /****   if biometric state was disabled enable it ****/
    if (this.vaultService.biometricState.biometricCapability === "Enabled" || this.vaultService.biometricState.biometricCapability === "SystemPasscode") {

      let biometricHash = null;

      this.vaultService.unlockVault(this.vaultService.getBiometricVaultKey()).then(async () => { // unlocks vault using biometrics
        biometricHash = crypto.randomUUID();  // create a new key

        await this.vaultService.storeItem(this.vaultService.getBiometricVaultKey(), "hash", biometricHash); // add the key to the biometric vault

        await this.registerBiometrics(biometricHash).then(async (result) => { // upload the new key to the server
          if (result && result.data && result.data.enrolled) {

            await this.vaultService.getBiometricStatus().then((state) => {
              this.biometricState = !state; // state return answer to isEmpty (true means biometricState is negative)
              this.biometricLabel = this.getBiometricLabel();
            })

          }
        }, () => {
          // biometric registation error
          this.userProv.setToast("Biometric key registration failed. Try again or contact support@instavestcapital.com for assistance.");
        });

        return;
      });

      return;
    }

    /****   biometrics not enabled or not available on the device  ****/
    this.userProv.setToast("Biometric login is not enabled on your device.");

    //TODO: Add quick link to biometric setup - https://github.com/RaphaelWoude/capacitor-native-settings
  }

  /*
  * Registers a new biometric hash in the user database
  */
  async registerBiometrics(hash: string): Promise<any> {
    // NOTE: empty biometric key switches FA2 variable to false
    const sessionToken = this.vaultService.sessionState.session;
    return new Promise(async (resolve, reject) => {
      await this.userProv.enrollBiometric(sessionToken, hash).then(async (result) => {
        resolve(result);
      });
    });

  }

  randomString(len): string {
    let str = "";                                // String result
    for (let i = 0; i < len; i++) {              // Loop `len` times
      let rand = Math.floor(Math.random() * 62); // random: 0..61
      const charCode = rand += rand > 9 ? (rand < 36 ? 55 : 61) : 48; // Get correct charCode
      str += String.fromCharCode(charCode);      // add Character to str
    }
    return str; // After all loops are done, return the concatenated string
  }

  async setupNotificationVars() {
    // this.state = status;
    this.notificationLabel = this.notificationSetting ? "Disable notifications" : "Enable notifications";
    this.setNotificationPermission();
    return;
  }

  async toggleNotificationPermission() {

    this.notificationSetting = !this.notificationSetting;

    if (!this.notificationSetting) {
      await this.userProv.updateUserdata('general', 'fcm', "");
      // await this.oneSignal.setSubscription(false);
      this.setupNotificationVars();
      return;
    }

    // await this.oneSignal.setSubscription(true);
    // fetch updated permissions

  }

  setNotificationPermission() {
    /*   if (!this.state || !this.state.permissionStatus || !this.state.permissionStatus.state) {
         this.notificationPermission = false;
         return;
       }
   
       if (this.platform.is("ios")) {
         this.notificationPermission = this.state.permissionStatus.status === 2 ? true : false;
       }
   
       if (this.platform.is("android")) {
         this.notificationPermission = this.state.permissionStatus.state === 1 ? true : false;
       }*/

  }

  editMode(id: number, event: string) {
    this.editedItemId = id;
    this.fieldState[id].state = event;
  }


  checkMoreDocsRequired(): boolean {
    if (!this.sectorList || this.sectorList.length < 1) {
      return false;
    }
    let element: SectorItem = null;
    const BreakException = {};
    let i = 0;
    try {
      for (element of this.sectorList) {
        if (!this.sectorList[i].uploaded) {
          throw BreakException;
        }
        ++i;
      }
    } catch (err) {
      return false;
    }
    return true;
  }


  resetInputControls() {
    if (!this.docsForm.nativeElement.elements || this.docsForm.nativeElement.elements.length < 1) { return; }
    let element = "";
    let i = 0;
    for (element of this.docsForm.nativeElement.elements) {
      this.docsForm.nativeElement.elements[i].value = '';
      ++i;
    }
  }

  // Photo code for KYC
  async selectImage(type: any, itemId: number) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: "Choose photo source",
      cssClass: "action-sheet-bg",
      buttons: [{
        text: 'Take new photo',
        cssClass: 'cs_camera',
        handler: () => {
          // take picture and upload
          this.getImage(type, itemId);
        }
      },
      {
        text: 'Cancel',
        role: 'cancel',
        cssClass: 'cs_cancel',
      }]
    });
    await actionSheet.present();
  }

  getImage(type: any, itemId: number) {

    this.userProv.takePicture().then(async (b64str: string) => {
      const imgdata = "data:image/jpeg;base64," + await b64str;
      this.KycDocItems[this.getKYCItemId(type)].b64img = "I";

      this.userProv.processUpload(imgdata, this.KycDocItems[itemId].lrid, this.KycDocItems[itemId].name).then(
        success => {
          this.KycDocItems[this.getKYCItemId(type)].b64img = "U";
          this.checkDocsUploaded();
        },
        failed => {
          this.KycDocItems[this.getKYCItemId(type)].b64img = "";

          if (failed === false) {
            // session error
            this.userProv.exitToLoginPage();
            return;
          }

          if (failed == null) {
            this.userProv.setToast("Network failure. Please check your Internet connection and try again.");
            return;
          }
          this.userProv.setToast(failed.message);
        });
    }, error => {
      this.KycDocItems[this.getKYCItemId(type)].b64img = "";
      this.userProv.setToast("Upload failed. Please try again or contact Azuza support (support@instavestcapital.com)");
      return;
    });
  }

  getKYCItemId(type: string): number {
    let kycItem = 0;
    switch (type) {
      case "ID": { kycItem = 0; break; }
      case "IDB": { kycItem = 1; break; }
      case "PoA": { kycItem = 2; break; }
      case "PoB": { kycItem = 3; break; }
    }
    return kycItem;
  }

  // Checks if a document has been uploaded and approved
  checkDocsUploaded() {
    const BreakException = {};

    this.sectorList.forEach((element: SectorItem) => {

      try {
        this.kycList.forEach((kycelement: KYCItem) => {

          if (element.L_RID === kycelement.L_RID) {

            if (kycelement.Status === 'A' || kycelement.Status === 'N') {
              element.uploaded = true;
            } else if (kycelement.Status === 'R') {
              element.uploaded = false;
            }
            throw BreakException;
          }

        });
      } catch (e) {

      }

    });
  }


  async saveChanges(type: string, name: string, id: number) {
    if (!name) {
      const msg = 'The ' + name + 'field is mandatory';
      this.userProv.setToast(msg);
      return;
    }

    // set spinner
    this.editMode(id, "I");

    switch (name) {
      case 'First name':
        this.doUpdateField(type, 'FirstName', this.user.FirstName, name).then(response => {
          this.editMode(id, "S");
          setTimeout(() => {
            this.editMode(id, null);
          }, 1000);
        }, err => { });
        break;
      case 'Last name':
        this.doUpdateField(type, 'LastName', this.user.LastName, name).then(response => {
          this.editMode(id, "S");
          setTimeout(() => {
            this.editMode(id, null);
          }, 1000);
        }, err => { });
        break;
      case 'Username':
        this.doUpdateField(type, 'UserName', this.user.UserName, name).then(response => {
          this.editMode(id, "S");
          setTimeout(() => {
            this.editMode(id, null);
          }, 1000);
        }, err => { });
        break;
    }

  }


  doUpdateField(type: string, name: string, value: string, field_label: string, hideMsg?: boolean): Promise<any> {
    const showToast: boolean = hideMsg ? true : false;

    return new Promise(async (resolve, reject) => {
      await this.userProv.updateUserdata(type, name, value).then(
        response => {
          console.log(response);
          resolve(response);
        },
        err => {
          console.log('ERROR: saveChanges()');
          reject(err);
        });
    });
  }

  async handleSwipe(event) {

    console.log(event);

    if (event.direction === this.direction) { return; } // illiminates pan multi-triggers

    const dir = (this.direction = event.direction);

    console.log('this is dir: ' + dir);

    await this.swipeToPage(dir).then((pageNo) => {

      console.log(pageNo);
      if (isNaN(Number(pageNo))) { return; }

      setTimeout(() => {
        this.cPage = pageNo;
        this.showPage(pageNo);
        this.direction = -5;

      }, 100);
      return;
    });

  }

  async swipeToPage(direction: number): Promise<any> {

    return new Promise((resolve, reject) => {
      let nextPage: number = this.cPage;
      console.log('starting point: ' + this.cPage);

      if (direction === 4) {
        nextPage = nextPage - 1;
        nextPage = (nextPage < 0) ? 0 : nextPage;
        console.log(this.pages[nextPage].page);
        resolve(nextPage);
      }
      if (direction === 2) {
        nextPage = nextPage + 1;
        nextPage = nextPage > 2 ? 2 : nextPage; // >3 ? 3 when security tab is ready
        console.log(this.pages[nextPage].page);
        resolve(nextPage);
      }
    });

  }

  showPage(pageNo: number) {
    this.cPage = pageNo;
    this.currentPage = this.pages[pageNo].page;
  }


  async initVariables() {
    await this.vaultService.getBiometricStatus().then((state) => {
      this.biometricState = !state;
    });

    this.fieldState = [{ id: 0, state: null }, { id: 1, state: null }, { id: 2, state: null }, { id: 3, state: null }];
    this.countries = [{ name: '', id: 0, selected: false }];
    this.user = { MemberId: '', FirstName: '', LastName: '', IdNo: '', IdType: '', Gender: '', UserName: '', Email: '', RefBy: '', DOB: '', Status: '', KYCLevel: '', CountryId: '', Role: '', MemberType: '', RoleName: '' };
    this.banking = { type: '', Id: '0', Country: '', BankName: '', AccountNumber: '', BranchCode: '' };
    this.docs = { VerificationLevel: '', KYCLevel: '' };
    this.security = { fa2: '', ipaddress: '' };
    this.referral = { referral: '' };
    this.kycList = [{ MediaId: '', linkid: '', L_RID: '', LinkTo: '', FieldName: '', FileURL: '', oldname: '', Description: '', Group: '', Type: '', Status: '', TimeStamp: '', Name: '', User: '' }];
    this.sectorList = [{ Id: '', SectorId: '', L_RID: '', RecStatus: '', Name: '', Mandatory: '', ValidTypes: [''], Type: '', AdminApproved: '', FileSize: '', CurrencyId: '', JurisdictionId: '' }];
    // Specific to South Africa
    this.KycDocItems = [
      { name: "Proof of ID", lrid: "41", b64img: "" },
      { name: "ID Card (Back)", lrid: "42", b64img: "" },
      { name: "Proof of Address", lrid: "43", b64img: "" },
      { name: "Proof of Bank", lrid: "44", b64img: "" }];

    await this.getUserdata();
  }

  // Loads all the current basic user data
  async getUserdata() {
    await this.getUserInfo(this.vaultService.sessionState.session)
      .then(async (userdata) => {
        if (await userdata) {
          this.userdata = userdata;
          this.notificationSetting = this.userdata.fcm;
        } else { // no data received
          this.userProv.setToast("Unable to load userdata from server. Please try again later or contact our team at support@instavestcapital.com");
          this.userProv.exitToLoginPage();
        }
      })
      .then(
        async () => {
          await this.populateVariables();
        })
      .then(
        async () => { /*
            await this.initPushNotifications.then(async () => {
             
            });*/
        });
    return;
  }


  // utility function that handles the http request from the server
  async getUserInfo(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.userProv.getUserInfo(token).then(async (response: any) => {
        if (await response && response.success && response.data) {
          resolve(response.data);
          return;
        }
        resolve(false);
      }, err => {
        console.log("NO USER DATA RECEIVED. Returning. ");
        resolve(false);
      });
    });
  }


  async populateVariables() {
    this.user = this.userdata.general;
    this.bankingLoaded = this.userdata.BankingLoaded;
    this.banking = this.userdata.bank;
    // this.docs = { VerificationLevel: this.userdata.VerificationLevel, KYCLevel: this.userdata.KYCLevel };
    this.security = { fa2: this.userdata.fa2, ipaddress: this.userdata.ip };
    this.referral = this.userdata.referral;

    this.getLRList().then(async (data) => {
      if (data) {
        this.sectorList = await data;
      }
    })
      .then(async () => {
        await this.getKYCList().then(async (data) => {
          if (data) {
            this.kycList = await data;
          }
        });
      })
      .then(() => {
        this.primeSectorList().then(() => {
          this.showDocsLists = true;
          this.showDocsRequiredHeading = this.checkMoreDocsRequired();
          console.log('More docs required getList: ' + this.showDocsRequiredHeading);
        });
      });
  }

  // silent fetch - get both Sectorlist data
  async getLRList(): Promise<any> {

    /*
    * getLRList takes three additional params JurisdictionId (1=south africa), SectorId (13=Startups), Type (3=consumer LR requirements)
    */

    const jurisdictionId = 1; //JurisdictionId (1=south africa)
    const sectorId = 1; // SectorId (1=Startups) // 13 for DEV
    const lrType = 3; // 3=consumer LR requirements

    return this.userProv.getLRList('sectorlrlist', jurisdictionId, sectorId, lrType).then(async (data) => {

      return new Promise((resolve, reject) => {
        if (!data || (!data.success && data.code === '1000')) {
          this.userProv.exitToLoginPage();
          resolve(false);
        }

        if (data.data) {
          if (data.data.length > 0) {
            this.showDocsReceivedHeading = true;
          }
          resolve(data.data);
        } else { resolve(false); }

      });
    }, (data) => {
    });
  }

  // silent fetch - get both Sectorlist data
  async getKYCList(): Promise<any> {

    /*
    * getLRList takes three additional params JurisdictionId (1=south africa), SectorId (13=Startups), Type (3=consumer LR requirements)
    */

    return this.userProv.getKYCList('KYCList').then(async (data) => {

      return new Promise((resolve, reject) => {
        if (!data || (!data.success && data.code === '1000')) {
          this.userProv.exitToLoginPage();
          resolve(false);
        }

        if (data.data) {

          resolve(data.data);
        } else { resolve(false); }

      });
    }, (data) => {
    });
  }


  async primeSectorList(): Promise<boolean> {
    let v: string = null;

    return new Promise((resolve, reject) => {
      this.sectorList.forEach(async (element) => {
        element.uploaded = false;
        element.status = 'N';

        v = await this.checkKYCList(element.L_RID);

        if (v) {
          element.uploaded = true;
          element.status = v;
        }

      });

      resolve(true);
    });
  }

  // checks if this user has submitted docs for this legal and regulatory (L_R) requirement id
  checkKYCList(lrid: string): string {
    if (!this.kycList || !(this.kycList.length > 0) || !lrid) { return; }
    const BreakException = {};

    let v = "";
    try {
      this.kycList.forEach((element) => {

        if (element.L_RID === lrid) {
          v = element.Status;
          throw BreakException;

        }
      });
    } catch (e) {
      return v;
    }
    return null;
  }


  async openModal() {
    let helpScreen: any = null;
    let helpText = null;
    this.currentPage = 'home';
    console.log('currentPge', this.currentPage);

  }

  themeSwitch() {
    // unimplemented
  }


  ionViewWillEnter() {
    this.menuCtrl.enable(true, 'menu');
  }

}
