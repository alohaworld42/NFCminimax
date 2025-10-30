import { CapacitorNfc } from '@capgo/capacitor-nfc';

export interface NfcTagEvent {
  tag?: {
    id?: number[];
    techTypes?: string[];
    type?: string | null;
    maxSize?: number | null;
    isWritable?: boolean | null;
    canMakeReadOnly?: boolean | null;
    ndefMessage?: any[] | null;
  };
}

export class NFCService {
  private static instance: NFCService;
  private scanning: boolean = false;
  private listenerHandles: any[] = [];

  private constructor() {}

  static getInstance(): NFCService {
    if (!NFCService.instance) {
      NFCService.instance = new NFCService();
    }
    return NFCService.instance;
  }

  async isSupported(): Promise<boolean> {
    try {
      const { status } = await CapacitorNfc.getStatus();
      return status !== 'NO_NFC';
    } catch (error) {
      console.error('Error checking NFC support:', error);
      return false;
    }
  }

  async isEnabled(): Promise<boolean> {
    try {
      const { status } = await CapacitorNfc.getStatus();
      return status === 'NFC_OK';
    } catch (error) {
      console.error('Error checking NFC enabled:', error);
      return false;
    }
  }

  async startScan(): Promise<void> {
    if (this.scanning) return;

    try {
      await CapacitorNfc.startScanning({
        invalidateAfterFirstRead: false,
        alertMessage: 'Hold a tag near the top of your device.',
      });
      this.scanning = true;
    } catch (error) {
      console.error('Error starting NFC scan:', error);
      throw error;
    }
  }

  async stopScan(): Promise<void> {
    if (!this.scanning) return;

    try {
      await CapacitorNfc.stopScanning();
      this.scanning = false;
    } catch (error) {
      console.error('Error stopping NFC scan:', error);
    }
  }

  async onTagScanned(callback: (event: NfcTagEvent) => void): Promise<any> {
    const handle = await CapacitorNfc.addListener('nfcEvent', callback);
    this.listenerHandles.push(handle);
    return handle;
  }

  removeAllListeners() {
    // Remove all listener handles
    this.listenerHandles.forEach(handle => {
      if (handle?.remove) {
        handle.remove();
      }
    });
    this.listenerHandles = [];
  }

  isScanning() {
    return this.scanning;
  }

  extractTagId(event: NfcTagEvent): string {
    // Extract unique tag ID from NFC event
    const tagId = event.tag?.id || [];
    return tagId.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const nfcService = NFCService.getInstance();
