import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VideoModalPageRoutingModule } from './video-modal-routing.module';

import { VideoModalPage } from './video-modal.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VideoModalPageRoutingModule
  ],
  declarations: [VideoModalPage]
})
export class VideoModalPageModule {}
