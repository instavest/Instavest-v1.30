import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SharedBuyWizardComponent } from './shared-buy-wizard/shared-buy-wizard.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ],
  declarations: [
    SharedBuyWizardComponent
  ],
  providers : [
    
  ],
  exports : [
    SharedBuyWizardComponent
  ]
})
export class ComponentsModule {}
