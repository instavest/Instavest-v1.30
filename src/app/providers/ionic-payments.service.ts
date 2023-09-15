import { Injectable } from '@angular/core';
import { ApplePay, ApplePayMerchantCapability, ApplePaySummaryItem, ApplePayRequest, ApplePaySupportedNetwork } from '@ionic-enterprise/apple-pay';
import { GooglePay, GooglePayVersion, GooglePayPaymentMethod, GooglePayRequest, GooglePayAllowedAuthMethod, GooglePayAllowedNetwork, GooglePayMakePaymentRequestResponse, GooglePayEnvironment, GooglePayPaymentRequest, GooglePayPaymentMethodData } from '@ionic-enterprise/google-pay';
import { environment } from 'src/environments/environment';

type PaymentResult = { status: string, success: boolean, message: string };


const paymentsMinDepositAmount = environment.values.paymentsMinDepositAmount;

@Injectable({
  providedIn: 'root'
})
export class IonicPaymentsService {

  /* Apple Pay Vars */
  canDoApplePay = false;
  private applePayRequest: ApplePayRequest = null;

  /* Google Pay Vars */
  canDoGooglePay = false;
  private allowPaymentMethods: GooglePayPaymentMethod[] = null;
  private googlePayVersion: GooglePayVersion = {
    apiVersion: 2,
    apiVersionMinor: 0
  };

  constructor() {
    this.initPaymentMethods(); // sets up ApplePay and GooglePay
  }

  getPaymentEnvironment(provider: string){
    switch (provider){
      case 'GooglePay':
        return environment.production ? GooglePayEnvironment.PRODUCTION : GooglePayEnvironment.TEST; 
        break;
      case 'ApplePay':
          // TO BE IMPLEMENTED
          break;
    }
  }

  async initPaymentMethods() {
    // initialise GooglePay 
    this.initGooglePayRequest();

    const { isReady } = await GooglePay.initGooglePayClient({
      environment: this.getPaymentEnvironment("GooglePay"),
      version: this.googlePayVersion
    });

    // Checking GooglePay capabilities and initialise
    await GooglePay.canMakePayments({
      allowedPaymentMethods: this.allowPaymentMethods,
    }).then((result)=>{
      this.canDoGooglePay = result.canMakePayments;
    });

    // Checking ApplePay capabilities and initialise
    await this.checkForApplePay().then((result) => { // sets Apple Pay Payment Button
      this.canDoApplePay = result;
      if (this.canDoApplePay) {
        this.initApplePayRequest();
      }
    });

  }

