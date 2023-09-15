import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MarketDetailPage } from './market-detail.page';

const routes: Routes = [
  {
    path: '',
    component: MarketDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MarketDetailPageRoutingModule {}
