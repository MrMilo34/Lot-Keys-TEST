package ca.lotkeys.bridge;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.database.ContentObserver;
import android.net.*;
import android.os.*;
import android.provider.Telephony;
import android.telephony.SmsManager;
import android.telephony.SubscriptionManager;
import org.json.*;
import java.util.*;

/** User-enabled remoteMessaging foreground service; the phone is the only message database. */
public final class PhoneMirrorService extends Service {
    private static volatile PhoneMirrorService instance;
    private static final String CHANNEL="lotkeys-phone-mirror";
    private static final int NOTIFICATION=2094;
    private final Object wake=new Object();
    private volatile boolean running=false,dirty=true;
    private Thread worker;
    private Protocol protocol;
    private PhoneStore store;
    private ContentObserver observer;
    private ConnectivityManager connectivity;
    private ConnectivityManager.NetworkCallback networkCallback;
    private long lastHeartbeat=0,lastInvalidate=0,lastHub=0,lastPeriodic=0;
    private final Map<String,String> announcedReceipts=new HashMap<>();
    private String displayed="Starting phone mirror…";
    static void nudge(){PhoneMirrorService s=instance;if(s!=null){s.dirty=true;s.signal();}}
    private void signal(){synchronized(wake){wake.notifyAll();}}
    @Override public IBinder onBind(Intent intent){return null;}
    @Override public void onCreate(){
        super.onCreate();instance=this;store=new PhoneStore(this);
        NotificationManager nm=getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL,"LotKeys phone mirroring",NotificationManager.IMPORTANCE_LOW));
        Notification n=notification(displayed);
        if(Build.VERSION.SDK_INT>=34)startForeground(NOTIFICATION,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING);
        else startForeground(NOTIFICATION,n);
        observer=new ContentObserver(new Handler(getMainLooper())){
            @Override public void onChange(boolean selfChange){dirty=true;signal();}
            @Override public void onChange(boolean selfChange,Uri uri){onChange(selfChange);}
        };
        if(store.allowed()){
            getContentResolver().registerContentObserver(Telephony.Sms.CONTENT_URI,true,observer);
            getContentResolver().registerContentObserver(Telephony.Mms.CONTENT_URI,true,observer);
            getContentResolver().registerContentObserver(Telephony.Threads.CONTENT_URI,true,observer);
        }
        connectivity=getSystemService(ConnectivityManager.class);
        networkCallback=new ConnectivityManager.NetworkCallback(){
            @Override public void onAvailable(Network network){dirty=true;lastHeartbeat=0;signal();}
            @Override public void onLost(Network network){signal();}
        };
        connectivity.registerDefaultNetworkCallback(networkCallback);
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent!=null&&"STOP".equals(intent.getAction())){
            getSharedPreferences("bridge",0).edit().putBoolean("mirrorEnabled",false).apply();stopSelf();return START_NOT_STICKY;
        }
        if(!getSharedPreferences("bridge",0).getBoolean("mirrorEnabled",false)){stopSelf();return START_NOT_STICKY;}
        if(!running){running=true;worker=new Thread(this::loop,"LotKeys-phone-mirror");worker.start();}else signal();
        return START_STICKY;
    }
    private Notification notification(String text){
        PendingIntent open=PendingIntent.getActivity(this,1,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop=PendingIntent.getService(this,2,new Intent(this,PhoneMirrorService.class).setAction("STOP"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_email).setContentTitle("LotKeys Phone Mirror")
            .setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text)).setContentIntent(open).setOngoing(true)
            .setOnlyAlertOnce(true).setVisibility(Notification.VISIBILITY_SECRET).addAction(new Notification.Action.Builder(null,"Stop mirroring",stop).build()).build();
    }
    private void status(String text){
        if(text.equals(displayed))return;displayed=text;
        getSharedPreferences("bridge",0).edit().putString("mirrorStatus",text).apply();
        getSystemService(NotificationManager.class).notify(NOTIFICATION,notification(text));
    }
    private boolean internet(){
        Network n=connectivity.getActiveNetwork();NetworkCapabilities caps=n==null?null:connectivity.getNetworkCapabilities(n);
        return caps!=null&&caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)&&caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }
    private void loop(){
        int failures=0;
        try{
            String raw=SecureConfig.load(this);if(raw.isEmpty()){status("Pair this phone in the Mirror app first.");return;}
            protocol=new Protocol(raw);
            while(running){
                long waitMs=1800;PowerManager.WakeLock lock=null;
                try{
                    if(!store.allowed()){status("SMS permission is missing. Open Phone Mirror to grant it.");waitMs=10000;}
                    else if(!internet()){protocol.cursor=0;lastHeartbeat=0;status("Internet unavailable — reconnecting automatically. Nothing is queued to send.");waitMs=5000;}
                    else{
                        lock=getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"LotKeys:mirror-request");lock.acquire(60000);
                        long now=System.currentTimeMillis();
                        if(now-lastHeartbeat>8000)heartbeat("");
                        for(JSONObject request:protocol.poll()){
                            if(!running)break;
                            lastHub=System.currentTimeMillis();handle(request);
                        }
                        publishReceipts();now=System.currentTimeMillis();
                        if((dirty&&now-lastInvalidate>900)||(now-lastPeriodic>20000&&now-lastHub<120000)){
                            protocol.publish(new JSONObject().put("kind","invalidate"));dirty=false;lastInvalidate=now;lastPeriodic=now;
                        }
                        failures=0;status("SMS/MMS mirror active · "+store.sourceApp()+" · RCS not included");
                    }
                }catch(Exception ex){
                    failures++;waitMs=Math.min(15000,1800L*(1L<<Math.min(failures,3)));lastHeartbeat=0;protocol.cursor=0;
                    status(ex instanceof SecurityException?"SMS permission was removed. Open Phone Mirror to grant access.":"Relay unavailable — retrying automatically. Check the relay/tunnel if this continues.");
                }finally{if(lock!=null&&lock.isHeld())lock.release();}
                synchronized(wake){try{if(running)wake.wait(waitMs);}catch(InterruptedException ignored){}}
            }
        }catch(Exception ex){status("Pairing could not be opened. Re-paste device.json in Phone Mirror.");}
        finally{running=false;if(protocol!=null){protocol.destroy();protocol=null;}if(instance==this)instance=null;stopSelf();}
    }
    private void heartbeat(String challenge) throws Exception {
        protocol.publish(new JSONObject().put("kind","status").put("challenge",challenge).put("deviceName",Build.MANUFACTURER+" "+Build.MODEL+" · Phone Mirror")
            .put("sourceApp",store.sourceApp()).put("capabilities",new JSONObject().put("text",true).put("reply",true).put("history",true)
            .put("nativeSms",true).put("mmsHistory",true).put("attachments",false).put("mmsSend",false).put("rcs",false).put("notificationOnly",false)));
        lastHeartbeat=System.currentTimeMillis();
    }
    private JSONObject response(JSONObject request,String kind) throws Exception {
        return new JSONObject().put("kind",kind).put("requestId",request.optString("id")).put("target",request.optString("clientId"));
    }
    private void handle(JSONObject request) throws Exception {
        String kind=request.optString("kind");
        if("hello".equals(kind)){heartbeat(request.optString("id"));return;}
        if("send".equals(kind)){send(request);return;}
        if("send-status".equals(kind)){publishReceipt(request.optString("sendId"));return;}
        try{
            if("threads".equals(kind)){
                JSONObject page=store.conversations(request.optInt("offset",0));
                JSONObject out=response(request,"thread-page");for(Iterator<String> it=page.keys();it.hasNext();){String k=it.next();out.put(k,page.get(k));}
                protocol.publish(out);
            }else if("history".equals(kind)){
                String id=request.optString("threadId");JSONObject before=request.optJSONObject("before");
                JSONObject page=store.history(id,before);JSONArray messages=page.getJSONArray("messages"),batch=new JSONArray();int bytes=0,part=0;
                for(int i=0;i<messages.length();i++){
                    JSONObject m=messages.getJSONObject(i);int size=m.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8).length;
                    if(batch.length()>0&&bytes+size>45000){historyPart(request,page,batch,part++,false,before!=null);batch=new JSONArray();bytes=0;}
                    batch.put(m);bytes+=size;
                }
                historyPart(request,page,batch,part,true,before!=null);
            }
        }catch(SecurityException|IllegalArgumentException ex){protocol.publish(response(request,"query-error").put("error",ex.getMessage()));}
        catch(Exception ex){protocol.publish(response(request,"query-error").put("error","Phone database could not be read. Check SMS access in Phone Mirror; private RCS history is not included."));}
    }
    private void historyPart(JSONObject request,JSONObject page,JSONArray messages,int part,boolean done,boolean append)throws Exception{
        protocol.publish(response(request,"history-page").put("threadId",request.getString("threadId")).put("thread",page.getJSONObject("thread"))
            .put("messages",messages).put("part",part).put("done",done).put("append",append).put("hasMore",page.getBoolean("hasMore")).put("nextBefore",page.opt("nextBefore")));
    }
    private void send(JSONObject request) throws Exception {
        String id=request.optString("id");
        if(!id.matches("[A-Za-z0-9_-]{8,120}")){protocol.ack(request,false,"Invalid send request.");return;}
        SharedPreferences ledger=getSharedPreferences("mirror-sends",MODE_PRIVATE);
        synchronized(SmsResultReceiver.class){
            if(ledger.contains(id)){publishReceipt(id);return;}
            try{
                if(!store.allowed()||checkSelfPermission(Manifest.permission.SEND_SMS)!=PackageManager.PERMISSION_GRANTED)throw new SecurityException("Grant SMS read/send permission on the phone.");
                if(!"sms".equals(request.optString("transport")))throw new IllegalArgumentException("This connector sends SMS only. Confirm Send SMS explicitly.");
                JSONObject thread=store.details(request.optString("threadId"));
                String address=thread.optString("address").replaceAll("[ ()\\-.]","");
                if(thread.optBoolean("group")||!thread.optBoolean("canReply")||!PhoneStore.sendable(address))throw new IllegalArgumentException("Use the phone for groups, short codes, or this unsupported recipient.");
                if(!address.equals(request.optString("address").replaceAll("[ ()\\-.]","")))throw new IllegalArgumentException("The phone recipient changed. Refresh the conversation before sending.");
                String text=request.optString("text");if(text.trim().isEmpty()||text.length()>16000)throw new IllegalArgumentException("Enter a message under 16,000 characters.");
                int sub=SmsManager.getDefaultSmsSubscriptionId();
                if(!SubscriptionManager.isValidSubscriptionId(sub))throw new IllegalArgumentException("Choose the default SMS SIM in Android Settings first. LotKeys will not guess which SIM to use.");
                SmsManager manager=SmsManager.getSmsManagerForSubscriptionId(sub);
                ArrayList<String> parts=manager.divideMessage(text);if(parts.size()>12)throw new IllegalArgumentException("Message is too long for this test build (maximum 12 SMS parts).");
                JSONArray results=new JSONArray();for(int i=0;i<parts.size();i++)results.put(0);
                JSONObject row=new JSONObject().put("phase","accepted").put("results",results).put("createdAt",System.currentTimeMillis()).put("updatedAt",System.currentTimeMillis());
                SharedPreferences.Editor edit=ledger.edit();long cutoff=System.currentTimeMillis()-7L*24*60*60*1000;
                for(Map.Entry<String,?> old:ledger.getAll().entrySet())try{if(new JSONObject(String.valueOf(old.getValue())).optLong("createdAt")<cutoff)edit.remove(old.getKey());}catch(Exception ignored){}
                if(ledger.getAll().size()>3000)throw new IllegalArgumentException("Send receipt journal is full. Use the phone until it is reviewed.");
                if(!edit.putString(id,row.toString()).commit())throw new IllegalStateException("Could not reserve the send request safely.");
                ArrayList<PendingIntent> sent=new ArrayList<>();
                for(int i=0;i<parts.size();i++){
                    Intent intent=new Intent(this,SmsResultReceiver.class).setData(Uri.parse("lotkeys-mirror://sent/"+id+"/"+i)).putExtra("requestId",id).putExtra("part",i);
                    sent.add(PendingIntent.getBroadcast(this,0,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
                }
                try{
                    if(parts.size()==1)manager.sendTextMessage(address,null,parts.get(0),sent.get(0),null);
                    else manager.sendMultipartTextMessage(address,null,parts,sent,null);
                }catch(Exception ex){row.put("phase","unknown").put("error","Phone send result is uncertain. Check the phone before retrying.");ledger.edit().putString(id,row.toString()).commit();}
            }catch(Exception ex){
                JSONObject rejected=new JSONObject().put("phase","rejected").put("error",ex.getMessage()==null?"SMS was not submitted.":ex.getMessage()).put("createdAt",System.currentTimeMillis()).put("updatedAt",System.currentTimeMillis());
                ledger.edit().putString(id,rejected.toString()).commit();
            }
        }
        publishReceipt(id);dirty=true;
    }
    private void publishReceipt(String id)throws Exception{
        String raw=getSharedPreferences("mirror-sends",0).getString(id,"");if(raw.isEmpty())return;
        JSONObject r=new JSONObject(raw);String phase=r.optString("phase");
        protocol.publish(new JSONObject().put("kind","ack").put("requestId",id).put("phase",phase).put("ok","sent".equals(phase))
            .put("uncertain","unknown".equals(phase)||"failed".equals(phase)).put("error",r.optString("error")));
        announcedReceipts.put(id,raw);
    }
    private void publishReceipts()throws Exception{
        Map<String,?> rows=getSharedPreferences("mirror-sends",0).getAll();long recent=System.currentTimeMillis()-120000;
        for(Map.Entry<String,?> entry:rows.entrySet()){
            String raw=String.valueOf(entry.getValue());if(raw.equals(announcedReceipts.get(entry.getKey())))continue;
            try{if(new JSONObject(raw).optLong("updatedAt")>=recent)publishReceipt(entry.getKey());}catch(JSONException ignored){}
        }
    }
    @Override public void onDestroy(){
        running=false;signal();if(worker!=null)worker.interrupt();
        if(observer!=null)getContentResolver().unregisterContentObserver(observer);
        if(connectivity!=null&&networkCallback!=null)try{connectivity.unregisterNetworkCallback(networkCallback);}catch(Exception ignored){}
        if(instance==this)instance=null;stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
}
