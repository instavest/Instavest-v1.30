import { Component, ViewChild } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { MenuController, NavController, IonFab, Platform, ActionSheetController } from '@ionic/angular';
import { Share, ShareOptions, CanShareResult } from '@capacitor/share';
import { UserService } from '../providers/user.service';
import { Browser } from '@capacitor/browser'
import { environment } from 'src/environments/environment';

type socialApps = Array<{ name: string, icon: string, ios_url_scheme: string, android_url_scheme: string, installed: boolean }>;

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
})
export class AboutPage {
  @ViewChild('fab') fab: IonFab;

  buildVersion = environment.values.buildVersion;
  releaseVersion = environment.values.releaseVersion;
  blockchain = environment.values.network;
  network = 'Testnet'; // Default - set by primeObjects()

  sending: string = null;
  url: string = null;
  useWeb = false;

  socialCanShare = false;

  constructor(
    public router: Router,
    public platform: Platform,
    public menu: MenuController,
    public user: UserService,
    public actionSheet: ActionSheetController
  ) {
    this.platform.ready().then(() => {
      this.primeObjects();

      const result: CanShareResult = null;

      Share.canShare().then(result => {
        this.socialCanShare = result.value;
      }, err => {
        this.socialCanShare = false;
      });
    });
  }

  getURIScheme(id): string {

    return "";
   // return this.platform.is("android") ? this.socialApps[id].android_url_scheme : this.socialApps[id].ios_url_scheme;
  }

  async primeObjects() {

    this.network = (this.blockchain === 0) ? 'Mainnet' : 'Testnet';

  }




  async shareToSocial(appName: string) {

    if (!this.socialCanShare) return;


    const options: ShareOptions = {

      title: 'Instavest Rare Asset Investment', // not supported on some apps (Facebook, Instagram)
      text: 'Check this out!', // fi. for email
      url: 'https://instavestcapital.com/',
      dialogTitle: "Sharing Instavest"
    };

    await Share.share(options).then((success) => {
      this.user.setToast("Thank you for sharing Instavest :-)");
      return;
    },
      (err) => {
        return;
      });
  }

  async launchExternalWebsite(option: string) {
    let url = "https://instavestcapital.com";

    switch (option) {
      case "terms-of-use":
        url = "https://instavestcapital.com/legal/terms.html";
        break;
      case "privacy-policy":
        url = "https://instavestcapital.com/legal/privacy.html";
        break;
      case "visit-azuza":
        url = "https://instavestcapital.com/";
        break;
    }
    if (url) {
      await Browser.open({ url });
    }
    return;
  }

  getTopicDetail(selTopic: string) {
    switch (selTopic) {
      case "raise-capital":
        return {
          topicId: 11,
          heading: "Instavest Listings",
          text: "Need capital to fund high growth in your eco-friendly startup in the green or sustainable technology space? Speak to us about raising capital on Instavest."
        };
        break;
      case "azuza-bib":
        return {
          topicId: 10,
          heading: "Fraxeum Sales",
          text: "Got a great idea for a fractional investment product - or want to start Azuza in a different region? Speak to Fraxeum sales for information."
        }; // fraxeum sales
        break;
      case "get-info":
        return {
          topicId: 9,
          heading: "Request Information",
          text: "Connect with us! We're here to help."
        }; // general
        break;
      case "invest":
        return {
          topicId: 9,
          heading: "Investor enquiries",
          text: "Join us on the forefront of the global financial evolution!"
        }; // general
        break;
    }
  }

  callme(topicString: string) {
    const navigationExtras: NavigationExtras = {
      queryParams: {
        topic: this.getTopicDetail(topicString)
      }
    };
    this.router.navigate(["supportmsglist"], navigationExtras);
  }

}
