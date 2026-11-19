package ca.lotkeys.connector;

import android.content.Context;
import android.util.Base64;
import java.io.File;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class) @Config(sdk = {35, 36})
public class SubmissionIsolationTest {
    @Test public void defaultOffRejectsSpoofedPlanBeforeRetainingBytes() throws Exception {
        JSONObject plan = SubmissionFinalizerTest.plan().put("testOnly", true).put("enabled", true);
        assertFalse(SubmissionIsolation.active().enabled);
        TransferStore store = new TransferStore(RuntimeEnvironment.getApplication());
        assertThrows(SubmissionIsolation.Blocked.class, () -> store.prepare(plan));
        assertTrue(store.pending().isEmpty());
    }
    @Test public void fixtureBindingAllowsOnlyPinnedAccountStoreFoldersAndRequest() throws Exception {
        SubmissionIsolation.Policy policy = SubmissionFinalizerTest.isolation();
        JSONObject plan = SubmissionFinalizerTest.plan(); policy.requireAllowed(plan);
        for (String mutation : new String[]{"account", "store", "asset", "request", "file", "existing"}) {
            JSONObject changed = new JSONObject(plan.toString());
            if (mutation.equals("account")) changed.getJSONObject("context").put("account", "other@example.test");
            if (mutation.equals("store")) changed.getJSONObject("context").put("store", "live-store-123");
            if (mutation.equals("asset")) changed.getJSONArray("assets").getJSONObject(0).put("parent", "live-photos-123");
            if (mutation.equals("request")) changed.getJSONArray("finalizers").getJSONObject(0).put("parentId", "live-pending-123");
            if (mutation.equals("file")) changed.getJSONArray("finalizers").getJSONObject(0).put("fileId", "live-request-123");
            if (mutation.equals("existing")) changed.getJSONArray("assets").getJSONObject(0).put("driveId", "live-original-123");
            assertThrows(mutation, SubmissionIsolation.Blocked.class, () -> policy.requireAllowed(changed));
        }
    }
    @Test public void retainedProtocolThreeCannotUploadFinalizeAcknowledgeOrReleaseAfterRestart() throws Exception {
        Context context = RuntimeEnvironment.getApplication();
        org.robolectric.shadows.ShadowStatFs.registerStats(new File(context.getFilesDir(), "transfers").getAbsolutePath(), 1024 * 1024, 512 * 1024, 512 * 1024);
        TransferStore fixture = new TransferStore(context, SubmissionFinalizerTest.isolation());
        JSONObject staged = fixture.prepare(SubmissionFinalizerTest.plan()); String id = staged.getString("id");
        fixture.append(id, 0, 0, Base64.encodeToString(new byte[]{1,2}, Base64.NO_WRAP));fixture.commit(id);
        TransferStore recovered = new TransferStore(context); JSONObject batch = recovered.get(id); final int[] requests = {0};
        DriveUploadClient client = new DriveUploadClient(null, "user@example.test", null, () -> {}) {
            @Override Reply request(String method, String url, String type, byte[] bytes, File source, long offset, long length, String range, String match) throws Exception { requests[0]++; throw new AssertionError("No Google access expected"); }
        };
        assertThrows(SubmissionIsolation.Blocked.class, () -> client.upload(recovered, batch, 0));
        assertThrows(SubmissionIsolation.Blocked.class, () -> new SubmissionFinalizer(client, () -> {}).finish(recovered, batch));
        assertThrows(SubmissionIsolation.Blocked.class, () -> new TransferFinalizer(client, () -> {}).finish(recovered, batch));
        assertThrows(SubmissionIsolation.Blocked.class, () -> recovered.commit(id));
        recovered.state(id, "needs_reconcile", "Fixture retained");
        assertThrows(SubmissionIsolation.Blocked.class, () -> recovered.acknowledge(id));
        recovered.state(id, "complete", "Fixture retained");
        assertThrows(SubmissionIsolation.Blocked.class, () -> recovered.releaseOriginals(id));
        assertEquals(0, requests[0]);assertEquals(2, recovered.source(id, 0).length());
    }
    @Test public void originalProtocolOneAndTwoAreNotBlockedByTheNewGate() throws Exception {
        TransferStore store = new TransferStore(RuntimeEnvironment.getApplication());
        store.requireSubmissionAllowed(new JSONObject().put("version", 1));
        store.requireSubmissionAllowed(new JSONObject().put("version", 2));
        JSONObject disguised = SubmissionFinalizerTest.plan().put("version", 2);
        assertThrows(SubmissionIsolation.Blocked.class, () -> store.requireSubmissionAllowed(disguised));
    }
}
