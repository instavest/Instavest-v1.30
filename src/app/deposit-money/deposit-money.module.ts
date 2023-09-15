import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DepositMoneyPageRoutingModule } from './deposit-money-routing.module';
import { DepositMoneyPage } from './deposit-money.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DepositMoneyPageRoutingModule
  ],
  declarations: [DepositMoneyPage]
})
export class DepositMoneyPageModule {}
