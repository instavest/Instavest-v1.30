import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../providers/user.service';
import { ActionSheetController } from '@ionic/angular';
import { Preferences } from '@capacitor/preferences';

type KYCDocsItem = { lrid: string, uploaded: boolean, state: string };
type KYCDocs = Array<KYCDocsItem>;
type KYCDetails = { KYCComplete: boolean, KYCRequired: boolean, KYCMsg: string, KYCDocs: KYCDocs };
type KYCItem = { name: string, lrid: string, b64img: string }; // data structure that holds the photo data
type KYCDocItems = Array<KYCItem>;
type KYCStepItem = { page: string };
type KYCSteps = Array<KYCStepItem>;

@Component({
  selector: 'app-kyc',
  templateUrl: './kyc.page.html',
  styleUrls: ['./kyc.page.scss'],
})

export class KycPage implements OnInit {

  pageLogo = 'small-logo';

  photoB64Str: string = null;

  errMsg = null;

  idCardProgress = -1; // 0 front image, 1 back image

  kycSteps: KYCSteps = null;
  kycDetails: KYCDetails = null;
  kycDocItems: KYCDocItems = null;
  kycDocs: KYCDocs = null;

  allRequiredDocsUploaded = false;
  showUploadSpinner = false;

  selectedItemId = 0; // kycDocs[] id selected from button list
  selectedType = 'ID-book'; // the array pos in the KYCDocItems[] that the seleectedItemId corresponseonds to

  currentPage = 'FICA-main';
  uploadStatus = false;
  idStepSet = false; // indicates if we've already added a step for proof of ID

  constructor(
    public user: UserService,
    public actionSheetController: ActionSheetController,
    public route: ActivatedRoute,
    public router: Router,
    public changeDetectorRef: ChangeDetectorRef
  ) {


    this.primeVariables();
  }


  resetPhoto() {
    this.takePic();
  }

  resetVars() {
    this.idStepSet = false;
    this.kycSteps = [];
    this.uploadStatus = false;
    this.photoB64Str = null;

  }


  restart() {
    this.uploadStatus = false;
    this.primeVariables();
    this.currentPage = "FICA-main";
  }

  navigate(page: string) {
    switch (page) {
      case 'FICA-main':
        this.currentPage = "FICA-main";
        this.selectedItemId = 0;
        this.selectedType = null;
        break;
      case 'ID-options':
        this.idCardProgress = -1; // reset in case of return
        this.currentPage = page + "-page";
        this.selectedItemId = 0;
        this.selectedType = null;
        break;
      case 'ID-book':
        console.log(page);
        this.currentPage = page + "-page";
        this.selectedItemId = 0;
        this.selectedType = page;
        break;
      case 'Passport':
        console.log(page);
        this.currentPage = page + "-page";
        this.selectedItemId = 0;
        this.selectedType = page;
        break;
      case 'ID-card':
        this.idCardProgress++; // started at -1. Sets to 0 for front, 1 for back
        this.currentPage = page + "-page-" + (this.idCardProgress + 1);
        this.selectedItemId = this.idCardProgress;
        this.selectedType = page;
        break;
      case 'PoA':
        this.currentPage = page + "-page";
        this.selectedItemId = 2;
        this.selectedType = page;
        break;
      case 'Selfie':
        console.log(page);
        this.currentPage = page + "-page";
        this.selectedItemId = 3;
        this.selectedType = page;
        break;
      case 'Bank':
        console.log(page);
        this.currentPage = page + "-page";
        this.selectedItemId = 4;
        this.selectedType = page;
        break;
      case 'takePhoto':
        this.takePic();
        break;
      case 'upload':
        this.showUploadSpinner = true;
        this.uploadPhoto();
        break;
      case 'Review':
        this.currentPage = page + '-page';
        break;
      case 'upload-success':
        this.photoB64Str = null;
        if (this.selectedType === 'ID-card' && this.idCardProgress === 0) { // manage ID card 
          this.idCardProgress++;
          this.currentPage = "ID-card-page-" + (this.idCardProgress + 1);
          return;
        }
        // all other selectedTypes go here
        this.kycDocs[this.selectedItemId].state = 'N';
        this.checkAllDone().then((finished) => {
          if (!finished) {
            this.currentPage = 'FICA-main';
            this.changeDetectorRef.detectChanges();
            return;
          }
          this.router.navigate(['home']);
          this.user.setPermaToast("All done! The Azuza system will review your documents and revert shortly.");
        });
        break;
      case 'upload-failed':
        this.photoB64Str = null;
        this.user.setToast("Something went wrong in the upload process. Please start again.");

        if (this.selectedType === 'ID-card') { // manage ID card
          if (this.idCardProgress === 0) {
            this.currentPage = 'ID-card-page-1';
          } else {
            setTimeout(() => {
              this.currentPage = 'ID-card-page-2';
            }, 250);
          }
          return;
        }
        // all other types
        this.navigate(this.selectedType);
        return;

        break;
    }
  }

