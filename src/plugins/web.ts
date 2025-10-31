import { WebPlugin } from '@capacitor/core';
import type { SamsungAppControlPlugin } from './SamsungAppControl';

export class SamsungAppControlWeb extends WebPlugin implements SamsungAppControlPlugin {
  async launchApp(options: { packageName: string }): Promise<{
    success: boolean;
    packageName: string;
    action: string;
  }> {
    console.log('launchApp called on web with:', options);
    return {
      success: false,
      packageName: options.packageName,
      action: 'not_supported_on_web'
    };
  }

  async closeApp(options: { packageName: string }): Promise<{
    success: boolean;
    packageName?: string;
    action?: string;
    message?: string;
    note?: string;
  }> {
    console.log('closeApp called on web with:', options);
    return {
      success: false,
      message: 'App control is not supported on web',
      note: 'This feature requires an Android device'
    };
  }

  async switchToApp(options: { packageName: string }): Promise<{
    success: boolean;
    packageName: string;
    action: string;
    wasRunning: boolean;
  }> {
    console.log('switchToApp called on web with:', options);
    return {
      success: false,
      packageName: options.packageName,
      action: 'not_supported_on_web',
      wasRunning: false
    };
  }

  async isAppInstalled(options: { packageName: string }): Promise<{
    installed: boolean;
    packageName: string;
    appName?: string;
    versionName?: string;
    versionCode?: number;
  }> {
    console.log('isAppInstalled called on web with:', options);
    return {
      installed: false,
      packageName: options.packageName
    };
  }

  async getInstalledApps(): Promise<{
    success: boolean;
    count: number;
    message: string;
  }> {
    console.log('getInstalledApps called on web');
    return {
      success: false,
      count: 0,
      message: 'App listing is not supported on web'
    };
  }

  async bringToForeground(options: { packageName: string }): Promise<{
    success: boolean;
    packageName: string;
    action: string;
  }> {
    console.log('bringToForeground called on web with:', options);
    return {
      success: false,
      packageName: options.packageName,
      action: 'not_supported_on_web'
    };
  }
}
