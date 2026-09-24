package ca.lotkeys.connector;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.database.ContentObserver;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.provider.Telephony;

import java.util.concurrent.atomic.AtomicLong;

/** Keeps the loopback API and encrypted PC relay available while LotKeys is in use. */
public final class PhoneConnectorService extends Service {
    private static final String CHANNEL = "lotkeys-phone-connector";
    private static final int NOTIFICATION_ID = 9484;
    private static final AtomicLong REVISION = new AtomicLong(1);
    private static volatile PhoneConnectorService instance;
    private LocalApiServer server;
    private DriveRelay relay;
    private ContentObserver observer;
    private String status = "SMS/MMS coverage ready · RCS watcher not enabled";

    static long revision() { return REVISION.get(); }
    static void nudge() {
        REVISION.incrementAndGet();
        PhoneConnectorService current = instance;
        if (current != null && current.relay != null) current.relay.phoneDataChanged();
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public void onCreate() {
        super.onCreate();
        instance = this;
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel(
            CHANNEL, "LotKeys phone connection", NotificationManager.IMPORTANCE_LOW));
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING);
        } else {
            startForeground(NOTIFICATION_ID, notification());
        }
        observer = new ContentObserver(new Handler(getMainLooper())) {
            @Override public void onChange(boolean selfChange) { nudge(); }
            @Override public void onChange(boolean selfChange, Uri uri) { onChange(selfChange); }
        };
        if (new PhoneStore(this).canReadMessages()) {
            getContentResolver().registerContentObserver(Telephony.Sms.CONTENT_URI, true, observer);
            getContentResolver().registerContentObserver(Telephony.Mms.CONTENT_URI, true, observer);
            getContentResolver().registerContentObserver(Telephony.Threads.CONTENT_URI, true, observer);
        }
        try {
            server = new LocalApiServer(this);
            server.start();
            relay = new DriveRelay(this);
            relay.start();
        } catch (Exception error) {
            reportLocalError("Phone connection could not start. Reopen the LotKeys Android setup.");
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            getSharedPreferences("lotkeys-connector", MODE_PRIVATE).edit().putBoolean("enabled", false).apply();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!getSharedPreferences("lotkeys-connector", MODE_PRIVATE).getBoolean("enabled", false) ||
            !new PhoneStore(this).canReadMessages()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (intent != null && relay != null) {
            String sessionId = intent.getStringExtra("sessionId");
            if ("APPROVE_PAIR".equals(intent.getAction())) {
                relay.approve(sessionId == null ? "" : sessionId, intent.getStringExtra("trustMode"));
            } else if ("DECLINE_PAIR".equals(intent.getAction())) {
                relay.reject(sessionId == null ? "" : sessionId);
            } else if ("DISCONNECT_PC".equals(intent.getAction())) {
                relay.disconnect(false);
            } else if ("DISCONNECT_ALL".equals(intent.getAction())) {
                relay.disconnectAll();
            }
        }
        return START_STICKY;
    }

    void reportLocalError(String message) {
        status = message;
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, notification());
    }

    void relayChanged() {
        try {
            org.json.JSONObject value = relay == null ? null : relay.status();
            if (value != null && value.optBoolean("connected")) {
                status = "PC connected · " + value.optString("peerName", "Computer");
            } else if (value != null && value.optJSONArray("pendingPairings") != null && value.optJSONArray("pendingPairings").length() > 0) {
                org.json.JSONObject request = value.optJSONArray("pendingPairings").optJSONObject(0);
                status = "Pairing request " + (request == null ? "" : request.optString("code"));
            } else if (value != null && value.optBoolean("authorized")) {
                status = "Ready for PC pairing · SMS/MMS coverage";
            } else {
                status = "SMS/MMS ready · finish PC pairing setup";
            }
        } catch (Exception ignored) {
            status = "SMS/MMS coverage ready · PC relay checking";
        }
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, notification());
    }

    void relayNeedsAuthorization() {
        status = "Open to approve Google account for PC pairing";
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, notification());
    }

    void pairingRequestChanged(org.json.JSONObject request) {
        if (request != null) status = "Computer wants to connect · code " + request.optString("code");
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, notification());
    }

    org.json.JSONObject relayStatus() throws Exception {
        return relay == null ? new org.json.JSONObject().put("configured", false).put("authorized", false) : relay.status();
    }

    org.json.JSONArray pendingPairings() throws Exception {
        return relay == null ? new org.json.JSONArray() : relay.pendingPairings();
    }

    void approvePair(String sessionId, String trustMode) {
        if (relay != null) relay.approve(sessionId, trustMode);
    }

    void rejectPair(String sessionId) {
        if (relay != null) relay.reject(sessionId);
    }

    void disconnectRelay(boolean forget) {
        if (relay != null) relay.disconnect(forget);
    }

    void disconnectAllRelays() {
        if (relay != null) relay.disconnectAll();
    }

    void forgetComputer(String browserId) {
        if (relay != null) relay.forget(browserId);
    }

    private Notification notification() {
        PendingIntent open = PendingIntent.getActivity(
            this, 1, new Intent(this, MainActivity.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(
            this, 2, new Intent(this, PhoneConnectorService.class).setAction("STOP"),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle("LotKeys phone connection")
            .setContentText(status)
            .setStyle(new Notification.BigTextStyle().bigText(status))
            .setContentIntent(open)
            .setOnlyAlertOnce(true)
            .setOngoing(true)
            .setVisibility(Notification.VISIBILITY_SECRET)
            .addAction(new Notification.Action.Builder(null, "Disconnect", stop).build())
            .build();
    }

    @Override public void onDestroy() {
        if (relay != null) relay.stop();
        if (server != null) server.stop();
        if (observer != null) {
            try { getContentResolver().unregisterContentObserver(observer); }
            catch (Exception ignored) {}
        }
        if (instance == this) instance = null;
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }
}
