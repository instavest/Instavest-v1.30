// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  values :{
    buildVersion: '1.30.001', // Full software build version
    releaseVersion: 'Alpha', // Application release name
    apiVersion: '1.3', // Current API version implemented
    stripeKey : 'pk_test_51IqvKMHYWWosiZYWAkTVzjV27kzKAJjSQzeI1yYLGoKK4kmXgrFqn5SjuhtSemFg5LpVeZSCOfzoy3YtQPhn8NNn00hJprqu7d', // required TEST mode to be activated on Stripe Dashbaoard
    legalIdInvestmentOne : 42, // Rolex Watch first asset (DEV)
    network : 1, // TESTNET = 1
    termsUrl: "https://instavestcapital.com/wp-content/uploads/2022/09/terms-2022.pdf",
    targetUrl: "https://gw.instavestcapital.com/?",
    websiteUrl: "https://instavestcapital.com",
    paymentsMinDepositAmount: 100,
    applePayMerchantIdentifier: "merchant.com.instavest.demo",
    applePayStoreName: "Instavest",
    applePayDisplayName: "Instavest",
    applePayInitiativeContent: "instavestcapital.com",
    applePayPaymentAuthorizationUrl: "https://gw7.instavestcapital.com/applepay/payment-auth",
    applePayPaymentCountryCode: "ZA",
    applePaymentCurrencyCode: "ZAR",
    applePayMerchantValidationUrl: "https://gw7.instavestcapital.com/applepay/payment-session",
    googlePayMerchantId: "451645797475304261",
    googlePayMerchantName: "Instavest (Pty) Ltd",
    sessionVaultName: "com.instavest.demo.session",
    biometricVaultName: "com.instavest.demo.biometric"
  }
};