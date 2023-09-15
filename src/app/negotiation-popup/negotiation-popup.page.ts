import { Component, Input, ViewContainerRef, ViewChild } from '@angular/core';
import { ActionSheetController, AlertController, ModalController, NavController, NavParams, IonFab } from '@ionic/angular';
import { UserService } from '../providers/user.service';

@Component({
  selector: 'app-negotiation-popup',
  templateUrl: './negotiation-popup.page.html',
  styleUrls: ['./negotiation-popup.page.scss'],
})
export class NegotiationPopupPage {

  @Input() data: any;
  @ViewChild('fab') fab: IonFab;

   showCounterField: boolean;
   counterOfferAmount: number;
   actionSheet: any;

  constructor(public user: UserService,
              public alertController: AlertController,
              public actionSheetCtrl: ActionSheetController,
              public viewCtrl: ModalController,
              public navCtrl: NavController,
              public navParams: NavParams) {

    this.data = navParams.get('data');
    this.showCounterField = false;
    console.log('this is popup data');
    console.log(this.data);
  }

   formatPrice(num: string) {
    if (isNaN(Number(num))) { return null; }

    if (num > this.data.price) {
      return false;
    }

    return (Number(num)).toFixed(2);
  }

   showActionSheet() {

    let version = 2; // this is my sales-offer so I am seller

    if (this.data.whoami === 'B') {
      version = 1; // this is buyer
    }


    console.log('This is POPUP version: ' + version);

    switch (version) {

      case 1: {
        this.showBuyerActionSheet();
        break;
      }

      case 2: {
        this.showSellerActionSheet();
        break;
      }

    }
  }

   convertDate(dateStr) {
    return Date.parse(dateStr);
  }

   async showBuyerActionSheet() {

    this.actionSheet = this.createActionSheet();

    console.log(this.data.Counter[0]);
    console.log(this.data.Counter[0].Price);

    if (this.data.lastbidder !== this.data.whoami) {

      const accept_button = {
        text: 'Buy (R' + this.formatPrice(this.data.Counter[0].Price) + '/share)',
        handler: () => {
          this.acceptOffer();
          return;
        }
      };
      this.actionSheet.buttons.splice(0, 0, accept_button);
      const negotiate_button = {
        text: 'Set counter offer',
        handler: () => {
          this.showCounterForm();
          return;
        }
      };
      // this.actionSheet.buttons.splice(1, 0, negotiate_button);

      const reject_button = {
        text: 'Cancel deal',
        handler: () => {
          this.confirmCancelOffer();
          return;
        }
      };
      // this.actionSheet.buttons.splice(2, 0, reject_button);

    }

    if (this.data.lastbidder === this.data.whoami) {

      const cancel_button = {
        text: 'Cancel deal',
        handler: () => {
          setTimeout(() => {
            this.confirmCancelOffer();
          }, 500);

          return;
        }
      };
      // this.actionSheet.buttons.splice(0, 0, cancel_button);

    }

    await this.actionSheet.present();

  }

   async showSellerActionSheet() {

    this.actionSheet = this.createActionSheet();

    console.log(this.data);

    if (this.data.lastbidder !== this.data.whoami) {

      const accept_button = {
        text: 'Sell (R' + this.formatPrice(this.data.price) + '/share)',
        handler: () => {
          const data = {
            action: 'acceptbid',
            amount: this.counterOfferAmount
          };

          this.viewCtrl.dismiss(data);
        }
      };
      this.actionSheet.buttons.splice(0, 0, accept_button);

      const negotiate_button = {
        text: 'Set counter offer',
        handler: () => {
          this.showCounterForm();
          return;
        }
      };

      this.actionSheet.buttons.splice(1, 0, negotiate_button);

      const reject_button = {
        text: 'Cancel deal',
        handler: () => {
          this.confirmCancelOffer();
          return;
        }
      };
      this.actionSheet.buttons.splice(2, 0, reject_button);

    }

    if (this.data.lastbidder === this.data.whoami) {

      const cancel_button = {
        text: 'Cancel this deal',
        handler: () => {

          return;
        }
      };

      this.actionSheet.buttons.splice(0, 0, cancel_button);

    }

    await this.actionSheet.present();

  }


