import { Component } from '@angular/core';
import { VaultService } from './providers/vault.service';
import { AlertController, MenuController, Platform } from '@ionic/angular';
import { SplashScreen } from '@capacitor/splash-screen';
import { Router } from '@angular/router';
import { UserService } from './providers/user.service';
import { PushNotifications, PermissionStatus } from '@capacitor/push-notifications';
import { Preferences, SetOptions } from '@capacitor/preferences';
import { register } from 'swiper/element/bundle';

const sessionKey = "sessionKey";

register(); // Registers the Swiper component used throughout the app

export interface MenuItem {
  title: string;
  component: any;
  icon: string;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})

export class AppComponent {
  nextPage = 'auth';
  showInitial = false;

  public selectedIndex = 0;

  intervalId: any;

  userdata: null;

  constructor(
    public platform: Platform,
    private vaultService: VaultService,
    public router: Router,
    public menu: MenuController,
    public user: UserService,
    public alertController: AlertController
  ) {
    this.startApp();
    this.platform.ready().then(async () => {
      await SplashScreen.show({
        showDuration: 3000,
        autoHide: true,
      });
    })
  }

  async startApp() {
    // init app once platform is ready and storage is ready.
        this.menu.enable(false, "main");
        
        await this.initializeApp();
        await this.initPushNotifications();
    return;
  }

  // init push notifications
  setupPushNotifications(): Promise<boolean> {
    return new Promise((resolve, reject) => {

      // Need to implement next
      
    });
  }

  setTheme() {
   return;
  }

  // checks if this user is logged in with active session
  async checkUserLoginState(): Promise<boolean> {

    return new Promise((resolve, reject) => {

      /* auto login is no longer possible as it poses a potential security risk */

      resolve(false);
      return;
      
    });
  }

  /* Sets up Capacitor's built-in push notification services */
  async initPushNotifications() {

    const addListeners = async () => {
      await PushNotifications.addListener('registration', token => {
        // send push notification token to server
        
      });
    
      await PushNotifications.addListener('registrationError', err => {
        console.error('Registration error: ', err.error);
      });
    
      await PushNotifications.addListener('pushNotificationReceived', notification => {
        console.log('Push notification received: ', notification);
      });
    
      await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
        console.log('Push notification action performed', notification.actionId, notification.inputValue);
      });
    }
   
    const registerNotifications = async () => {
      let permStatus = await PushNotifications.checkPermissions();
      if(permStatus.receive == 'granted'){
        await Preferences.set({key: "pnPermission", value: "granted"});
        this.user.bioMetriclogin
        return;
      }
    
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
    
      if (permStatus.receive !== 'granted') {
        await Preferences.set({key: "pnPermission", value: "denied"});
        // update server
        return;
      }
    
      await PushNotifications.register();
    }
    
    const getDeliveredNotifications = async () => {
      const notificationList = await PushNotifications.getDeliveredNotifications();
      console.log('delivered notifications', notificationList);
    }

  }

  async checkTokenState(token: string): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      this.user.checkToken().then(async (response: any) => {
        if (await response) {
          resolve(true);
          return;
        } else {
          resolve(false);
          return;
        }
      }, (response: any) => {
        resolve(false);
      });
    });
  }

  async logout() {
    this.menu.close();
    this.reAuth(null, false);
  }


  async initializeApp() {
    this.nextPage = "auth";
    return;
  }

  showExitConfirm() {
    this.alertController.create({
      header: 'Confirm Close',
      message: 'You are about to close this app, press "Close" to continue',
      backdropDismiss: false,
      buttons: [{
        text: 'Stay',
        role: 'cancel',
        handler: () => {
        }
      }, {
        text: 'Close',
        handler: () => {
          navigator['app'].exitApp();
        }
      }]
    })
      .then(alert => {
        alert.present();
      });
  }


  public async reAuth(message?: string, hideMessage?: boolean) {
    const msg = message ? message : null;
    const show = !hideMessage ? true : false;

    this.menu.enable(false, 'main');
    clearInterval(this.intervalId);
    this.user.exitToLoginPage(msg, show);
  }

  public setIntervalSessionCheck() {
    this.intervalId = setInterval(() => {
      if (this.vaultService.sessionState.session) {
        this.checkUserLoginState().then((valid) => {
          if (valid) {
            return true;
          } else {
            this.user.setToast("Your connection to our servers timed out. Please log in again.");
            this.reAuth();
          }
        });
      }
    }, 60000); // refreshes every 60 seconds
    return;
  }


  openDepositPage() {
    this.menu.enable(false, 'main');
    this.router.navigate(['deposit-money']);
    this.menu.enable(true, 'main');
  }

  openHomePage() {
    this.menu.enable(false, 'main');
    this.router.navigate(['home']);
    this.menu.enable(true, 'main');
  }

  openOTCMarketPlace() {
    this.menu.enable(false, 'main');
    this.router.navigate(['market']);
    this.menu.enable(true, 'main');
  }

  openTransactionHistory() {
    this.menu.enable(false, 'main');
    this.router.navigate(['wallet']);
    this.menu.enable(true, 'main');
  }

  openAccountSetting() {
    this.menu.enable(false, 'main');
    this.router.navigate(['account-settings']);
    this.menu.enable(true, 'main');
  }

  openTransferFunds() {
    this.menu.enable(false, 'main');
    this.router.navigate(['transfer-funds']);
    this.menu.enable(true, 'main');
  }

  openSupport() {
    this.menu.enable(false, 'main');
    this.router.navigate(['supportmsglist']);
    this.menu.enable(true, 'main');
  }

  openReward() {
    this.menu.enable(false, 'main');
    this.router.navigate(['refer']);
    this.menu.enable(true, 'main');
  }

  openAboutPage() {
    this.menu.enable(false, 'main');
    this.router.navigate(['about']);
    this.menu.enable(true, 'main');
  }

}
