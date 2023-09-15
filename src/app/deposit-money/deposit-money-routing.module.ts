import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DepositMoneyPage } from './deposit-money.page';

const routes: Routes = [
  {
    path: '',
    component: DepositMoneyPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DepositMoneyPageRoutingModule {}