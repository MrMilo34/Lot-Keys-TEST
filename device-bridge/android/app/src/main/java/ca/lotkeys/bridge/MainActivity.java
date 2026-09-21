package ca.lotkeys.bridge;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.view.*;
import android.widget.*;
import java.util.*;

/** Visible consent and diagnostics. Keeps the user's chosen SMS app and address book unchanged. */
public final class MainActivity extends Activity {
    private TextView status;
    private EditText pairing;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Runnable refresh=new Runnable(){public void run(){paint();handler.postDelayed(this,2000);}};
    @Override public void onCreate(Bundle state){
        super.onCreate(state);getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        ScrollView scroll=new ScrollView(this);LinearLayout body=new LinearLayout(this);body.setOrientation(LinearLayout.VERTICAL);body.setPadding(32,32,32,40);scroll.addView(body);setContentView(scroll);
        text(body,"LotKeys Phone Mirror 0.2.0",24);
        text(body,"SMS/MMS history · SMS sending · phone stays in charge",17);
        text(body,"Keep Google Messages, Samsung Messages, or your preferred SMS app. This test connector reads Android's SMS/MMS history, including older conversations. It does NOT read private RCS history, send RCS/MMS, or download MMS attachments. Group conversations are view-only.",15);
        text(body,"Your paired LotKeys browsers can view these messages and ask this phone to send SMS. No phone contacts are created. Message content is encrypted in transit and not archived by the relay or LotKeys. Only send-request IDs and result codes are retained here to prevent accidental duplicate sends.",15);
        status=text(body,"Checking permissions…",16);status.setPadding(0,16,0,16);
        button(body,"1. Allow SMS access",()->{
            new AlertDialog.Builder(this).setTitle("Allow personal SMS/MMS mirroring?")
                .setMessage("Only continue for your own phone and paired LotKeys account. LotKeys can read your SMS/MMS history and send SMS that you request from a paired browser. Carrier charges may apply. Your default messaging app and contacts remain unchanged.")
                .setNegativeButton("Cancel",null).setPositiveButton("Continue",(d,w)->permissions()).show();
        });
        button(body,"2. Allow background connection",()->{
            PowerManager pm=getSystemService(PowerManager.class);
            if(pm.isIgnoringBatteryOptimizations(getPackageName())){alert("Background battery exemption is already enabled.");return;}
            try{startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,Uri.parse("package:"+getPackageName())));}
            catch(ActivityNotFoundException ex){startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName())));}
        });
        text(body,"On Samsung, also keep Phone Mirror out of Sleeping / Deep sleeping apps. Start it once below. A visible service notification remains while mirroring is enabled. Android Force stop always requires opening the app again.",14);
        text(body,"3. Paste your existing device.json (the DEVICE code, not hub.json)",16);
        pairing=new EditText(this);pairing.setMinLines(4);pairing.setMaxLines(8);pairing.setGravity(Gravity.TOP);pairing.setHint("{ \"version\": 1, \"role\": \"device\", … }");pairing.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE|android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);body.addView(pairing);
        button(body,"Save pairing & start mirror",()->{
            if(!new PhoneStore(this).allowed()){alert("Grant SMS access first. A permission failure is not a connection failure.");return;}
            try{
                String raw=pairing.getText().toString().trim();
                if(!raw.isEmpty()){Protocol check=new Protocol(raw);check.destroy();SecureConfig.save(this,raw);}
                else if(SecureConfig.load(this).isEmpty()){alert("Paste the complete device.json first.");return;}
                stopService(new Intent(this,PhoneMirrorService.class));
                getSharedPreferences("bridge",0).edit().putBoolean("mirrorEnabled",true).putString("mirrorStatus","Starting phone mirror…").commit();
                pairing.setText("");handler.postDelayed(()->startForegroundService(new Intent(this,PhoneMirrorService.class)),500);paint();
            }catch(Exception ex){alert(ex.getMessage()==null?"Could not start Phone Mirror.":ex.getMessage());}
        });
        button(body,"Open LotKeys TEST",()->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://mrmilo34.github.io/Lot-Keys-TEST/?build=09494"))));
        button(body,"Stop mirroring",()->{getSharedPreferences("bridge",0).edit().putBoolean("mirrorEnabled",false).putString("mirrorStatus","Mirroring stopped by you.").commit();stopService(new Intent(this,PhoneMirrorService.class));paint();});
        button(body,"App permission / battery settings",()->startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName()))));
        button(body,"Forget this device pairing",()->new AlertDialog.Builder(this).setTitle("Forget pairing?").setMessage("This stops Phone Mirror and removes this app's pairing. It does not delete your phone messages or LotKeys customer data.")
            .setNegativeButton("Cancel",null).setPositiveButton("Forget",(d,w)->{try{stopService(new Intent(this,PhoneMirrorService.class));getSharedPreferences("bridge",0).edit().putBoolean("mirrorEnabled",false).commit();SecureConfig.clear(this);pairing.setText("");paint();}catch(Exception ex){alert("Could not clear pairing.");}}).show());
        text(body,"Keep the existing relay and HTTPS tunnel running during this test. A changed tunnel URL needs updated pairing. Disable the OLD notification Bridge before starting this mirror; the new app installs separately so the old build can remain as a fallback.",14);
    }
    private TextView text(LinearLayout parent,String s,int size){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setPadding(0,10,0,10);parent.addView(t);return t;}
    private void button(LinearLayout parent,String label,Runnable action){Button b=new Button(this);b.setText(label);b.setAllCaps(false);parent.addView(b);b.setOnClickListener(v->{try{action.run();}catch(Exception e){alert("Android could not complete this action. Check app settings.");}});}
    private void alert(String message){new AlertDialog.Builder(this).setTitle("Phone Mirror").setMessage(message).setPositiveButton("OK",null).show();}
    private void permissions(){
        ArrayList<String> p=new ArrayList<>();p.add(Manifest.permission.READ_SMS);p.add(Manifest.permission.SEND_SMS);
        if(Build.VERSION.SDK_INT>=33)p.add(Manifest.permission.POST_NOTIFICATIONS);
        requestPermissions(p.toArray(new String[0]),42);
    }
    private void paint(){if(status==null)return;
        PhoneStore s=new PhoneStore(this);boolean send=checkSelfPermission(Manifest.permission.SEND_SMS)==PackageManager.PERMISSION_GRANTED;
        boolean battery=getSystemService(PowerManager.class).isIgnoringBatteryOptimizations(getPackageName());
        String note=s.allowed()?"SMS history permission: allowed":"SMS history permission: NOT allowed";
        note+="\nSMS send permission: "+(send?"allowed":"NOT allowed")+"\nBackground battery exemption: "+(battery?"enabled":"not enabled")+"\nMessaging app: "+s.sourceApp();
        note+="\n\n"+getSharedPreferences("bridge",0).getString("mirrorStatus","Not started.");status.setText(note);
    }
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] results){super.onRequestPermissionsResult(requestCode,permissions,results);paint();if(!new PhoneStore(this).allowed())alert("Android did not grant SMS history access. Open App settings > Permissions. Some installers restrict SMS permissions; the test kit includes an ADB install option. LotKeys will not silently switch your default messaging app.");}
    @Override public void onResume(){super.onResume();handler.post(refresh);}
    @Override public void onPause(){handler.removeCallbacks(refresh);super.onPause();}
}
