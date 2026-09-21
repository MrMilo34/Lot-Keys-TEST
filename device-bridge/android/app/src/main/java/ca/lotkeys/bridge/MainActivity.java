package ca.lotkeys.bridge;
import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.provider.Telephony;
import android.service.notification.NotificationListenerService;
import android.view.WindowManager;
import android.widget.*;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private EditText pairing,packages;
    private TextView status;
    private CheckBox consent;
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final Runnable statusLoop=new Runnable(){@Override public void run(){refreshStatus();ui.postDelayed(this,1000);}};
    @Override public void onCreate(Bundle state){
        super.onCreate(state);getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        ScrollView scroll=new ScrollView(this);LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);int pad=(int)(20*getResources().getDisplayMetrics().density);box.setPadding(pad,pad*2,pad,pad*2);scroll.addView(box);setContentView(scroll);
        text(box,"LotKeys Device Bridge",25);text(box,"ANDROID PROTOTYPE · 0.1.1",13);
        text(box,"Relays approved messaging notifications and their live Reply action. On reconnect it can replay conversations that Android still exposes as active notifications. It does not read the full SMS/RCS database, contacts or photos. Obvious verification-code notifications are filtered, but this is not a guarantee against sensitive text appearing.",15);
        text(box,"Paired browser replies can send through an active notification. Only enable this on a device you own or are authorized to use. Stop the bridge at any time below. No SMS or notification content is saved by this companion.",15);
        pairing=new EditText(this);pairing.setHint("Paste Device pairing JSON");pairing.setMinLines(3);pairing.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE|android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);box.addView(pairing);
        text(box,"Allowed messaging app package(s), separated by commas. The default SMS app is prefilled; no other app is enabled automatically.",13);
        packages=new EditText(this);String defaults=Telephony.Sms.getDefaultSmsPackage(this);packages.setText(getSharedPreferences("bridge",0).getString("packages",defaults==null?"":defaults));packages.setHint("com.google.android.apps.messaging");box.addView(packages);
        consent=new CheckBox(this);consent.setText("I authorize live notification messages and replies on my paired Hub browser.");box.addView(consent);
        Button save=new Button(this);save.setText("Save pairing & enable");box.addView(save);save.setOnClickListener(v->{try{
            if(!consent.isChecked())throw new Exception("Confirm device authorization first.");String raw=pairing.getText().toString().trim();if(raw.isEmpty())raw=SecureConfig.load(this);Protocol test=new Protocol(raw);test.destroy();
            String apps=packages.getText().toString().trim();if(apps.isEmpty())throw new Exception("Choose the messaging app to allow.");for(String name:apps.split(","))if(!name.trim().matches("[A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)+"))throw new Exception("Check the app package list.");
            SecureConfig.save(this,raw);getSharedPreferences("bridge",0).edit().putString("packages",apps).putBoolean("enabled",true).commit();pairing.setText("");
            if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},4);
            BridgeNotificationListener.reload(this);refreshStatus();
        }catch(Exception ex){error(ex.getMessage());}});
        Button access=new Button(this);access.setText("Open notification access settings");box.addView(access);access.setOnClickListener(v->startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        Button stop=new Button(this);stop.setText("STOP bridge & forget pairing");box.addView(stop);stop.setOnClickListener(v->new AlertDialog.Builder(this).setTitle("Disconnect device?").setMessage("Stops relaying and deletes this companion’s saved pairing. Messages on the phone are unchanged.").setNegativeButton("Cancel",null).setPositiveButton("Disconnect",(a,b)->{try{SecureConfig.clear(this);BridgeNotificationListener.reload(this);refreshStatus();}catch(Exception ex){error("Could not clear pairing.");}}).show());
        status=text(box,"Not connected",14);
        text(box,"Pairing is encrypted using Android Keystore. Message content is memory-only and is not backed up. Notification dismissal revokes only the current Reply action; it no longer tells Hub to erase that conversation. The bridge retries temporary relay interruptions automatically.",13);
        refreshStatus();
    }
    private TextView text(LinearLayout box,String value,int size){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setPadding(0,12,0,12);box.addView(t);return t;}
    private void error(String message){new AlertDialog.Builder(this).setTitle("Bridge setup").setMessage(message).setPositiveButton("OK",null).show();}
    private void refreshStatus(){if(status==null)return;boolean allowed=getSystemService(NotificationManager.class).isNotificationListenerAccessGranted(new ComponentName(this,BridgeNotificationListener.class));boolean enabled=getSharedPreferences("bridge",0).getBoolean("enabled",false);status.setText((enabled?"Enabled":"Stopped")+" · Notification access "+(allowed?"granted":"not granted")+"\n"+BridgeNotificationListener.state);}
    @Override protected void onResume(){super.onResume();ui.removeCallbacks(statusLoop);ui.post(statusLoop);}
    @Override protected void onPause(){ui.removeCallbacks(statusLoop);super.onPause();}
}
