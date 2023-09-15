import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SupportmsglistPageRoutingModule } from './supportmsglist-routing.module';

import { SupportmsglistPage } from './supportmsglist.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SupportmsglistPageRoutingModule
  ],
  declarations: [SupportmsglistPage]
})
export class SupportmsglistPageModule {}