  checkAllDone(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.kycDocs.forEach(element => {
        console.log(element);
        if (element.state === 'X' || element.state === 'R' || element.state === '') {
          console.log("out on:");
          console.log(element);
          resolve(false);
          return;
        }
      });
      resolve(true);
    });
  }

  async primeVariables() {
    this.idStepSet = false;
    this.idCardProgress = -1;
    this.kycSteps = [];
    // load kyc document structure from storage
    this.kycDocItems = [{ name: "Proof of ID", lrid: "41", b64img: "" },
    { name: "Proof of ID (Card back)", lrid: "42", b64img: "" },
    { name: "Proof of Address", lrid: "43", b64img: "" },
    { name: "Proof of Life", lrid: "44", b64img: "" },
    { name: "Proof of bank account", lrid: "45", b64img: "" }]; // KYC Items for this country // KYC Items for this client=>usertype in this jurisdiction=>sector

    return;
  }

  // Custom labels, different from server labels
  getKYCItemLabelFromId(lrid) {
    switch (lrid) {
      case '41': { return "SA ID / ID Card / Passport"; }
      case '43': { return "Proof of address"; }
      case '44': { return "Selfie"; }
      case '45': { return "Proof of bank account"; }
    }
  }

  // returns a name for each of the photo types used to set camera source and orientation
  getKYCItemCode(lrid: string): string {
    switch (lrid) {
      case '41': { return "ID"; }
      case '42': { return "IDB"; }
      case '43': { return "PoA"; }
      case '44': { return "Selfie"; }
      case '45': { return "Bank"; }
    }
  }

  async takePic() {
    const type = this.getKYCItemCode(this.kycDocItems[this.selectedItemId].lrid);
    await this.selectImage(type);
  }

  // Photo code for KYC
  async selectImage(type: any) {
    const buttons = [{
      text: 'Take new photo',
      handler: () => {
        // take picture and upload
        if (type === 'Selfie') {
          this.getImage(type, 1/*CAMERA*/, 1/*FRONT*/);
        } else {
          this.getImage(type, 1/*CAMERA*/, 0/*REAR*/);
        }
      }
    },
    {
      text: 'Cancel',
      role: 'cancel',
    }];

    if (type !== 'Selfie') {
      buttons.push({
        text: 'Select from gallery',
        handler: () => {
          // take picture and upload
          this.getImage(type, 0/*LIBRARY*/, 0/*REAR*/);
        }
      });
    }

    const actionSheet = await this.actionSheetController.create({
      header: "Choose photo source",
      buttons,
      mode: "ios",
      cssClass: 'action-sheet-bg'
    });

    await actionSheet.present();
  }

  async uploadPhoto() {

    await this.user.processUpload(this.photoB64Str, this.kycDocItems[this.selectedItemId].lrid, this.kycDocItems[this.selectedItemId].name)
      .then(
        async (response) => {
          if (!response) {
            this.resetPhoto();
            this.user.setToast("Network failure. Please check your Internet connection and try again.");
            return;
          }

          if (await response === true) {
            this.uploadStatus = true;
            this.navigate("upload-success");
            return;
          }

          this.navigate("upload-failed");
          this.uploadStatus = false;
          if (response.message) {
            this.errMsg = response.message;
            return;
          }
          return;
        },
        err => {
          if (!err) {
            this.navigate("upload-failed");
            this.user.setToast("Network failure. Please check your Internet connection and try again.");
            return;
          }
        }).finally(() => {
          this.showUploadSpinner = false;
        });
  }

  async getImage(type: any, source: number, camOrientation: number): Promise<any> {

    return new Promise((resolve, reject) => {

      this.user.takePicture().then(async (photo) => {
        if (await photo) {

          this.photoB64Str = "data:image/jpeg;base64," + await photo;
          this.navigate("Review");
          resolve(true);
          return;
        }

        resolve(false);
        return;
      }, error => {
        const message = "Camera error. Please try again or contact Bmoney support for help.";
        this.user.setToast(error.message ? error.message : message);
        resolve(false);
        return;
      });

    });

  }


  goHome() {
    this.router.navigate(['home']);
    this.resetVars();
    this.primeVariables();
  }


  ngOnInit() {
    Preferences.get({ key: "kyc" }).then(
      (result) => {
        if (result) {
          console.log(result);
          let x: any = result.value
          this.kycDocs = x; // check Preferences
        } else {
          this.kycDocs = [];
        }
        Preferences.remove({ key: "kyc" });
      });
  }
}
