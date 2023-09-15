import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VideoModalPage } from './video-modal.page';

const routes: Routes = [
  {
    path: '',
    component: VideoModalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VideoModalPageRoutingModule {}
