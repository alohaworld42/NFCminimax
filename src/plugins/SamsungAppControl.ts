import { registerPlugin } from '@capacitor/core';

export interface SamsungAppControlPlugin {
  /**
   * Launch an app by its package name
   * @param options - Object containing packageName
   * @returns Promise with launch result
   */
  launchApp(options: { packageName: string }): Promise<{
    success: boolean;
    packageName: string;
    action: string;
  }>;

  /**
   * Close an app by its package name (limited by Android security)
   * @param options - Object containing packageName
   * @returns Promise with close result
   */
  closeApp(options: { packageName: string }): Promise<{
    success: boolean;
    packageName?: string;
    action?: string;
    message?: string;
    note?: string;
  }>;

  /**
   * Switch to an app (bring to foreground if running, launch if not)
   * @param options - Object containing packageName
   * @returns Promise with switch result
   */
  switchToApp(options: { packageName: string }): Promise<{
    success: boolean;
    packageName: string;
    action: string;
    wasRunning: boolean;
  }>;

  /**
   * Check if an app is installed
   * @param options - Object containing packageName
   * @returns Promise with installation status
   */
  isAppInstalled(options: { packageName: string }): Promise<{
    installed: boolean;
    packageName: string;
    appName?: string;
    versionName?: string;
    versionCode?: number;
  }>;

  /**
   * Get count of installed launchable apps
   * @returns Promise with app count
   */
  getInstalledApps(): Promise<{
    success: boolean;
    count: number;
    message: string;
  }>;

  /**
   * Bring an app to foreground
   * @param options - Object containing packageName
   * @returns Promise with result
   */
  bringToForeground(options: { packageName: string }): Promise<{
    success: boolean;
    packageName: string;
    action: string;
  }>;
}

const SamsungAppControl = registerPlugin<SamsungAppControlPlugin>('SamsungAppControl', {
  web: () => import('./web').then(m => new m.SamsungAppControlWeb()),
});

export default SamsungAppControl;
