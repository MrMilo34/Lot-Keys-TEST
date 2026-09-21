package ca.lotkeys.bridge;
import android.app.Activity;
import android.content.*;
import org.json.*;

/** Explicit phone send-result receiver. Stores IDs/result codes only, never text or numbers. */
public final class SmsResultReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent) {
        String id=intent.getStringExtra("requestId");int part=intent.getIntExtra("part",-1);
        if(id==null||part<0)return;
        synchronized(SmsResultReceiver.class) {
            SharedPreferences p=context.getSharedPreferences("mirror-sends",Context.MODE_PRIVATE);
            try{
                String raw=p.getString(id,"");if(raw.isEmpty())return;
                JSONObject row=new JSONObject(raw);JSONArray results=row.getJSONArray("results");
                if(part>=results.length()||results.optInt(part)!=0)return;
                results.put(part,getResultCode()==Activity.RESULT_OK?1:-1);
                boolean all=true,anyFail=false;for(int i=0;i<results.length();i++){all&=results.optInt(i)!=0;anyFail|=results.optInt(i)<0;}
                row.put("phase",all?(anyFail?"failed":"sent"):"accepted");
                if(anyFail)row.put("error","SMS failed or was only partly sent. Check the phone before retrying.");
                row.put("updatedAt",System.currentTimeMillis());
                p.edit().putString(id,row.toString()).commit();
            }catch(Exception ignored){ /* No content/recipient logging. A missing receipt remains unconfirmed. */ }
        }
        PhoneMirrorService.nudge();
    }
}
