package ca.lotkeys.bridge;
import android.app.*;
import android.content.*;
import android.os.*;
import android.service.notification.*;
import android.text.TextUtils;
import org.json.JSONObject;
import java.util.*;
import java.util.concurrent.*;
import java.security.SecureRandom;

public final class BridgeNotificationListener extends NotificationListenerService {
    static volatile BridgeNotificationListener instance;
    static volatile String state="No active listener session";
    private ScheduledExecutorService worker;
    private Protocol protocol;
    private final LinkedHashMap<String,Reply> replies=new LinkedHashMap<>();
    private final LinkedHashMap<String,String> lastMessages=new LinkedHashMap<>();
    private Set<String> allowed=new HashSet<>();
    private boolean listening=false;
    private static final int STATUS_ID=8801;
    private static final class Reply {String token,notificationKey,pkg,identity;Notification.Action action;long at;Reply(String t,String n,String p,String i,Notification.Action a){token=t;notificationKey=n;pkg=p;identity=i;action=a;at=System.currentTimeMillis();}}
    public static void reload(Context c){BridgeNotificationListener current=instance;if(current!=null&&current.worker!=null&&!current.worker.isShutdown())current.worker.execute(current::configure);else NotificationListenerService.requestRebind(new ComponentName(c,BridgeNotificationListener.class));}
    @Override public void onListenerConnected(){instance=this;listening=true;if(worker!=null)worker.shutdownNow();worker=Executors.newSingleThreadScheduledExecutor();worker.execute(this::configure);worker.scheduleWithFixedDelay(this::tick,1,2,TimeUnit.SECONDS);}
    @Override public void onListenerDisconnected(){listening=false;state="Notification access disconnected";stop();instance=null;}
    @Override public void onDestroy(){stop();instance=null;super.onDestroy();}
    private void stop(){if(worker!=null)worker.shutdownNow();if(protocol!=null)protocol.destroy();protocol=null;replies.clear();lastMessages.clear();try{getSystemService(NotificationManager.class).cancel(STATUS_ID);}catch(Exception ignored){}}
    private void configure(){
        if(protocol!=null)protocol.destroy();protocol=null;replies.clear();lastMessages.clear();allowed.clear();
        if(!getSharedPreferences("bridge",0).getBoolean("enabled",false)){state="Stopped by user";getSystemService(NotificationManager.class).cancel(STATUS_ID);return;}
        try{String raw=SecureConfig.load(this);protocol=new Protocol(raw);for(String p:getSharedPreferences("bridge",0).getString("packages","").split(","))if(!p.trim().isEmpty())allowed.add(p.trim());state="Waiting for HTTPS relay";statusNotification();
            // Deliberately no SMS database scan and no import of existing notification history.
        }catch(Exception ex){state="Pairing unavailable. Open the companion and reconnect.";protocol=null;}
    }
    private void statusNotification(){try{NotificationManager n=getSystemService(NotificationManager.class);n.createNotificationChannel(new NotificationChannel("bridge","LotKeys bridge session",NotificationManager.IMPORTANCE_LOW));PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);n.notify(STATUS_ID,new Notification.Builder(this,"bridge").setSmallIcon(android.R.drawable.ic_dialog_email).setContentTitle("LotKeys Device Bridge enabled").setContentText("Approved messaging notifications may appear on your paired Hub. Tap to stop.").setContentIntent(open).setOngoing(true).build());}catch(Exception ignored){/* Notification permission may be denied; main screen still exposes state. */}}
    private void tick(){if(protocol==null||!listening)return;try{if(!getSharedPreferences("bridge",0).getBoolean("enabled",false)){configure();return;}protocol.heartbeat(false);for(JSONObject cmd:protocol.poll())if("send".equals(cmd.optString("kind")))sendReply(cmd);state="HTTPS relay reachable · listening for approved app messages";}catch(Exception ex){state="Relay unavailable. Replies are not retried automatically.";}}
    @Override public void onNotificationPosted(StatusBarNotification sbn){if(worker==null||worker.isShutdown()||sbn==null)return;worker.execute(()->capture(sbn));}
    private static String notificationIdentity(StatusBarNotification sbn){
        Notification n=sbn.getNotification();Bundle e=n.extras;if(e==null)return "";
        List<Notification.MessagingStyle.Message> rows=Notification.MessagingStyle.Message.getMessagesFromBundleArray(e.getParcelableArray(Notification.EXTRA_MESSAGES));
        Person person=rows.isEmpty()?null:rows.get(rows.size()-1).getSenderPerson();
        String sender=person==null?"":person.getUri()!=null?person.getUri():person.getKey()!=null?person.getKey():String.valueOf(person.getName());
        return sender+"|"+String.valueOf(e.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE,""))+"|"+String.valueOf(e.getCharSequence(Notification.EXTRA_TITLE,""));
    }
    private void capture(StatusBarNotification sbn){
        if(protocol==null||!allowed.contains(sbn.getPackageName())||sbn.getPackageName().equals(getPackageName()))return;
        try{
            Notification n=sbn.getNotification();if((n.flags&Notification.FLAG_GROUP_SUMMARY)!=0)return;
            Bundle extras=n.extras;if(extras==null)return;String title=String.valueOf(extras.getCharSequence(Notification.EXTRA_TITLE,"Device contact")),body="",address="";
            List<Notification.MessagingStyle.Message> messages=Notification.MessagingStyle.Message.getMessagesFromBundleArray(extras.getParcelableArray(Notification.EXTRA_MESSAGES));
            Notification.MessagingStyle.Message last=messages.isEmpty()?null:messages.get(messages.size()-1);
            if(last!=null){body=last.getText()==null?"":last.getText().toString();Person p=last.getSenderPerson();if(p!=null&&p.getUri()!=null&&p.getUri().startsWith("tel:"))address=p.getUri().substring(4);}
            else body=String.valueOf(extras.getCharSequence(Notification.EXTRA_TEXT,""));
            if(body.trim().isEmpty())return;String lower=body.toLowerCase(Locale.ROOT);if(lower.matches("(?s).*(verification code|one.time code|security code|authentication code|otp\\b).*"))return;
            // The native notification key is exact; a display name is never a send target.
            String identity=notificationIdentity(sbn),thread="android-"+Protocol.digest(sbn.getKey()+"|"+identity),messageId=Protocol.digest(sbn.getKey()+"|"+(last!=null?last.getTimestamp():sbn.getPostTime())+"|"+body);
            if(messageId.equals(lastMessages.get(thread)))return;
            Notification.Action action=null;if(n.actions!=null)for(Notification.Action a:n.actions){if(a.actionIntent==null||!sbn.getPackageName().equals(a.actionIntent.getCreatorPackage()))continue;RemoteInput[] inputs=a.getRemoteInputs();if(inputs!=null)for(RemoteInput input:inputs)if(input.getAllowFreeFormInput()){action=a;break;}if(action!=null)break;}
            for(String prior:new ArrayList<>(replies.keySet())){Reply previous=replies.get(prior);if(!prior.equals(thread)&&previous.notificationKey.equals(sbn.getKey())){replies.remove(prior);lastMessages.remove(prior);protocol.publish(new JSONObject().put("kind","removed").put("threadId",prior).put("purge",true));}}
            Reply old=replies.get(thread);String token=old==null?UUID.randomUUID().toString():old.token;replies.put(thread,new Reply(token,sbn.getKey(),sbn.getPackageName(),identity,action));lastMessages.put(thread,messageId);while(replies.size()>100){String first=replies.keySet().iterator().next();replies.remove(first);lastMessages.remove(first);}
            protocol.heartbeat(false);protocol.publish(new JSONObject().put("kind","message").put("threadId",thread).put("address",address).put("title",title).put("text",body.substring(0,Math.min(16000,body.length()))).put("messageId",messageId).put("replyToken",token).put("canReply",action!=null).put("group",extras.getBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION,false)));
        }catch(Exception ignored){state="A notification could not be relayed. Check the phone; no content logged.";}
    }
    @Override public void onNotificationRemoved(StatusBarNotification sbn){if(worker==null||worker.isShutdown()||sbn==null)return;worker.execute(()->{if(protocol==null||!allowed.contains(sbn.getPackageName()))return;try{for(String id:new ArrayList<>(replies.keySet()))if(replies.get(id).notificationKey.equals(sbn.getKey())){replies.remove(id);lastMessages.remove(id);protocol.publish(new JSONObject().put("kind","removed").put("threadId",id).put("purge",true));}}catch(Exception ignored){}});}
    private void sendReply(JSONObject cmd) throws Exception {
        Reply r=replies.get(cmd.optString("threadId"));String error="";
        try{
            if(r==null||r.action==null||!r.token.equals(cmd.optString("replyToken"))||System.currentTimeMillis()-r.at>30*60*1000)throw new Exception("No current Reply action. Wait for a new message or use the phone.");
            if(!allowed.contains(r.pkg))throw new Exception("Messaging app no longer allowed.");
            boolean stillActive=false;for(StatusBarNotification n:getActiveNotifications())if(n.getKey().equals(r.notificationKey)&&notificationIdentity(n).equals(r.identity)){stillActive=true;break;}
            if(!stillActive)throw new Exception("Notification was dismissed. Use the phone.");
            if(Build.VERSION.SDK_INT>=31&&r.action.isAuthenticationRequired()&&getSystemService(KeyguardManager.class).isDeviceLocked())throw new Exception("Unlock the phone to authorize this reply.");
            String text=cmd.optString("text");if(text.trim().isEmpty()||text.length()>16000)throw new Exception("Invalid reply.");
            Intent intent=new Intent();Bundle results=new Bundle();RemoteInput[] inputs=r.action.getRemoteInputs();for(RemoteInput input:inputs)if(input.getAllowFreeFormInput())results.putCharSequence(input.getResultKey(),text);
            RemoteInput.addResultsToIntent(inputs,intent,results);RemoteInput.setResultsSource(intent,RemoteInput.SOURCE_FREE_FORM_INPUT);r.action.actionIntent.send(this,0,intent);
        }catch(Exception ex){error=ex.getMessage()==null?"Phone did not accept the reply.":ex.getMessage();}
        protocol.ack(cmd,error.isEmpty(),error); // Request accepted by phone is NOT carrier delivery confirmation.
    }
}
