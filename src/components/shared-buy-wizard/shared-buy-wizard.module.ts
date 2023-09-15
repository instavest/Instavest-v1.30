import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { SharedBuyWizardComponent } from './shared-buy-wizard.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
  ],
  declarations: [
      SharedBuyWizardComponent
  ]
})

export class SharedBuyWizardModule {}
