import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: "",
    loadChildren: () =>
      import("./auth/auth.module").then((m) => m.AuthPageModule),
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'investment-detail-one',
    loadChildren: () => import('./investment-detail-one/investment-detail-one.module').then(m => m.InvestmentDetailOnePageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'account-settings',
    loadChildren: () => import('./account-settings/account-settings.module').then(m => m.AccountSettingsPageModule)
  },
  {
    path: 'market',
    loadChildren: () => import('./market/market.module').then(m => m.MarketPageModule)
  },
  {
    path: 'market-detail',
    loadChildren: () => import('./market-detail/market-detail.module').then(m => m.MarketDetailPageModule)
  },
  {
    path: 'wallet',
    loadChildren: () => import('./wallet/wallet.module').then(m => m.WalletPageModule)
  },
  {
    path: 'deposit-money',
    loadChildren: () => import('./deposit-money/deposit-money.module').then(m => m.DepositMoneyPageModule)
  },
  {
    path: 'supportmsglist',
    loadChildren: () => import('./supportmsglist/supportmsglist.module').then(m => m.SupportmsglistPageModule)
  },
  {
    path: 'chat-detail',
    loadChildren: () => import('./chat/chat.module').then(m => m.ChatPageModule)
  },
  {
    path: 'negotiation-popup',
    loadChildren: () => import('./negotiation-popup/negotiation-popup.module').then(m => m.NegotiationPopupPageModule)
  },
  {
    path: 'transfer-funds',
    loadChildren: () => import('./transfer-funds/transfer-funds.module').then(m => m.TransferFundsPageModule)
  },
  {
    path: 'about',
    loadChildren: () => import('./about/about.module').then(m => m.AboutPageModule)
  },
  {
    path: 'video-modal',
    loadChildren: () => import('./video-modal/video-modal.module').then(m => m.VideoModalPageModule)
  },
  {
    path: 'kyc',
    loadChildren: () => import('./kyc/kyc.module').then(m => m.KycPageModule)
  },
  {
    path: 'refer',
    loadChildren: () => import('./refer/refer.module').then(m => m.ReferPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
