package ca.lotkeys.connector;

import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

/** Protocol 3: publish one private More request after all originals are confirmed.
 * This submits to the existing Store processor; it never writes shared Inventory.
 * The capability describes this native primitive; a browser handoff is still needed.
 */
final class SubmissionFinalizer {
    private static final String FILES = "https://www.googleapis.com/drive/v3/files/";
    private final DriveUploadClient client;
    private final DriveUploadClient.Check check;
    SubmissionFinalizer(DriveUploadClient client, DriveUploadClient.Check check) { this.client = client; this.check = check; }

    static void validate(JSONObject plan) throws Exception {
        TransferStore.require(plan.optInt("version") == 3, "This submission needs protocol 3.");
        JSONArray operations = plan.getJSONArray("finalizers");
        TransferStore.require(operations.length() == 1 && "vehicle-submission".equals(operations.getJSONObject(0).optString("type")), "A submission cannot contain Inventory or directory operations.");
        JSONObject op = operations.getJSONObject(0), scope = plan.getJSONObject("context"), request = op.getJSONObject("request");
        TransferStore.fileId(op.getString("fileId")); TransferStore.fileId(op.getString("parentId"));
        String record = scope.getString("record"), requestId = request.optString("id");
        TransferStore.require(requestId.matches("[A-Za-z0-9._-]{1,200}"), "Invalid submission identifier.");
        identity(request, scope);
        TransferStore.require("pending".equals(request.optString("status")) && request.optInt("schemaVersion") == 3 && "vehicleRequest".equals(request.optString("recordType")), "Only a pending Vehicle request can be submitted.");
        TransferStore.require("LotKeys".equals(request.optString("app")) && !request.optString("userName").isEmpty() && !request.optString("createdAt").isEmpty(), "The submission identity is incomplete.");
        String type = request.optString("type");
        TransferStore.require("vehicle-native-create".equals(type) || "vehicle-native-owner-update".equals(type), "This submission requires the guarded Store processor.");
        JSONObject guard = request.getJSONObject("nativeSubmissionGuard"); Object base = guard.opt("baseRevision");
        TransferStore.require(guard.optInt("version") == 1 && guard.has("baseRevision"), "The Inventory revision guard is missing.");
        TransferStore.require("vehicle-native-create".equals(type) ? base == JSONObject.NULL : base instanceof Number && ((Number)base).longValue() > 0 && ((Number)base).doubleValue() == ((Number)base).longValue() && ((Number)base).longValue() <= 9007199254740991L, "Invalid base Inventory revision.");
        JSONObject folders = request.getJSONObject("folders");
        TransferStore.require(op.getString("parentId").equals(folders.optString("pendingFolderId")), "The pending request destination changed.");
        TransferStore.fileId(folders.getString("moreVehicleFolderId"));
        TransferStore.require(record.equals(request.getJSONObject("vehicle").optString("id")), "The Vehicle snapshot changed.");
        Map<String, JSONObject> assets = new HashMap<>();
        JSONArray rows = plan.getJSONArray("assets");
        for (int i = 0; i < rows.length(); i++) {
            JSONObject asset = rows.getJSONObject(i), properties = asset.getJSONObject("properties");
            TransferStore.require("vehicleContributionAsset".equals(properties.optString("lotkeysRole")) && record.equals(properties.optString("lotkeysVehicleId")) && requestId.equals(properties.optString("lotkeysContributionId")), "An original belongs to another submission.");
            TransferStore.require(assets.put(asset.getString("key"), asset) == null, "Duplicate submission original.");
        }
        HashSet<String> referenced = new HashSet<>();
        JSONObject media = request.getJSONObject("media");
        for (String[] kind : new String[][]{{"photos", "photo"}, {"videos", "video"}, {"documents", "document"}}) {
            JSONArray items = media.getJSONArray(kind[0]); HashSet<String> ids = new HashSet<>();
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i); String id = item.optString("id"), key = item.optString("assetKey");
                TransferStore.require(!id.isEmpty() && ids.add(id), "Duplicate or missing submission media identifier.");
                if (key.isEmpty()) { TransferStore.fileId(item.optString("driveFileId")); continue; }
                JSONObject asset = assets.get(key);
                TransferStore.require(asset != null && referenced.add(key) && item.optString("driveFileId").isEmpty(), "An original has an invalid submission reference.");
                JSONObject properties = asset.getJSONObject("properties");
                TransferStore.require(id.equals(properties.optString("lotkeysAssetId")) && kind[1].equals(properties.optString("lotkeysAssetKind")) && asset.getString("parent").equals(item.optString("parentFolderId")), "An original destination or media kind changed.");
            }
        }
        TransferStore.require(referenced.size() == assets.size(), "Every retained original must appear in the submission.");
    }

    private static void identity(JSONObject request, JSONObject scope) throws Exception {
        JSONObject context = request.getJSONObject("context");
        TransferStore.require(scope.getString("record").equals(request.optString("vehicleId")) && scope.getString("store").equals(context.optString("rootId")) && scope.getString("revision").equals(context.optString("revision")) && scope.getString("account").equalsIgnoreCase(request.optString("userEmail")) && scope.getString("account").equalsIgnoreCase(context.optString("email")), "The submission belongs to another account, Store or Vehicle edit.");
    }

    JSONObject payload(TransferStore store, JSONObject batch) throws Exception {
        validate(batch);
        Map<String, JSONObject> confirmed = new HashMap<>(); JSONArray assets = batch.getJSONArray("assets");
        for (int i = 0; i < assets.length(); i++) {
            JSONObject asset = assets.getJSONObject(i), state = store.itemState(batch.getString("id"), i), result = state.optJSONObject("result");
            TransferStore.require(result != null && state.optLong("confirmed", -1) == asset.getLong("size"), "Every original must be confirmed before submitting the Vehicle.");
            TransferStore.fileId(result.getString("id"));
            if (!asset.optString("driveId").isEmpty()) TransferStore.require(asset.getString("driveId").equals(result.getString("id")), "The confirmed original changed its file identifier.");
            confirmed.put(asset.getString("key"), result);
        }
        JSONObject request = new JSONObject(batch.getJSONArray("finalizers").getJSONObject(0).getJSONObject("request").toString());
        for (String kind : new String[]{"photos", "videos", "documents"}) {
            JSONArray items = request.getJSONObject("media").getJSONArray(kind);
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i); String key = item.optString("assetKey");
                if (!key.isEmpty()) { item.put("driveFileId", confirmed.get(key).getString("id")); item.remove("assetKey"); }
            }
        }
        return request;
    }

    void finish(TransferStore store, JSONObject batch) throws Exception {
        JSONObject request = payload(store, batch), op = batch.getJSONArray("finalizers").getJSONObject(0);
        String id = op.getString("fileId"), parent = op.getString("parentId"), body = canonical(request), fingerprint = digest(body);
        verifyWorkspace(parent, request.getJSONObject("folders").getString("moreVehicleFolderId"), batch.getJSONObject("context").getString("record"));
        JSONObject existing = metadata(id);
        if (existing == null) {
            JSONObject properties = new JSONObject().put("lotkeysRole", "vehicleRequest").put("lotkeysVehicleId", request.getString("vehicleId")).put("lotkeysRequestId", request.getString("id")).put("lotkeysRequestType", request.getString("type")).put("lotkeysSubmissionSha256", fingerprint);
            JSONObject meta = new JSONObject().put("id", id).put("name", request.getString("id") + ".json").put("mimeType", "application/json").put("parents", new JSONArray().put(parent)).put("properties", properties).put("appProperties", properties);
            String boundary = "lotkeys_" + fingerprint;
            String multipart = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + meta + "\r\n--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + body + "\r\n--" + boundary + "--\r\n";
            check.run(); DriveUploadClient.Reply reply = client.request("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id", "multipart/related; boundary=" + boundary, multipart.getBytes(StandardCharsets.UTF_8), null, 0, 0, null, null);
            if (reply.status != 409) DriveUploadClient.success(reply);
            existing = metadata(id);
        }
        if (existing == null) throw new TransferFinalizer.Reconcile("The request response is uncertain. Its reserved ID and originals are retained for review.");
        JSONObject properties = existing.optJSONObject("properties"); JSONArray parents = existing.optJSONArray("parents"); boolean sameParent = false;
        for (int i = 0; parents != null && i < parents.length(); i++) sameParent |= parent.equals(parents.optString(i));
        if (!id.equals(existing.optString("id")) || !sameParent || properties == null || !request.getString("id").equals(properties.optString("lotkeysRequestId")) || !request.getString("vehicleId").equals(properties.optString("lotkeysVehicleId")) || !fingerprint.equals(properties.optString("lotkeysSubmissionSha256"))) throw new TransferFinalizer.Reconcile("The reserved request belongs to different work. Nothing was overwritten.");
        JSONObject receipt = json("GET", FILES + id + "?alt=media&supportsAllDrives=true").json();
        identity(receipt, batch.getJSONObject("context"));
        String status = receipt.optString("status");
        if (!request.getString("id").equals(receipt.optString("id")) || !("pending".equals(status) || "approved".equals(status) || "rejected".equals(status) || "dismissed".equals(status) || "withdrawn".equals(status)) || (existing.optBoolean("trashed") && "pending".equals(status))) throw new TransferFinalizer.Reconcile("The saved submission needs review. Its originals are retained.");
        check.run(); store.submissionResult(batch.getString("id"), new JSONObject().put("id", id).put("requestId", request.getString("id")).put("status", status).put("message", receipt.optString("processorError", receipt.optString("processorNote"))));
    }

    private void verifyWorkspace(String parent, String vehicleFolder, String record) throws Exception {
        JSONObject pending = metadata(parent); requireRole(pending, "moreRequestsPending", record);
        JSONArray parents = pending.getJSONArray("parents"); TransferStore.require(parents.length() == 1, "The request folder has an ambiguous parent.");
        JSONObject requests = metadata(parents.getString(0)); requireRole(requests, "moreRequests", record);
        JSONArray roots = requests.getJSONArray("parents"); TransferStore.require(roots.length() == 1 && vehicleFolder.equals(roots.getString(0)), "The request folder moved outside its Vehicle workspace.");
        requireRole(metadata(vehicleFolder), "moreVehicle", record);
    }
    private static void requireRole(JSONObject folder, String role, String record) throws Exception {
        JSONObject properties = folder == null ? null : folder.optJSONObject("properties");
        TransferStore.require(folder != null && !folder.optBoolean("trashed") && "application/vnd.google-apps.folder".equals(folder.optString("mimeType")) && properties != null && role.equals(properties.optString("lotkeysRole")) && record.equals(properties.optString("lotkeysVehicleId")), "The private Vehicle request workspace changed.");
    }
    private JSONObject metadata(String id) throws Exception {
        TransferStore.fileId(id); check.run(); DriveUploadClient.Reply reply = client.request("GET", FILES + id + "?supportsAllDrives=true&fields=id,mimeType,parents,properties,trashed", null, null, null, 0, 0, null, null);
        if (reply.status == 404) return null; DriveUploadClient.success(reply); return reply.json();
    }
    private DriveUploadClient.Reply json(String method, String url) throws Exception { check.run(); DriveUploadClient.Reply reply = client.request(method, url, null, null, null, 0, 0, null, null); DriveUploadClient.success(reply); return reply; }
    private static String canonical(Object value) throws Exception {
        if (value instanceof JSONObject) { JSONObject object = (JSONObject)value; ArrayList<String> keys = new ArrayList<>(); object.keys().forEachRemaining(keys::add); Collections.sort(keys); ArrayList<String> pairs = new ArrayList<>(); for (String key : keys) pairs.add(JSONObject.quote(key) + ":" + canonical(object.get(key))); return "{" + String.join(",", pairs) + "}"; }
        if (value instanceof JSONArray) { JSONArray array = (JSONArray)value; ArrayList<String> values = new ArrayList<>(); for (int i = 0; i < array.length(); i++) values.add(canonical(array.get(i))); return "[" + String.join(",", values) + "]"; }
        return value == null || value == JSONObject.NULL ? "null" : value instanceof String ? JSONObject.quote((String)value) : value.toString();
    }
    private static String digest(String value) throws Exception { StringBuilder out = new StringBuilder(); for (byte b : MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))) out.append(String.format(java.util.Locale.ROOT, "%02x", b & 255)); return out.toString(); }
}