  /***************************** GOOGLE PAY CODE *****************************/
  // Configures the Google Pay Request
  initGooglePayRequest(){
    this.allowPaymentMethods = [
      {
        type: 'CARD',
        parameters: {
          allowedAuthMethods: [
            GooglePayAllowedAuthMethod.CRYPTOGRAM_3DS
          ],
          allowedCardNetworks: [
            GooglePayAllowedNetwork.AMEX,
            GooglePayAllowedNetwork.DISCOVER,
            GooglePayAllowedNetwork.JCB,
            GooglePayAllowedNetwork.MASTERCARD,
            GooglePayAllowedNetwork.VISA
          ]
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            gateway: 'example',
            gatewayMerchantId: 'exampleGatewayMerchantiID'
          }
        }
      }
    ];
  }

  public async doGooglePayment(purchaseAmt: number, feesAmt: number): Promise<PaymentResult>{
    const paymentResult: PaymentResult = {
      success: false,
      status: "",
      message: ""
    };

    // setup the GooglePay transaction
    const transactionDetails: GooglePayPaymentRequest = {
      allowedPaymentMethods: this.allowPaymentMethods,
      merchantInfo: {
        merchantId: environment.values.googlePayMerchantId,
        merchantName: environment.values.googlePayMerchantName
      },
      transactionInfo: {
        countryCode: 'ZA',
        currencyCode: 'ZAR',
        totalPrice: "" + ((+this.applePayRequest.request.lineItems[0].amount) + (+this.applePayRequest.request.lineItems[1].amount)),
        totalPriceStatus: 'FINAL'
      }
    };


    // process transaction
    return new Promise(async (resolve, reject) => {
      try{
          let result: GooglePayMakePaymentRequestResponse = null;
          result  = await GooglePay.makePaymentRequest(transactionDetails);
          if(result && result.paymentMethodData){
            console.log(result); // DON'T KNOW HOW TO VERIFY TRANSACTION YET
          }
      } catch(error){

      }

      
     
    });

  }
  /***************************** END GOOGLE PAY CODE *****************************/


  /***************************** APPLE PAY CODE *****************************/

  // checks Apple Pay capability
  async checkForApplePay(): Promise<boolean> {
    const res = await ApplePay.canMakePayments({
      merchantIdentifier: 'my-apple-pay-merchant-identifier',
      supportedNetworks: [
        ApplePaySupportedNetwork.AMEX,
        ApplePaySupportedNetwork.DISCOVER,
        ApplePaySupportedNetwork.VISA,
        ApplePaySupportedNetwork.VPAY,
        ApplePaySupportedNetwork.PRIVATELABEL,
        ApplePaySupportedNetwork.MASTERCARD]
    });

    return res.canMakePayments;
  }

  initApplePayRequest() {
    this.applePayRequest = {
      version: 5,
      merchantValidation: {
        url: environment.values.applePayMerchantValidationUrl,
        params: {
          merchantIdentifier: environment.values.applePayMerchantIdentifier,
          displayName: environment.values.applePayDisplayName,
          initiative: 'web',
          initiativeContext: environment.values.applePayInitiativeContent
        }
      },
      paymentAuthorization: {
        url: environment.values.applePayPaymentAuthorizationUrl,
      },
      request: {
        merchantCapabilities: [
          ApplePayMerchantCapability.THREEDS,
          ApplePayMerchantCapability.CREDIT,
          ApplePayMerchantCapability.DEBIT,
          ApplePayMerchantCapability.EMV],
        supportedNetworks: [
          ApplePaySupportedNetwork.DISCOVER,
          ApplePaySupportedNetwork.EFTPOS,
          ApplePaySupportedNetwork.ELECTRON,
          ApplePaySupportedNetwork.JCB,
          ApplePaySupportedNetwork.MAESTRO,
          ApplePaySupportedNetwork.PRIVATELABEL,
          ApplePaySupportedNetwork.VPAY,
          ApplePaySupportedNetwork.AMEX,
          ApplePaySupportedNetwork.MASTERCARD,
          ApplePaySupportedNetwork.VISA],
        countryCode: environment.values.applePayPaymentCountryCode,
        currencyCode: environment.values.applePaymentCurrencyCode,
        lineItems: [
          {
            label: "Capital Amount",
            type: "final", // change to final once amount is populated
            amount: null
          },
          {
            label: "Deposit Fees",
            type: "final",
            amount: "0.00" // updated with transaction deposit fee
          }
        ],
        total: {
          label: "Total",
          type: "final",
          amount: "0.00" // update with total amount (deposit amount + deposit fee)
        }
      }
    };

    return;
  }

  // Complete the payment 

  async doApplePayPayment(purchaseAmt: number, feesAmt: number): Promise<PaymentResult> {

    const paymentResult: PaymentResult = {
      success: false,
      status: "",
      message: ""
    };

    return new Promise(async (resolve, reject) => {
      if (!purchaseAmt || purchaseAmt <= paymentsMinDepositAmount) {
        paymentResult.message = "The purchase amount must be greater than R" + paymentsMinDepositAmount;
        paymentResult.status = "Invalid amount";
        reject(paymentResult);
        return;
      }

      // setting values
      this.applePayRequest.request.lineItems[0].amount = "" + purchaseAmt;
      this.applePayRequest.request.lineItems[1].amount = "" + feesAmt;
      this.applePayRequest.request.total.amount = "" + ((+this.applePayRequest.request.lineItems[0].amount) + (+this.applePayRequest.request.lineItems[1].amount));

      try {
        const response = await ApplePay.makePaymentRequest(this.applePayRequest);
        if (response.success) {
          paymentResult.success = true;
          paymentResult.message = "";
          paymentResult.status = "Transaction processed successfully";
          resolve(paymentResult);
          return;
        }
      } catch (error) {
        paymentResult.message = error.message;
        paymentResult.status = "Transaction failed";
        resolve(paymentResult);
        return;
      }

    });

  }
  /***************************** APPLE PAY CODE ENDS *****************************/

}