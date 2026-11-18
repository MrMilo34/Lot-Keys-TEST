package ca.lotkeys.connector;

import android.content.Context;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.CancellationException;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class) @Config(sdk = {35, 36})
public class SubmissionFinalizerTest {
    private TransferStore store;
    @Before public void before() {
        Context context = RuntimeEnvironment.getApplication();
        org.robolectric.shadows.ShadowStatFs.registerStats(new File(context.getFilesDir(), "transfers").getAbsolutePath(), 1024 * 1024, 512 * 1024, 512 * 1024);
        store = new TransferStore(context);
    }
    private JSONObject plan() throws Exception {
        JSONObject request = new JSONObject().put("schemaVersion", 3).put("app", "LotKeys").put("recordType", "vehicleRequest")
            .put("id", "VCREATE-vehicle-123-one").put("type", "vehicle-create").put("status", "pending").put("vehicleId", "vehicle-123")
            .put("userName", "Regular user").put("userEmail", "user@example.test").put("createdAt", "2026-11-18T12:00:00Z")
            .put("context", new JSONObject().put("rootId", "store-folder-123").put("email", "user@example.test").put("revision", "1"))
            .put("folders", new JSONObject().put("pendingFolderId", "pending-folder-123").put("moreVehicleFolderId", "workspace-folder-123"))
            .put("vehicle", new JSONObject().put("id", "vehicle-123").put("price", 12345))
            .put("media", new JSONObject().put("photos", new JSONArray().put(new JSONObject().put("id", "photo-one").put("assetKey", "photo:photo-one").put("parentFolderId", "photos-folder-123").put("status", "pending")))
                .put("videos", new JSONArray()).put("documents", new JSONArray()));
        JSONObject asset = new JSONObject().put("key", "photo:photo-one").put("name", "original.jpg").put("type", "image/jpeg").put("parent", "photos-folder-123").put("size", 2)
            .put("properties", new JSONObject().put("lotkeysRole", "vehicleContributionAsset").put("lotkeysVehicleId", "vehicle-123").put("lotkeysContributionId", request.getString("id")).put("lotkeysAssetId", "photo-one").put("lotkeysAssetKind", "photo"));
        return new JSONObject().put("version", 3).put("key", UUID.randomUUID().toString())
            .put("context", new JSONObject().put("account", "user@example.test").put("store", "store-folder-123").put("record", "vehicle-123").put("revision", "1"))
            .put("assets", new JSONArray().put(asset))
            .put("finalizers", new JSONArray().put(new JSONObject().put("type", "vehicle-submission").put("fileId", "request-file-123").put("parentId", "pending-folder-123").put("request", request)));
    }
    private JSONObject staged(boolean confirmed) throws Exception {
        JSONObject prepared = store.prepare(plan()); String id = prepared.getString("id");
        store.append(id, 0, 0, Base64.encodeToString(new byte[]{1,2}, Base64.NO_WRAP)); store.commit(id);
        if (confirmed) store.itemState(id, 0, new JSONObject().put("confirmed", 2).put("result", new JSONObject().put("id", "photo-file-123")));
        return store.get(id);
    }
    private static JSONObject request(JSONObject plan) throws Exception { return plan.getJSONArray("finalizers").getJSONObject(0).getJSONObject("request"); }
    private final class Remote extends DriveUploadClient {
        int posts, reads, denied; boolean loseReply, conflict; JSONObject file, receipt;
        Remote() { super(null, "user@example.test", null, () -> {}); }
        private JSONObject folder(String id, String parent, String role) throws Exception {
            return new JSONObject().put("id", id).put("mimeType", "application/vnd.google-apps.folder").put("parents", new JSONArray().put(parent))
                .put("properties", new JSONObject().put("lotkeysRole", role).put("lotkeysVehicleId", "vehicle-123"));
        }
        @Override Reply request(String method, String url, String type, byte[] bytes, File source, long offset, long length, String range, String match) throws Exception {
            Reply reply = new Reply(); reply.status = 200;
            if (method.equals("POST")) {
                posts++; assertTrue(url.contains("uploadType=multipart")); assertNull(source); assertNull(match);
                String[] parts = new String(bytes, StandardCharsets.UTF_8).split("\r\n\r\n");
                file = new JSONObject(parts[1].substring(0, parts[1].indexOf("\r\n--")));
                receipt = new JSONObject(parts[2].substring(0, parts[2].indexOf("\r\n--")));
                if (loseReply) { loseReply = false; throw new java.io.IOException("accepted, response lost"); }
                reply.status = conflict ? 409 : 201; reply.text = "{\"id\":\"request-file-123\"}"; return reply;
            }
            assertEquals("GET", method); reads++;
            if (denied != 0) { reply.status = denied; return reply; }
            if (url.contains("pending-folder-123?")) reply.text = folder("pending-folder-123", "requests-folder-123", "moreRequestsPending").toString();
            else if (url.contains("requests-folder-123?")) reply.text = folder("requests-folder-123", "workspace-folder-123", "moreRequests").toString();
            else if (url.contains("workspace-folder-123?")) reply.text = folder("workspace-folder-123", "user-more-123", "moreVehicle").toString();
            else if (file == null) reply.status = 404;
            else reply.text = (url.contains("alt=media") ? receipt : file).toString();
            return reply;
        }
    }
    @Test public void noRequestIsWrittenUntilEveryOriginalIsConfirmed() throws Exception {
        JSONObject batch = staged(false); Remote remote = new Remote();
        assertThrows(IllegalArgumentException.class, () -> new SubmissionFinalizer(remote, () -> {}).finish(store, batch));
        assertEquals(0, remote.reads); assertEquals(0, remote.posts); assertEquals(2, store.source(batch.getString("id"), 0).length());
    }
    @Test public void completeMediaPublishesOnlyThePrivateRequestAndPersistsItsReceipt() throws Exception {
        JSONObject batch = staged(true); Remote remote = new Remote();
        new TransferFinalizer(remote, () -> {}).finish(store, batch);
        assertEquals(1, remote.posts); assertEquals("pending-folder-123", remote.file.getJSONArray("parents").getString(0));
        assertEquals("vehicleRequest", remote.file.getJSONObject("properties").getString("lotkeysRole"));
        assertEquals("photo-file-123", remote.receipt.getJSONObject("media").getJSONArray("photos").getJSONObject(0).getString("driveFileId"));
        assertFalse(remote.receipt.getJSONObject("media").getJSONArray("photos").getJSONObject(0).has("assetKey"));
        assertTrue(request(batch).getJSONObject("media").getJSONArray("photos").getJSONObject(0).has("assetKey"));
        TransferStore recovered = new TransferStore(RuntimeEnvironment.getApplication());
        assertEquals("request-file-123", recovered.get(batch.getString("id")).getJSONObject("finalizerResults").getJSONObject("submission").getString("id"));
        assertEquals(2, recovered.source(batch.getString("id"), 0).length());
        assertThrows(IllegalArgumentException.class, () -> recovered.releaseOriginals(batch.getString("id")));
    }
    @Test public void lostCreateReplyAndProcessorApprovalNeverCreateOrRewriteAnotherRequest() throws Exception {
        JSONObject batch = staged(true); Remote remote = new Remote(); remote.loseReply = true;
        assertThrows(java.io.IOException.class, () -> new SubmissionFinalizer(remote, () -> {}).finish(store, batch));
        remote.receipt.put("status", "approved").put("processorNote", "already published"); remote.file.put("trashed", true);
        new SubmissionFinalizer(remote, () -> {}).finish(new TransferStore(RuntimeEnvironment.getApplication()), batch);
        assertEquals(1, remote.posts); assertEquals("already published", remote.receipt.getString("processorNote"));
        assertEquals("approved", store.get(batch.getString("id")).getJSONObject("finalizerResults").getJSONObject("submission").getString("status"));
    }
    @Test public void rejectedProcessorReceiptIsKeptWithoutReplayingItAsPending() throws Exception {
        JSONObject batch = staged(true); Remote remote = new Remote(); remote.loseReply = true;
        assertThrows(java.io.IOException.class, () -> new SubmissionFinalizer(remote, () -> {}).finish(store, batch));
        remote.receipt.put("status", "rejected").put("processorError", "requires review");
        new SubmissionFinalizer(remote, () -> {}).finish(store, batch);
        assertEquals(1, remote.posts); assertEquals("rejected", store.get(batch.getString("id")).getJSONObject("finalizerResults").getJSONObject("submission").getString("status"));
    }
    @Test public void conflictChecksTheSameReservedFileInsteadOfUsingAnUpdate() throws Exception {
        JSONObject batch = staged(true); Remote remote = new Remote(); remote.conflict = true;
        new SubmissionFinalizer(remote, () -> {}).finish(store, batch); assertEquals(1, remote.posts);
    }
    @Test public void aForeignReservedFileIsNeverReplaced() throws Exception {
        JSONObject batch = staged(true); Remote remote = new Remote(); remote.loseReply = true;
        assertThrows(java.io.IOException.class, () -> new SubmissionFinalizer(remote, () -> {}).finish(store, batch));
        remote.file.put("parents", new JSONArray().put("another-folder-123"));
        assertThrows(TransferFinalizer.Reconcile.class, () -> new SubmissionFinalizer(remote, () -> {}).finish(store, batch)); assertEquals(1, remote.posts);
    }
    @Test public void changedReceiptIdentityStopsWithoutDiscardingOriginals() throws Exception {
        JSONObject batch = staged(true); Remote remote = new Remote(); remote.loseReply = true;
        assertThrows(java.io.IOException.class, () -> new SubmissionFinalizer(remote, () -> {}).finish(store, batch));
        remote.receipt.put("userEmail", "other@example.test");
        assertThrows(IllegalArgumentException.class, () -> new SubmissionFinalizer(remote, () -> {}).finish(store, batch));
        assertEquals(1, remote.posts); assertEquals(2, store.source(batch.getString("id"), 0).length());
    }
    @Test public void permissionDenialAndContextCancellationCannotPublish() throws Exception {
        JSONObject batch = staged(true); Remote remote = new Remote(); remote.denied = 403;
        assertThrows(DriveUploadClient.RemoteError.class, () -> new SubmissionFinalizer(remote, () -> {}).finish(store, batch)); assertEquals(0, remote.posts);
        assertThrows(CancellationException.class, () -> new SubmissionFinalizer(remote, () -> { throw new CancellationException(); }).finish(store, batch)); assertEquals(0, remote.posts);
    }
    @Test public void crossAccountStoreAndRevisionPlansAreRejectedBeforeStaging() throws Exception {
        for (String field : new String[]{"account", "store", "revision"}) {
            JSONObject plan = plan(); plan.getJSONObject("context").put(field, "different");
            assertThrows(IllegalArgumentException.class, () -> store.prepare(plan));
        }
    }
    @Test public void legacyProtocolsAndMixedInventoryOperationsCannotSubmitRequests() throws Exception {
        for (int version : new int[]{1,2}) { JSONObject plan = plan(); plan.put("version", version); assertThrows(IllegalArgumentException.class, () -> store.prepare(plan)); }
        JSONObject plan = plan(); plan.getJSONArray("finalizers").put(new JSONObject().put("type", "vehicle-cover"));
        assertThrows(IllegalArgumentException.class, () -> store.prepare(plan));
    }
    @Test public void anUnreferencedOriginalOrChangedMediaDestinationCannotBeCommitted() throws Exception {
        JSONObject plan = plan(); request(plan).getJSONObject("media").put("photos", new JSONArray());
        assertThrows(IllegalArgumentException.class, () -> store.prepare(plan));
        JSONObject changed = plan(); request(changed).getJSONObject("media").getJSONArray("photos").getJSONObject(0).put("parentFolderId", "another-folder-123");
        assertThrows(IllegalArgumentException.class, () -> store.prepare(changed));
    }
}
