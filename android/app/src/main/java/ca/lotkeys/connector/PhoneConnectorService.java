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

/** Keeps the loopback Android capability layer available while LotKeys is in use. */
public final class PhoneConnectorService extends Service {
    private static final String CHANNEL = "lotkeys-phone-connector";
    private static final int NOTIFICATION_ID = 9484;
    private static final AtomicLong REVISION = new AtomicLong(1);
    private static volatile PhoneConnectorService instance;
    private LocalApiServer server;
    private ContentObserver observer;
    private String status = "SMS/MMS coverage ready · RCS watcher not enabled";

    static long revision() { return REVISION.get(); }
    static void nudge() { REVISION.incrementAndGet(); }

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
        return START_STICKY;
    }

    void reportLocalError(String message) {
        status = message;
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, notification());
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
