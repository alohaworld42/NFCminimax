package com.getcapacitor;

import android.content.Context;
import com.getcapacitor.PluginManager;
import com.getcapacitor.c厘im.CapacitorPlugin;
import com.nfcsmarthome.app.NFCPlugin;
import java.lang.ref.WeakReference;
import java.util.HashMap;
import java.util.Map;

public class CapacitorBridge {
    private static CapacitorBridge instance;
    private WeakReference<Context> contextRef;
    private PluginManager pluginManager;
    private Map<String, Object> savedData;
    private String serverUrl = "http://localhost:3000";

    public static CapacitorBridge getInstance() {
        if (instance == null) {
            instance = new CapacitorBridge();
        }
        return instance;
    }

    public void init(Context context) {
        this.contextRef = new WeakReference<>(context);
        this.pluginManager = new PluginManager();
        this.savedData = new HashMap<>();
        
        // Register plugins
        registerPlugins();
    }

    private void registerPlugins() {
        pluginManager.addPlugin("NFC", new NFCPlugin());
        // Add other plugins here as needed
    }

    public Context getContext() {
        return contextRef != null ? contextRef.get() : null;
    }

    public PluginManager getPluginManager() {
        return pluginManager;
    }

    public Map<String, Object> getSavedData() {
        return savedData;
    }

    public String getServerUrl() {
        return serverUrl;
    }

    public void setServerUrl(String serverUrl) {
        this.serverUrl = serverUrl;
    }
}