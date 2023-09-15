import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NegotiationPopupPage } from './negotiation-popup.page';

const routes: Routes = [
  {
    path: '',
    component: NegotiationPopupPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NegotiationPopupPageRoutingModule {}
