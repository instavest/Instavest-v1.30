import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InvestmentDetailOnePage } from './investment-detail-one.page';

const routes: Routes = [
  {
    path: '',
    component: InvestmentDetailOnePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InvestmentDetailOnePageRoutingModule {}