   async createActionSheet() {
    return await this.actionSheetCtrl.create({
      header: 'Options',
      buttons: [
        {
          text: 'Close room',
          handler: () => {
            this.back();
            return;
          }
        },
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });
  }

   async confirmSellerAcceptBuyerOffer() {
    // buyer buying shares at the price specified

    const p = this.formatPrice(this.data.price);
    const price = 0;
    let fees = 0;

    if (p) {
      fees = parseFloat(p) * 0.025;
      if (fees > 50) {
        fees = 50;
      }
    }

    const feesStr = fees.toFixed(2);

    const alert = await this.alertController.create({
      header: 'Confirmation',
      cssClass: 'custom-alert',
      subHeader: 'Selling shares',
      message: 'You are selling ' + this.data.amount + ' '
        + this.data.Name + ' shares at R' + this.formatPrice(this.data.price)
        + ' a share for a total of R' + this.data.price + '. Total transaction fees: R' + feesStr + '<br/><br/>Press <span class="darkblue">Sell now</span> to confirm.',

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
            const data = {};
            this.viewCtrl.dismiss({ action: 'acceptbid' });

            return true;
          }
        }
      ]
    });

    await alert.present();

  }

  async confirmCounterOffer() {

    if (!this.counterOfferAmount || this.counterOfferAmount < 0) {
      this.user.setToast('Your counter offer amount is invalid.');
      return false;
    }

    const amount = new Intl.NumberFormat('en-us', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(this.counterOfferAmount);


    const alert = await this.alertController.create({
      header: 'Confirm',
      cssClass: 'custom-alert',
      subHeader: 'Counter offer',
      message: 'You are about to submit a counter offer of R' + amount + '.',
      buttons: [
        {
          text: 'Close',
          handler: data => {
            return true;
          }
        },
        {
          text: 'Continue',
          handler: data => {
            this.setCounterOffer();
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

   async showCounterForm() {

    const amount = new Intl.NumberFormat('en-us', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(this.data.price);

    const alert = await this.alertController.create({
      header: 'Create counter offer',
      cssClass: 'custom-alert',
      subHeader: '',
      message: 'Enter the new price per share in the line below and then select <span class="darkblue">Next</span> to continue.',
      inputs: [
        {
          name: 'Price per share',
          placeholder: this.data.price // asking price as opposed to last price
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
            console.log(data);
            let offerPrice = data['Price per share'];
            if (!offerPrice) {
              this.user.setToast('Counter offer price cannot be empty');
              return;
            }
            offerPrice = this.formatPrice(offerPrice);

            this.viewCtrl.dismiss({ action: 'counteroffer', price: data['Price per share'], amount: this.data.amount });

          }
        }
      ]
    });

    await alert.present();

  }
  async confirmCancelOffer() {

    const alert = await this.alertController.create({
      header: 'Cancel deal',
      cssClass: 'custom-alert',
      message: 'You are about to withdraw from this negotiation. Select <span class="darkblue"><b>Withdraw</span></b> to confirm.',
      buttons: [
        {
          text: 'Close',
          handler: data => {
            return true;
          }
        },
        {
          text: 'Withdraw',
          handler: data => {
            this.cancelOffer();
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

   back() {
     console.log("clicked");
    if (this.fab) { this.fab.close(); }
    this.navCtrl.pop();
  }

  dismissModal(){
    this.viewCtrl.dismiss();
  }

   acceptOffer() {
    console.log('accepting offer');
    const data = { action: 'acceptbid', price: 0, amount: 0 };
    this.viewCtrl.dismiss(data);
  }

   rejectOffer() {
    console.log('rejecting offer');
    const data = { action: 'reject', price: 0, amount: 0 };
    this.viewCtrl.dismiss(data);
  }

   cancelOffer() {

    console.log('cancelling offer');
    const data = { action: 'cancelbid', price: null, amount: null };
    this.viewCtrl.dismiss(data);
  }

   setCounterOffer() {

    console.log('counteroffer: ' + this.counterOfferAmount);

    this.showCounterForm();

    console.log('setting counter offer');
    const data = {
      action: 'counter',
      price: this.counterOfferAmount,
      amount: this.data.amount
    };

    this.viewCtrl.dismiss(data);
  }

  // confirm messages

   confirmAction(action: string) {
    switch (action) {
      case 'cancel':

    }
  }




  ionViewDidLoad() {
    console.log('ionViewDidLoad OtcNegotiationPopupPage');
  }

}


