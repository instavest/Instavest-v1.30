import { Component } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';

@Component({
  selector: 'app-market-detail',
  templateUrl: './market-detail.page.html',
  styleUrls: ['./market-detail.page.scss'],
})
export class MarketDetailPage{

  constructor(public actionSheetController: ActionSheetController) { }

  async presentActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Options',
      cssClass: 'action-sheet-bg',
      buttons: [{
        text: 'Buy (R 0.15)',
        role: 'destructive',
        handler: () => {
          console.log('Delete clicked');
        }
      }, {
        text: 'Negotiate',
        handler: () => {
          console.log('Share clicked');
        }
      }, {
        text: 'Cancel offer',
        handler: () => {
          console.log('Play clicked');
        }
      }, {
        text: 'View company',
        handler: () => {
          console.log('Play clicked');
        }
      }
      , {
        text: 'Dismiss',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      }]
    });
    await actionSheet.present();
  }

}
