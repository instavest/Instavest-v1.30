import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { InvestmentDetailOnePageRoutingModule } from './investment-detail-one-routing.module';
import { InvestmentDetailOnePage } from './investment-detail-one.page';
import { ComponentsModule } from '../../components/components.module';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    InvestmentDetailOnePageRoutingModule,
    ComponentsModule,
  ],
  declarations: [
    InvestmentDetailOnePage,
  ],
  providers: [
  ]
})
export class InvestmentDetailOnePageModule { }
