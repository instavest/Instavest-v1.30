import { APP_INITIALIZER, enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { VaultService } from './app/providers/vault.service';


  const appInitFactory = 
(vaultService: VaultService): (() => Promise<void>) =>
  () =>  vaultService.initVaults(); 

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule, {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: appInitFactory,
      deps: [VaultService],
      multi: true,
    }
  ],
}) 
  .catch(err => {
    console.log(err)});
