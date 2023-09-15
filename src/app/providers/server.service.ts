
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { VaultService } from '../providers/vault.service';
import { environment } from 'src/environments/environment';

const sessionKey = "sessionKey";

@Injectable({
  providedIn: 'root'
})
export class ServerService {


  baseUrl = environment.values.targetUrl;
  serverVersion = environment.values.apiVersion;
  network = environment.values.network; // 1 => TESTNET, 0 => MAINNET
  httpClient = null;

  constructor(
    httpService: HttpClient,
    private vaultService: VaultService
  ) {
    this.httpClient = httpService;
    this.baseUrl += "ver=" + this.serverVersion + "&iCd=";
  }

  public getGatewayPath() {
    return this.baseUrl;
  }

  public async getExternalData(url: string): Promise<any> {

    return new Promise((resolve, reject) => {

      this.processGetRequest(url).subscribe(
        data => {
          console.log("RESPONSE GET REQUEST SUCCESS");
          console.log(data);
          resolve(data);
        },
        err => {
          console.log("RESPONSE GET REQUEST FAILED");
          console.log(err);
          reject(false);
        }
      );

    });
  }

  /*
* @Returns BODY ONLY, JSON data
*/
processGetRequest(url): Observable<any> {
  return this.httpClient.get(url);
}


  public async doGetRequest(resource: string, token: string = null, params?: any): Promise<any> {

    if (!params) {
      params = {};
    }

    return new Promise((resolve, reject) => {

      this.processPostRequest(resource, token, params).subscribe(
        data => {
          if (!this.vaultService.sessionState.isEmpty && !this.vaultService.sessionState.isLocked) {
            resolve(data);
          } else {
            resolve(null);
          }
        },
        err => {
          reject(false);
        }
      );

    });
  }

  // post request takes params in JSON array list,
  public async doPostRequest(resource: string, token: string = null, params?: {}): Promise<any> {

    if (!params) {
      params = {};
    }

    return new Promise((resolve, reject) => {

      this.processPostRequest(resource, token, params).subscribe({
        next: (v) =>{
            resolve(v);
        },
        error: (err) => {
          resolve(false);
        },
        complete: () => {
          return;
        }
      });
    
    });

  }

  /*
* @Returns BODY ONLY, JSON data
*/
  processPostRequest(resource: string, token: string, params): Observable<any> {

   params.token = (token == null || !token) ? "" : token; // empty token allowed for username/email address registration

    let payload = this.createPostPayload(params);

    if (!payload) { payload = ""; }

    const options = {
      headers: new HttpHeaders()
        .set('Content-Type', 'application/x-www-form-urlencoded'),
      observe: 'body',
      responseType: 'json'
    };

    return this.httpClient.post(this.makeUrl(resource, token), payload, options);

  }


  makeUrl(resource: string, token: string) {

    return this.baseUrl + resource + "&iCn=" + this.network;
  }



  createPostPayload(data: any): string {
    if (!data) { return null; }

    let payload = "";

    for (const key in data) {
      payload += key + "=" + data[key];
      payload += "&";
    }

    return payload.substring(0, payload.length - 1);
  }

}
