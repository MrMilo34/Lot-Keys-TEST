package ca.lotkeys.connector;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (!context.getSharedPreferences("lotkeys-connector", Context.MODE_PRIVATE).getBoolean("enabled", false)) return;
        if (!new PhoneStore(context).canReadMessages()) return;
        try { context.startForegroundService(new Intent(context, PhoneConnectorService.class)); }
        catch (Exception ignored) {}
    }
}
