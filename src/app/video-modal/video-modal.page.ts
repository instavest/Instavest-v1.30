import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ModalController, Platform } from '@ionic/angular';

@Component({
  selector: 'app-video-modal',
  templateUrl: './video-modal.page.html',
  styleUrls: ['./video-modal.page.scss'],
})
export class VideoModalPage implements OnInit {

  @Input("poster") poster: string;
  @Input("url") url: string;

  screenWidth = 360;
  safeUrl = null;

  constructor(public modalController: ModalController, public sanitizer: DomSanitizer, public platform: Platform) {
    
  }

  getUrl(){
     return this.url;
    //return this.sanitizer.(this.url);
   }

  dismiss(){
    this.modalController.dismiss();
  }

  ngOnInit() {
    this.screenWidth = parseInt(""+this.platform.width);
    console.log(this.url);
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.url);
    console.log(this.safeUrl);
  }

}
