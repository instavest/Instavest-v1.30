import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';

@Component({
  selector: 'app-refer',
  templateUrl: './refer.page.html',
  styleUrls: ['./refer.page.scss'],
})
export class ReferPage implements OnInit {

  referralCode: any = null;

  constructor(
    public router: Router) { }

  ngOnInit() {
    Preferences.get({ key: 'refCode' }).then(async (code) => {
      this.referralCode = await code.value;
    }, err => {
      this.referralCode = "--";
    });
  }
}
