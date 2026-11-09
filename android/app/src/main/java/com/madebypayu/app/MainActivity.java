package com.madebypayu.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final int BLUETOOTH_PERMISSION_REQUEST = 4201;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestBluetoothPermissions();
    }

    /**
     * Android 12+ (API 31): izin "Perangkat sekitar" (BLUETOOTH_CONNECT & BLUETOOTH_SCAN)
     * wajib diminta saat aplikasi berjalan. cordova-plugin-bluetooth-serial 0.4.7 tidak
     * memintanya sendiri, sehingga daftar printer & koneksi gagal sampai izin diberikan
     * manual dari Pengaturan. Diminta sekali di sini; bila sudah diizinkan, tidak muncul lagi.
     */
    private void requestBluetoothPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return;

        String[] required = {
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.BLUETOOTH_SCAN,
        };

        List<String> missing = new ArrayList<>();
        for (String permission : required) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                missing.add(permission);
            }
        }

        if (!missing.isEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toArray(new String[0]), BLUETOOTH_PERMISSION_REQUEST);
        }
    }
}
