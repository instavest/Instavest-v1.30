import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TransferFundsPageRoutingModule } from './transfer-funds-routing.module';
import { TransferFundsPage } from './transfer-funds.page';
import { FormsModule } from '@angular/forms'

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    TransferFundsPageRoutingModule,
    FormsModule
  ],
  declarations: [TransferFundsPage]
})
export class TransferFundsPageModule {}
