package com.nfcsmarthome.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Initialize NFC capability check
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.GINGERBREAD_MR1) {
            // NFC is supported on this device
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Handle NFC resume if needed
    }

    @Override
    public void onPause() {
        super.onPause();
        // Handle NFC pause if needed
    }
}