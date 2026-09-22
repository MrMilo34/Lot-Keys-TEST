package ca.lotkeys.bridge;

import android.Manifest;
import android.content.Context;
import android.content.ContentResolver;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.Telephony;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Read-only view of Android's SMS/MMS provider. Never creates contacts or writes messages. */
final class PhoneStore {
    private final Context context;
    private final ContentResolver resolver;
    static final int PAGE = 40;
    PhoneStore(Context context) { this.context=context; resolver=context.getContentResolver(); }
    boolean allowed() { return context.checkSelfPermission(Manifest.permission.READ_SMS)==PackageManager.PERMISSION_GRANTED; }
    void requireRead() { if(!allowed())throw new SecurityException("Allow SMS access in the LotKeys Phone Mirror app on your phone."); }
    static String str(Cursor c,String k) { int i=c.getColumnIndex(k); return i<0||c.isNull(i)?"":c.getString(i); }
    static long num(Cursor c,String k) { int i=c.getColumnIndex(k); return i<0||c.isNull(i)?0:c.getLong(i); }
    static String clip(String s,int length){return s.length()<=length?s:s.substring(0,length)+"…";}
    String sourceApp() {
        String pkg=Telephony.Sms.getDefaultSmsPackage(context);
        if(pkg==null)return "Default SMS app not selected";
        try{return String.valueOf(context.getPackageManager().getApplicationLabel(context.getPackageManager().getApplicationInfo(pkg,0)));}
        catch(Exception ignored){return pkg;}
    }
    private Uri threadsUri(){return Telephony.Threads.CONTENT_URI.buildUpon().appendQueryParameter("simple","true").build();}
    JSONObject conversations(int offset) throws Exception {
        requireRead(); offset=Math.max(0,Math.min(offset,100000));
        JSONArray rows=new JSONArray(); int total=0;
        try(Cursor c=resolver.query(threadsUri(),null,"message_count > 0",null,"date DESC, _id DESC")) {
            if(c==null)throw new IOException("Android did not return its conversation database.");
            total=c.getCount();
            if(offset<total&&c.moveToPosition(offset)) do { rows.put(thread(c)); } while(rows.length()<PAGE&&c.moveToNext());
        }
        return new JSONObject().put("threads",rows).put("offset",offset).put("nextOffset",offset+rows.length()).put("total",total).put("hasMore",offset+rows.length()<total);
    }
    JSONObject details(String id) throws Exception {
        requireRead();long tid=threadNumber(id);
        try(Cursor c=resolver.query(threadsUri(),null,"_id = ?",new String[]{String.valueOf(tid)},null)) {
            if(c!=null&&c.moveToFirst())return thread(c);
        }
        throw new IOException("This conversation is no longer in the phone's SMS/MMS database.");
    }
    static long threadNumber(String id) {
        if(id==null||!id.matches("smsmms-[0-9]{1,18}"))throw new IllegalArgumentException("Invalid phone conversation ID.");
        return Long.parseLong(id.substring(7));
    }
    private JSONObject thread(Cursor c) throws Exception {
        long id=num(c,"_id"); String recipientIds=str(c,"recipient_ids").trim(); boolean multi=recipientIds.split("\\s+").length>1; List<String> people=addresses(recipientIds);
        if(people.isEmpty()&&!multi) {
            try(Cursor s=resolver.query(Telephony.Sms.CONTENT_URI,new String[]{"address"},"thread_id = ? AND type != 3",new String[]{String.valueOf(id)},"date DESC, _id DESC")) {
                if(s!=null&&s.moveToFirst()&&!str(s,"address").isEmpty())people.add(str(s,"address"));
            }
        }
        String address=!multi&&people.size()==1?people.get(0):"";
        String title=people.isEmpty()?"Conversation "+id:String.join(", ",people);
        return new JSONObject().put("id","smsmms-"+id).put("title",clip(title,300)).put("address",address).put("participants",new JSONArray(people))
            .put("group",multi||people.size()>1).put("at",num(c,"date")).put("preview",clip(str(c,"snippet"),350))
            .put("unread",num(c,"read")==0?1:0).put("count",num(c,"message_count")).put("canReply",!multi&&people.size()==1&&sendable(address))
            .put("transport","sms-mms");
    }
    private List<String> addresses(String ids) {
        List<String> result=new ArrayList<>();
        for(String id:ids.trim().split("\\s+")) {
            if(!id.matches("[0-9]+"))continue;
            try(Cursor c=resolver.query(Uri.parse("content://mms-sms/canonical-addresses"),new String[]{"address"},"_id = ?",new String[]{id},null)) {
                if(c!=null&&c.moveToFirst()){String a=str(c,"address");if(!a.isEmpty()&&!result.contains(a))result.add(a);}
            }catch(RuntimeException ignored){ /* OEM fallback below uses SMS address, never guesses a group recipient. */ }
        }
        return result;
    }
    static boolean sendable(String address) {return address!=null&&address.replaceAll("[ ()\\-.]","").matches("\\+?[0-9]{7,15}");}
    private static String orderKey(String kind,long id){return kind+String.format(Locale.ROOT,"%020d",id);}
    private static final Comparator<JSONObject> ORDER=(a,b)-> {
        int time=Long.compare(b.optLong("at"),a.optLong("at"));return time!=0?time:b.optString("sort").compareTo(a.optString("sort"));
    };
    private static boolean older(JSONObject m,JSONObject before){
        if(before==null)return true;
        long at=before.optLong("at",Long.MAX_VALUE);
        return m.optLong("at")<at||(m.optLong("at")==at&&m.optString("sort").compareTo(before.optString("sort"))<0);
    }
    JSONObject history(String threadId,JSONObject before) throws Exception {
        requireRead(); long tid=threadNumber(threadId);List<JSONObject> messages=new ArrayList<>();
        long beforeAt=before==null?Long.MAX_VALUE:before.optLong("at",Long.MAX_VALUE);
        String[] args={String.valueOf(tid),String.valueOf(beforeAt)};
        try(Cursor c=resolver.query(Telephony.Sms.CONTENT_URI,new String[]{"_id","body","date","type","status","address","read"},"thread_id = ? AND type != 3 AND date <= ?",args,"date DESC, _id DESC")) {
            if(c==null)throw new IOException("SMS history is unavailable.");
            int count=0;
            while(c.moveToNext()&&count<PAGE+1){
                long id=num(c,"_id"),type=num(c,"type");
                JSONObject m=new JSONObject().put("id","sms-"+id).put("sort",orderKey("sms",id)).put("text",clip(str(c,"body"),16000))
                    .put("at",num(c,"date")).put("outgoing",type!=1).put("transport","SMS")
                    .put("state",type==5?"Failed on phone":type==4||type==6?"Pending on phone":"");
                if(older(m,before)){messages.add(m);count++;}
            }
        }
        try(Cursor c=resolver.query(Telephony.Mms.CONTENT_URI,new String[]{"_id","date","msg_box","sub","m_type"},
            "thread_id = ? AND msg_box != 3 AND date <= ?",new String[]{String.valueOf(tid),String.valueOf(beforeAt/1000)},"date DESC, _id DESC")) {
            if(c==null)throw new IOException("MMS history is unavailable.");int count=0;
            while(c.moveToNext()&&count<PAGE+1){
                long id=num(c,"_id"),type=num(c,"m_type");
                if(type!=128&&type!=132&&type!=130)continue;
                JSONObject m=new JSONObject().put("id","mms-"+id).put("sort",orderKey("mms",id)).put("at",num(c,"date")*1000)
                    .put("outgoing",num(c,"msg_box")!=1).put("transport","MMS").put("state",type==130?"MMS awaiting download on phone":"");
                if(!older(m,before))continue;
                m.put("text",mmsText(id,str(c,"sub"))); messages.add(m);count++;
            }
        }
        messages.sort(ORDER);boolean more=messages.size()>PAGE;if(more)messages=new ArrayList<>(messages.subList(0,PAGE));
        JSONObject next=messages.isEmpty()?null:new JSONObject().put("at",messages.get(messages.size()-1).optLong("at")).put("sort",messages.get(messages.size()-1).optString("sort"));
        return new JSONObject().put("thread",details(threadId)).put("messages",new JSONArray(messages)).put("hasMore",more).put("nextBefore",next==null?JSONObject.NULL:next);
    }
    private String mmsText(long mid,String subject) throws Exception {
        StringBuilder text=new StringBuilder();int attachments=0;
        try(Cursor p=resolver.query(Uri.parse("content://mms/part"),new String[]{"_id","ct","text","_data"},"mid = ?",new String[]{String.valueOf(mid)},"seq ASC")) {
            if(p==null)throw new IOException("MMS parts could not be read.");
            while(p.moveToNext()){
                String ct=str(p,"ct");
                if("text/plain".equals(ct)){
                    String value=str(p,"text");
                    if(value.isEmpty()&&!str(p,"_data").isEmpty()){
                        try(InputStream in=resolver.openInputStream(Uri.parse("content://mms/part/"+num(p,"_id")))){
                            if(in!=null){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[2048];int n;while(out.size()<16000&&(n=in.read(b,0,Math.min(b.length,16000-out.size())))>0)out.write(b,0,n);value=new String(out.toByteArray(),StandardCharsets.UTF_8);}
                        }
                    }
                    if(text.length()<16000){if(text.length()>0)text.append('\n');text.append(clip(value,16000-text.length()));}
                }else if(!"application/smil".equals(ct))attachments++;
            }
        }
        if(!subject.isEmpty()&&!"null".equals(subject))text.insert(0,clip(subject,300)+"\n");
        if(attachments>0)text.append("\n[").append(attachments).append(" MMS attachment(s) — open on phone]");
        return text.length()==0?"[MMS — open on phone]":clip(text.toString(),16000);
    }
}
