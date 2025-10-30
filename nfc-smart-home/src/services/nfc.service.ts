import { Nfc, NfcTagScannedEvent } from '@capawesome-team/capacitor-nfc';

export class NFCService {
  private static instance: NFCService;
  private scanning: boolean = false;

  private constructor() {}

  static getInstance(): NFCService {
    if (!NFCService.instance) {
      NFCService.instance = new NFCService();
    }
    return NFCService.instance;
  }

  async isSupported(): Promise<boolean> {
    try {
      const { isSupported } = await Nfc.isSupported();
      return isSupported;
    } catch (error) {
      console.error('Error checking NFC support:', error);
      return false;
    }
  }

  async isEnabled(): Promise<boolean> {
    try {
      const { isEnabled } = await Nfc.isEnabled();
      return isEnabled;
    } catch (error) {
      console.error('Error checking NFC enabled:', error);
      return false;
    }
  }

  async startScan(): Promise<void> {
    if (this.scanning) return;

    try {
      await Nfc.startScanSession();
      this.scanning = true;
    } catch (error) {
      console.error('Error starting NFC scan:', error);
      throw error;
    }
  }

  async stopScan(): Promise<void> {
    if (!this.scanning) return;

    try {
      await Nfc.stopScanSession();
      this.scanning = false;
    } catch (error) {
      console.error('Error stopping NFC scan:', error);
    }
  }

  onTagScanned(callback: (event: NfcTagScannedEvent) => void) {
    Nfc.addListener('nfcTagScanned', callback);
  }

  removeAllListeners() {
    Nfc.removeAllListeners();
  }

  isScan ning() {
    return this.scanning;
  }

  extractTagId(event: NfcTagScannedEvent): string {
    // Extract unique tag ID from NFC event
    return event.nfcTag.id || '';
  }
}

export const nfcService = NFCService.getInstance();
