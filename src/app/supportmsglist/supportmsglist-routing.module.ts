import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SupportmsglistPage } from './supportmsglist.page';

const routes: Routes = [
  {
    path: '',
    component: SupportmsglistPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SupportmsglistPageRoutingModule {}
