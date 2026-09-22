package ca.lotkeys.bridge;
import android.content.*;

public final class MirrorBootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent) {
        String action=intent.getAction();
        if(!Intent.ACTION_BOOT_COMPLETED.equals(action)&&!Intent.ACTION_MY_PACKAGE_REPLACED.equals(action))return;
        if(!context.getSharedPreferences("bridge",0).getBoolean("mirrorEnabled",false))return;
        try{context.startForegroundService(new Intent(context,PhoneMirrorService.class));}
        catch(RuntimeException e){context.getSharedPreferences("bridge",0).edit().putString("mirrorStatus","Android blocked restart. Open Phone Mirror once to resume.").apply();}
    }
}
