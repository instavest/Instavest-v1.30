import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule, NavParams } from '@ionic/angular';

import { AccountSettingsPageRoutingModule } from './account-settings-routing.module';

import { AccountSettingsPage } from './account-settings.page';
/*import { FileUploadModule } from 'ng2-file-upload';*/

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AccountSettingsPageRoutingModule
    /*FileUploadModule,*/
  ],
  declarations: [
    AccountSettingsPage,
    // NavParams
  ],
  
})
export class AccountSettingsPageModule {}
