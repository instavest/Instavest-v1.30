import { Injectable, NgZone } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Vault, Device, DeviceSecurityType, VaultType, BrowserVault, IdentityVaultConfig, BiometricPermissionState } from '@ionic-enterprise/identity-vault';
import { Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

const sessionKey = environment.values.sessionVaultName;
const biometricKey = environment.values.biometricVaultName;

const sessionConfig: IdentityVaultConfig = {
  key: sessionKey,
  type: VaultType.InMemory,
  deviceSecurityType: DeviceSecurityType.None, // Don't need the user to unlock the store. Session tokens time out in 5 mins.
  lockAfterBackgrounded: 30000,
  shouldClearVaultAfterTooManyFailedAttempts: false,
  customPasscodeInvalidUnlockAttempts: 3,
  unlockVaultOnLoad: false
};

const biometricConfig: IdentityVaultConfig = {
  key: biometricKey,
  type: VaultType.DeviceSecurity,
  deviceSecurityType: DeviceSecurityType.Both,
  lockAfterBackgrounded: 15000,
  shouldClearVaultAfterTooManyFailedAttempts: false,
  customPasscodeInvalidUnlockAttempts: 3,
  unlockVaultOnLoad: false
};

export interface VaultServiceState {
  session: string;
  lockType: "NoLocking" | "Biometrics";
  isEmpty: boolean;
  isLocked: boolean;
  privacyScreen?: boolean;
  biometricCapability?: "NotSupported" | "NotAllowed" | "NotEnabled" | "Enabled" | "SystemPasscode" | "Prompt";
}

@Injectable({ providedIn: 'root' })

export class VaultService {

  public sessionState: VaultServiceState = {
    session: '',
    lockType: 'NoLocking',
    isEmpty: null,
    privacyScreen: false,
    isLocked: false
  }

  public biometricState: VaultServiceState = {
    session: '',
    lockType: 'NoLocking',
    isEmpty: null,
    isLocked: false,
    biometricCapability: "NotSupported"
  }

  public sessionVault: Vault | BrowserVault;
  public biometricVault: Vault | BrowserVault;
  private vaultsInitiated = false;

  constructor(private ngZone: NgZone, private platform: Platform) {
    this.biometricVault = Capacitor.getPlatform() === "web"
      ? new BrowserVault(biometricConfig)
      : new Vault(biometricConfig);

    this.sessionVault = Capacitor.getPlatform() === "web"
      ? new BrowserVault(sessionConfig)
      : new Vault(sessionConfig);

      if(!this.vaultsInitiated) this.initVaults();
  }

  getBiometricVaultKey(): string {
    return biometricKey;
  }

  getSessionVaultKey(): string {
    return sessionKey;
  }

  // state return answer to isEmpty (true means biometricState is negative)
  async getBiometricStatus(): Promise<boolean> {
    
    return await this.biometricVault.isEmpty();
  }

  async initVaults() {
      this.vaultsInitiated = true;
      await this.initSessionVault();
      await this.initBiometricVault();
      await this.updateVaultObjectVars();
  }

  // Updates the isEmpty variable once the vaults have fully initiatlised
  async updateVaultObjectVars(): Promise<void> {
   await this.ngZone.run(async () => {
      this.sessionState.isEmpty = await this.sessionVault.isEmpty();
      this.sessionState.isEmpty === null ? false : this.sessionState;

      this.biometricState.isEmpty = await this.biometricVault.isEmpty();
      this.biometricState.isEmpty === null ? false : this.biometricState;
      return;
    });

    await this.isBiometricsAvailable();

    return;
  }

  

  async initSessionVault() {
    this.sessionState.privacyScreen =
      Capacitor.getPlatform() === "web"
        ? false
        : await Device.isHideScreenOnBackgroundEnabled();
  }

  /*
  * Used solely for the storage and retrieval of biometric authentication keys
  */
  async initBiometricVault() {
    this.biometricVault.onLock(() => {
      this.ngZone.run(() => {
        this.biometricState.isLocked = true;
      });
    });

    this.biometricVault.onUnlock(() => {
      this.ngZone.run(() => {
        this.biometricState.isLocked = false;
      });
    });
    
    return;
  }

  /* 
  * Sets the biometricState biometricCapability variable. Resolves void.
  */
  async isBiometricsAvailable(): Promise<void> {

    return new Promise(async (resolve, reject) => {
      console.log("Device.isBiometricsEnabled(): " + await Device.isBiometricsEnabled());
      console.log("Device.isBiometricsAllowed(): "+ await Device.isBiometricsAllowed() );
      console.log("await Device.isBiometricsSupported(): " + await Device.isBiometricsSupported());
      console.log("await Device.isSystemPasscodeSet():"+await Device.isSystemPasscodeSet());
      if (await Device.isBiometricsEnabled()) {
        this.biometricState.biometricCapability = "Enabled";
        resolve();
        return;
      }

      if (await Device.isBiometricsAllowed() === BiometricPermissionState.Denied) {
        this.biometricState.biometricCapability = "NotAllowed";
        resolve();
        return;
      }

      if (await Device.isBiometricsAllowed() === BiometricPermissionState.Granted) {
        this.biometricState.biometricCapability = "Enabled";
        resolve();
        return;
      }

      if (await Device.isBiometricsAllowed() === BiometricPermissionState.Prompt) {
        this.biometricState.biometricCapability = "Prompt";
        resolve();
        return;
      }

      if (await Device.isBiometricsSupported()) {
        this.biometricState.biometricCapability = "NotEnabled";
        resolve();
        return;
      }

      if (await Device.isSystemPasscodeSet()) {
        this.biometricState.biometricCapability = "SystemPasscode";
        resolve();
        return;
      }

    });

  }

  async setSession(value: string): Promise<void> {
    this.sessionState.session = value;
    await this.sessionVault.setValue(sessionKey, value);
    return;
  }

  async restoreSession() {
    const value = await this.biometricVault.getValue(sessionKey);
    this.sessionState.session = value;
    return;
  }

  // sessionVault doesn't lock
  async lockVault(key: string) {
    if (key === biometricKey) {
      await this.biometricVault.lock();
      return;
    }
    return;
  }

  async unlockVault(key: string) {
    if (key === sessionKey) {
      await this.sessionVault.unlock();
      return;
    }
    //if(key === sessionKey){
    await this.biometricVault.unlock();
    return;
  }

  async resetVault(key: string) {
    if (key === sessionKey) {
      await this.sessionVault.clear();
      return;
    }

    // not a sessionKey request - therefore can only be biometric
    await this.biometricVault.clear();
    this.vaultsInitiated = false;
    this.initVaults();

    this.isBiometricsAvailable();
    this.getBiometricStatus().then((state)=>{
      this.biometricState.isEmpty = !state;
    });

    return;
  }

  /*
  * Checks if a key exists and is set
  */
  async checkItemExists(vault: string, key: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {

      let value: string = null;

      if (vault === sessionKey) {
        value = await this.sessionVault.getValue(key);
        if (value && value.length > 0) {
          resolve(true);
          return;
        }
        // value is null or 0 length
        resolve(false);
        return;
      }

      if (vault === biometricKey) {
        value = await this.biometricVault.getValue(key);
        if (value && value.length > 0) {
          resolve(true);
          return;
        }
        // value is null or 0 length
        resolve(false);
        return;
      }
    });
  }

  /*
  * Returns the value associated with the key or null if nothing
  */
  async getItem(vault: string, key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (vault === sessionKey) {
        this.sessionVault.getValue(key).then(async (result) => {
          resolve(result);
        }, () => {
          resolve(null);
        });
      }

      if (vault === biometricKey) {
        this.biometricVault.getValue(key).then(async (result) => {
          resolve(result);
        }, () => {
          resolve(null);
        });
      }
    });
  }

  /*
  * Adds a new key-value pair to the data store, replaces value if key exists. 
  * Returns false upon failure or true if successful.
  */
  async storeItem(vault: string, key: string, value: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (vault === sessionKey) {
        this.sessionVault.setValue<string>(key, value).then(() => {
          resolve(true);
        }, () => {
          resolve(false);
        });
      }

      if (vault === biometricKey) {
        this.biometricVault.setValue<string>(key, value).then(() => {
          resolve(true);
        }, () => {
          resolve(false);
        });
      }
    });
  }

  /* Device Privacy Screen hides the contents of the last screen from iOS and Android 'open app' lists */
  setPrivacyScreen(enabled: boolean) {
    Device.setHideScreenOnBackground(enabled);
    this.sessionState.privacyScreen = enabled;
  }

  /* Not currently implemented but will allow users to configure their own stored data security settings */
  async setLockType() {
    let type: VaultType;
    let deviceSecurityType: DeviceSecurityType;

    switch (this.biometricState.lockType) {
      case 'Biometrics':
        type = VaultType.DeviceSecurity;
        deviceSecurityType = DeviceSecurityType.Biometrics;
        break;

      default:
        type = VaultType.SecureStorage;
        deviceSecurityType = DeviceSecurityType.None;
    }
    // await this.vault.updateConfig({ ...this.vault.config, type, deviceSecurityType });
  }
}