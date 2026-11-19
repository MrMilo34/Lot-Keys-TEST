package ca.lotkeys.connector;

import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/** Source-pinned disposable destination; never enabled by preferences or an upload plan. */
final class SubmissionIsolation {
    static final class Blocked extends IllegalArgumentException {
        Blocked() { super("Background submission is disabled until a verified disposable TEST destination is bound. Originals are retained."); }
    }
    static Policy active() { return new Policy(null); }
    static final class Policy {
        private final String store, account;
        private final Set<String> folders = new HashSet<>(), requests = new HashSet<>(), files = new HashSet<>();
        final boolean enabled;
        Policy(JSONObject binding) {
            boolean valid = false; String root = "", email = "";
            try {
                if (binding != null && binding.optBoolean("enabled") && "lotkeys-disposable-store-v1".equals(binding.optString("kind"))) {
                    root = binding.getString("store"); TransferStore.fileId(root);
                    email = binding.getString("account").trim().toLowerCase(java.util.Locale.ROOT);
                    load(binding.getJSONArray("folderIds"), folders); load(binding.getJSONArray("requestFileIds"), requests); load(binding.getJSONArray("existingFileIds"), files);
                    valid = email.contains("@") && folders.contains(root) && !requests.isEmpty();
                }
            } catch (Exception invalid) { valid = false; }
            enabled = valid; store = root; account = email;
        }
        private static void load(JSONArray input, Set<String> output) throws Exception {
            for (int i = 0; i < input.length(); i++) { String id = input.getString(i); TransferStore.fileId(id); output.add(id); }
        }
        void requireAllowed(JSONObject plan) throws Exception {
            JSONObject scope = plan.optJSONObject("context");
            if (!enabled || plan.optInt("version") != 3 || scope == null || !store.equals(scope.optString("store")) || !account.equalsIgnoreCase(scope.optString("account"))) throw new Blocked();
            JSONArray operations = plan.getJSONArray("finalizers"); if (operations.length() != 1) throw new Blocked();
            JSONObject op = operations.getJSONObject(0), request = op.getJSONObject("request");
            if (!"vehicle-submission".equals(op.optString("type")) || !folders.contains(op.optString("parentId")) || !requests.contains(op.optString("fileId")) || !store.equals(request.getJSONObject("context").optString("rootId")) || !account.equalsIgnoreCase(request.optString("userEmail"))) throw new Blocked();
            JSONArray assets = plan.getJSONArray("assets");
            for (int i = 0; i < assets.length(); i++) {
                JSONObject asset = assets.getJSONObject(i);
                if (!folders.contains(asset.optString("parent")) || !asset.optString("driveId").isEmpty() && !files.contains(asset.optString("driveId"))) throw new Blocked();
            }
            JSONObject destinations = request.getJSONObject("folders");
            for (java.util.Iterator<String> keys = destinations.keys(); keys.hasNext();) { String key = keys.next(), id = destinations.optString(key); if (key.endsWith("Id") && !id.isEmpty() && !folders.contains(id)) throw new Blocked(); }
            JSONObject media = request.getJSONObject("media");
            for (String kind : new String[]{"photos", "videos", "documents"}) {
                JSONArray items = media.getJSONArray(kind);
                for (int i = 0; i < items.length(); i++) { String id = items.getJSONObject(i).optString("driveFileId"); if (!id.isEmpty() && !files.contains(id)) throw new Blocked(); }
            }
        }
    }
}
