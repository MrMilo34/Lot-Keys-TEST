package ca.lotkeys.bridge;
import android.app.*;
import android.content.*;
import android.os.*;
import android.service.notification.*;
import android.text.TextUtils;
import org.json.JSONObject;
import java.util.*;
import java.util.concurrent.*;

public final class BridgeNotificationListener extends NotificationListenerService {
    static volatile BridgeNotificationListener instance;
    static volatile String state="No active listener session";
    private ScheduledExecutorService worker;
    private Protocol protocol;
    private final LinkedHashMap<String,Reply> replies=new LinkedHashMap<>();
    private final LinkedHashSet<String> seenMessageIds=new LinkedHashSet<>();
    private final LinkedHashMap<String,JSONObject> recentMessages=new LinkedHashMap<>();
    private Set<String> allowed=new HashSet<>();
    private boolean listening=false;
    private static final int STATUS_ID=8801;

    private static final class Reply {
        String token,notificationKey,pkg,identity;
        Notification.Action action;
        long at;
        Reply(String t,String n,String p,String i,Notification.Action a){
            token=t;notificationKey=n;pkg=p;identity=i;action=a;at=System.currentTimeMillis();
        }
    }

    public static void reload(Context c){
        BridgeNotificationListener current=instance;
        if(current!=null&&current.worker!=null&&!current.worker.isShutdown()) current.worker.execute(current::configure);
        else NotificationListenerService.requestRebind(new ComponentName(c,BridgeNotificationListener.class));
    }

    @Override public void onListenerConnected(){
        instance=this;listening=true;
        if(worker!=null)worker.shutdownNow();
        worker=Executors.newSingleThreadScheduledExecutor();
        worker.execute(this::configure);
        worker.scheduleWithFixedDelay(this::tick,1,2,TimeUnit.SECONDS);
    }

    @Override public void onListenerDisconnected(){
        listening=false;state="Notification access disconnected · requesting reconnect";
        stop();instance=null;
        try{NotificationListenerService.requestRebind(new ComponentName(this,BridgeNotificationListener.class));}catch(Exception ignored){}
    }

    @Override public void onDestroy(){stop();instance=null;super.onDestroy();}

    private void stop(){
        if(worker!=null)worker.shutdownNow();
        if(protocol!=null)protocol.destroy();
        protocol=null;replies.clear();seenMessageIds.clear();recentMessages.clear();
        try{getSystemService(NotificationManager.class).cancel(STATUS_ID);}catch(Exception ignored){}
    }

    private void configure(){
        if(protocol!=null)protocol.destroy();
        protocol=null;replies.clear();seenMessageIds.clear();recentMessages.clear();allowed.clear();

        if(!getSharedPreferences("bridge",0).getBoolean("enabled",false)){
            state="Stopped by user";
            getSystemService(NotificationManager.class).cancel(STATUS_ID);
            return;
        }

        try{
            String raw=SecureConfig.load(this);
            protocol=new Protocol(raw);
            for(String p:getSharedPreferences("bridge",0).getString("packages","").split(","))
                if(!p.trim().isEmpty())allowed.add(p.trim());

            state="Connecting to HTTPS relay…";
            statusNotification();

            // On reconnect, replay only the messaging notifications Android still exposes.
            // This is not a scan of the SMS/RCS database and does not claim full history access.
            try{
                StatusBarNotification[] active=getActiveNotifications();
                if(active!=null)for(StatusBarNotification sbn:active)capture(sbn);
            }catch(Exception ignored){}
        }catch(Exception ex){
            state="Pairing unavailable. Open the companion and reconnect.";
            protocol=null;
        }
    }

    private void statusNotification(){
        try{
            NotificationManager n=getSystemService(NotificationManager.class);
            n.createNotificationChannel(new NotificationChannel("bridge","LotKeys bridge session",NotificationManager.IMPORTANCE_LOW));
            PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
            n.notify(STATUS_ID,new Notification.Builder(this,"bridge")
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setContentTitle("LotKeys Device Bridge enabled")
                .setContentText("Approved messaging notifications may appear on your paired Hub.")
                .setContentIntent(open).setOngoing(true).build());
        }catch(Exception ignored){}
    }

    private void tick(){
        if(protocol==null||!listening)return;
        try{
            if(!getSharedPreferences("bridge",0).getBoolean("enabled",false)){configure();return;}
            protocol.heartbeat(false);
            for(JSONObject cmd:protocol.poll()){
                if("send".equals(cmd.optString("kind")))sendReply(cmd);
                else if("hello".equals(cmd.optString("kind")))replayMirror();
            }
            state="HTTPS relay reachable · listening for approved app messages";
        }catch(Exception ex){
            state="Relay temporarily unavailable · retrying automatically";
        }
    }

