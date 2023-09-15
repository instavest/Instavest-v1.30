import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MarketDetailPageRoutingModule } from './market-detail-routing.module';

import { MarketDetailPage } from './market-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MarketDetailPageRoutingModule
  ],
  declarations: [MarketDetailPage]
})
export class MarketDetailPageModule {}
