package com.nfcsmarthome.app;

import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NFC")
public class NFCPlugin extends Plugin {
    private NfcAdapter nfcAdapter;
    private boolean isScanning = false;

    @Override
    public void load() {
        super.load();
        nfcAdapter = NfcAdapter.getDefaultAdapter(getActivity());
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        if (nfcAdapter == null) {
            call.resolve(getJsonObject("status", "NO_NFC"));
            return;
        }

        String status;
        if (nfcAdapter.isEnabled()) {
            status = "ENABLED";
        } else {
            status = "DISABLED";
        }

        call.resolve(getJsonObject("status", status));
    }

    @PluginMethod
    public void startScanning(PluginCall call) {
        if (nfcAdapter == null) {
            call.reject("NFC is not available");
            return;
        }

        if (!nfcAdapter.isEnabled()) {
            call.reject("NFC is disabled");
            return;
        }

        if (isScanning) {
            call.reject("Already scanning");
            return;
        }

        isScanning = true;
        call.resolve();
    }

    @PluginMethod
    public void stopScanning(PluginCall call) {
        isScanning = false;
        call.resolve();
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);

        if (isScanning && NfcAdapter.ACTION_NDEF_DISCOVERED.equals(intent.getAction())) {
            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
            if (tag != null) {
                Ndef ndef = Ndef.get(tag);
                if (ndef != null) {
                    String tagId = bytesToHex(tag.getId());
                    notifyListeners("nfcEvent", getJsonObject("type", "nfcEvent")
                        .put("tag", getJsonObject("id", tagId)));
                }
            }
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private java.util.Map<String, Object> getJsonObject(String key, Object value) {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put(key, value);
        return map;
    }
}