    @Override public void onNotificationPosted(StatusBarNotification sbn){
        if(worker==null||worker.isShutdown()||sbn==null)return;
        worker.execute(()->capture(sbn));
    }

    private static String notificationIdentity(StatusBarNotification sbn){
        Notification n=sbn.getNotification();
        Bundle e=n.extras;
        if(e==null)return "";
        String conversation=String.valueOf(e.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE,""));
        String title=String.valueOf(e.getCharSequence(Notification.EXTRA_TITLE,""));
        String shortcut=n.getShortcutId();
        if(!TextUtils.isEmpty(shortcut))return "shortcut:"+shortcut;
        if(!conversation.isEmpty()&&!conversation.equals("null"))return "conversation:"+conversation;
        return "title:"+title;
    }

    private static String addressFromMessages(List<Notification.MessagingStyle.Message> rows){
        for(int i=rows.size()-1;i>=0;i--){
            Person p=rows.get(i).getSenderPerson();
            if(p!=null&&p.getUri()!=null&&p.getUri().startsWith("tel:"))return p.getUri().substring(4);
        }
        return "";
    }

    private static boolean sensitive(String body){
        String lower=body.toLowerCase(Locale.ROOT);
        return lower.matches("(?s).*(verification code|one.time code|security code|authentication code|otp\\b).*");
    }

    private void rememberMessage(String id){
        seenMessageIds.add(id);
        while(seenMessageIds.size()>2500)seenMessageIds.remove(seenMessageIds.iterator().next());
    }

    private void rememberRecent(JSONObject event){
        try{
            String id=event.optString("messageId");
            if(id.isEmpty())return;
            recentMessages.put(id,new JSONObject(event.toString()));
            while(recentMessages.size()>500)recentMessages.remove(recentMessages.keySet().iterator().next());
        }catch(Exception ignored){}
    }

    private void publishObserved(JSONObject event) throws Exception {
        rememberRecent(event);
        protocol.publish(new JSONObject(event.toString()));
    }

    private void replayMirror(){
        if(protocol==null)return;
        try{
            // First refresh anything Android still exposes as an active messaging notification.
            StatusBarNotification[] active=getActiveNotifications();
            if(active!=null)for(StatusBarNotification sbn:active)capture(sbn);

            // Then replay the RAM-only messages already observed during this listener session.
            for(JSONObject cached:new ArrayList<>(recentMessages.values())){
                JSONObject event=new JSONObject(cached.toString());
                String thread=event.optString("threadId");
                Reply r=replies.get(thread);
                boolean canReply=r!=null&&r.action!=null;
                event.put("canReply",canReply);
                event.put("replyToken",canReply?r.token:"");
                protocol.publish(event);
            }
            protocol.heartbeat(true);
        }catch(Exception ignored){
            state="Session mirror replay deferred · live notification bridge remains enabled";
        }
    }

    private void capture(StatusBarNotification sbn){
        if(protocol==null||!allowed.contains(sbn.getPackageName())||sbn.getPackageName().equals(getPackageName()))return;
        try{
            Notification n=sbn.getNotification();
            if((n.flags&Notification.FLAG_GROUP_SUMMARY)!=0)return;
            Bundle extras=n.extras;
            if(extras==null)return;

            String title=String.valueOf(extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE,""));
            if(title.isEmpty()||title.equals("null"))title=String.valueOf(extras.getCharSequence(Notification.EXTRA_TITLE,"Device contact"));

            List<Notification.MessagingStyle.Message> messages=
                Notification.MessagingStyle.Message.getMessagesFromBundleArray(extras.getParcelableArray(Notification.EXTRA_MESSAGES));

            String address=addressFromMessages(messages);
            String identity=notificationIdentity(sbn);
            String basis=sbn.getPackageName()+"|"+identity;
            String thread="android-"+Protocol.digest(basis);

            Notification.Action action=null;
            if(n.actions!=null)for(Notification.Action a:n.actions){
                if(a.actionIntent==null||!sbn.getPackageName().equals(a.actionIntent.getCreatorPackage()))continue;
                RemoteInput[] inputs=a.getRemoteInputs();
                if(inputs!=null)for(RemoteInput input:inputs)if(input.getAllowFreeFormInput()){action=a;break;}
                if(action!=null)break;
            }

            for(String prior:new ArrayList<>(replies.keySet())){
                Reply previous=replies.get(prior);
                if(!prior.equals(thread)&&previous!=null&&previous.notificationKey.equals(sbn.getKey())){
                    replies.remove(prior);
                    protocol.publish(new JSONObject().put("kind","removed").put("threadId",prior).put("purge",false));
                }
            }

            Reply old=replies.get(thread);
            String token=old==null?UUID.randomUUID().toString():old.token;
            replies.put(thread,new Reply(token,sbn.getKey(),sbn.getPackageName(),identity,action));
            while(replies.size()>250)replies.remove(replies.keySet().iterator().next());

            protocol.heartbeat(false);

            boolean published=false;
            if(!messages.isEmpty()){
                for(Notification.MessagingStyle.Message row:messages){
                    String body=row.getText()==null?"":row.getText().toString();
                    if(body.trim().isEmpty()||sensitive(body))continue;
                    Person sender=row.getSenderPerson();
                    boolean outgoing=sender==null;
                    long at=row.getTimestamp()>0?row.getTimestamp():sbn.getPostTime();
                    String senderKey=sender==null?"self":String.valueOf(sender.getKey()!=null?sender.getKey():sender.getName());
                    String messageId=Protocol.digest(thread+"|"+at+"|"+senderKey+"|"+body);
                    if(seenMessageIds.contains(messageId))continue;
                    rememberMessage(messageId);
                    JSONObject event=new JSONObject()
                        .put("kind","message").put("threadId",thread).put("address",address)
                        .put("title",title).put("text",body.substring(0,Math.min(16000,body.length())))
                        .put("messageId",messageId).put("messageAt",at)
                        .put("replyToken",token).put("canReply",action!=null)
                        .put("group",extras.getBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION,false))
                        .put("outgoing",outgoing);
                    publishObserved(event);
                    published=true;
                }
            }

            if(!published&&messages.isEmpty()){
                String body=String.valueOf(extras.getCharSequence(Notification.EXTRA_TEXT,""));
                if(!body.trim().isEmpty()&&!sensitive(body)){
                    String messageId=Protocol.digest(thread+"|"+sbn.getPostTime()+"|"+body);
                    if(!seenMessageIds.contains(messageId)){
                        rememberMessage(messageId);
                        JSONObject event=new JSONObject()
                            .put("kind","message").put("threadId",thread).put("address",address)
                            .put("title",title).put("text",body.substring(0,Math.min(16000,body.length())))
                            .put("messageId",messageId).put("messageAt",sbn.getPostTime())
                            .put("replyToken",token).put("canReply",action!=null)
                            .put("group",extras.getBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION,false))
                            .put("outgoing",false);
                        publishObserved(event);
                    }
                }
            }
        }catch(Exception ignored){
            state="A messaging notification could not be relayed · retry remains enabled";
        }
    }

    @Override public void onNotificationRemoved(StatusBarNotification sbn){
        if(worker==null||worker.isShutdown()||sbn==null)return;
        worker.execute(()->{
            if(protocol==null||!allowed.contains(sbn.getPackageName()))return;
            try{
                for(String id:new ArrayList<>(replies.keySet())){
                    Reply r=replies.get(id);
                    if(r!=null&&r.notificationKey.equals(sbn.getKey())){
                        replies.remove(id);
                        // Notification removal revokes reply authority but must not erase the Hub conversation.
                        protocol.publish(new JSONObject().put("kind","removed").put("threadId",id).put("purge",false));
                    }
                }
            }catch(Exception ignored){}
        });
    }

    private void sendReply(JSONObject cmd) throws Exception {
        Reply r=replies.get(cmd.optString("threadId"));
        String error="";
        try{
            if(r==null||r.action==null||!r.token.equals(cmd.optString("replyToken"))||System.currentTimeMillis()-r.at>30*60*1000)
                throw new Exception("No current Reply action. Wait for a new message or use the phone.");
            if(!allowed.contains(r.pkg))throw new Exception("Messaging app no longer allowed.");

            boolean stillActive=false;
            for(StatusBarNotification n:getActiveNotifications())
                if(n.getKey().equals(r.notificationKey)&&notificationIdentity(n).equals(r.identity)){stillActive=true;break;}
            if(!stillActive)throw new Exception("Notification is no longer active. Wait for a new message or use the phone.");

            if(Build.VERSION.SDK_INT>=31&&r.action.isAuthenticationRequired()&&getSystemService(KeyguardManager.class).isDeviceLocked())
                throw new Exception("Unlock the phone to authorize this reply.");

            String text=cmd.optString("text");
            if(text.trim().isEmpty()||text.length()>16000)throw new Exception("Invalid reply.");

            Intent intent=new Intent();
            Bundle results=new Bundle();
            RemoteInput[] inputs=r.action.getRemoteInputs();
            for(RemoteInput input:inputs)if(input.getAllowFreeFormInput())results.putCharSequence(input.getResultKey(),text);
            RemoteInput.addResultsToIntent(inputs,intent,results);
            RemoteInput.setResultsSource(intent,RemoteInput.SOURCE_FREE_FORM_INPUT);
            r.action.actionIntent.send(this,0,intent);
        }catch(Exception ex){
            error=ex.getMessage()==null?"Phone did not accept the reply.":ex.getMessage();
        }
        protocol.ack(cmd,error.isEmpty(),error);
    }
}
