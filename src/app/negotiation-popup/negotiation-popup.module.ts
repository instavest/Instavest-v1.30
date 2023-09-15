import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NegotiationPopupPageRoutingModule } from './negotiation-popup-routing.module';

import { NegotiationPopupPage } from './negotiation-popup.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NegotiationPopupPageRoutingModule
  ],
  declarations: [NegotiationPopupPage]
})
export class NegotiationPopupPageModule {}
