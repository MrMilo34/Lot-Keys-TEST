package ca.lotkeys.connector;

import android.Manifest;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.UserRecoverableAuthException;
import com.google.android.gms.common.AccountPicker;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

/** One-time, contextual Android permission setup. The normal messaging interface remains LotKeys. */
public final class MainActivity extends Activity {
    private static final int REQUEST_MESSAGES = 41;
    private static final int REQUEST_CONTACTS = 42;
    private static final int REQUEST_NOTIFICATIONS = 43;
    private static final int REQUEST_GOOGLE_ACCOUNT = 44;
    private static final int REQUEST_GOOGLE_AUTHORIZATION = 45;
    private static final String POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";
    private static final String TEST_URL = "https://mrmilo34.github.io/Lot-Keys-TEST/?build=095004";
    private LinearLayout body;
    private Account pendingGoogleAccount;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        render();
    }

    @Override public void onResume() {
        super.onResume();
        render();
    }

    private void render() {
        ScrollView scroll = new ScrollView(this);
        body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(24), dp(28), dp(24), dp(36));
        body.setBackgroundColor(Color.rgb(14, 16, 20));
        scroll.addView(body);
        setContentView(scroll);

        text("LotKeys", 30, Color.WHITE, true);
        text("Phone Connection · V0.9.5.04 TEST", 18, Color.rgb(100, 181, 246), true);

        PhoneStore store = new PhoneStore(this);
        boolean messages = requiredMessagesGranted();
        boolean contacts = store.canReadContacts();
        boolean notifications = notificationsGranted();

        if (!messages) {
            step("1 of 5 · Connect Phone Messaging");
            text("LotKeys will mirror the SMS/MMS history already on this phone and send only the replies you request. " +
                store.sourceApp() + " remains your default messaging app. LotKeys will not become the default messenger.", 16, Color.LTGRAY, false);
            button("Continue to Messages access", this::explainMessages, true);
            footer();
            return;
        }

        if (!contacts && !prefs().getBoolean("contactsSkipped", false)) {
            step("2 of 5 · Contact Names (Optional)");
            text("Allow Contacts so a number already saved on this phone keeps its familiar name in LotKeys. " +
                "Declining does not block messaging; LotKeys will show the phone number instead.", 16, Color.LTGRAY, false);
            button("Allow Contact Names", () -> requestPermissions(new String[]{Manifest.permission.READ_CONTACTS}, REQUEST_CONTACTS), true);
            button("Not Now · Use Numbers", () -> { prefs().edit().putBoolean("contactsSkipped", true).apply(); render(); }, false);
            footer();
            return;
        }

        if (!notifications) {
            step("3 of 5 · Stay Connected");
            text("Android requires a quiet connection-status notification while the protected phone layer is available. " +
                "This is not a second customer-message alert and it does not replace your normal messaging notifications.", 16, Color.LTGRAY, false);
            button("Allow Connection Status", () -> requestPermissions(
                new String[]{POST_NOTIFICATIONS}, REQUEST_NOTIFICATIONS), true);
            footer();
            return;
        }

        String relayAccount = DriveRelay.account(this);
        if (!DriveRelay.wasAuthorized(this)) {
            step("4 of 5 · PC Pairing Account");
            text("Choose the same Google account already used by LotKeys. Android uses only its private app-data space to discover pairing requests and carry end-to-end encrypted frames while the phone browser is closed. Your password is not shared with LotKeys.", 16, Color.LTGRAY, false);
            button(relayAccount.isEmpty() ? "Choose LotKeys Google Account" : "Finish Google Pairing Access", this::chooseGoogleAccount, true);
            if (!relayAccount.isEmpty()) text("Selected: " + relayAccount, 14, Color.rgb(145, 151, 161), false);
            footer();
            return;
        }

        JSONObject pending = DriveRelay.pendingRequest(this);
        if (pending != null && pending.optLong("expiresAt") > System.currentTimeMillis()) {
            renderPairRequest(pending);
            footer();
            return;
        }

        step("5 of 5 · Pair a Computer");
        text("Android access is ready. Open LotKeys below to link this phone to the same LotKeys account. " +
            "A new computer still needs the matching four-digit approval on this phone. After approval, the quiet Android connection keeps the paired PC available even when the phone browser is closed. Media opens in your default messaging app so you can review the recipient and press Send.", 16, Color.LTGRAY, false);
        statusLine("Messages", true, "SMS/MMS read, SMS reply, reviewed media handoff");
        statusLine("Contact names", contacts, contacts ? "allowed" : "using phone numbers");
        statusLine("Coverage", false, "SMS/MMS only · RCS watcher comes later");
        statusLine("Messaging app", true, store.sourceApp());
        statusLine("PC relay", true, "ready · " + relayAccount);
        button("Open LotKeys & Link This Phone", this::openLotKeys, true);
        button("Android App Permissions", this::openAppSettings, false);
        button("Reset Browser Link", () -> new AlertDialog.Builder(this)
            .setTitle("Reset the phone-to-browser link?")
            .setMessage("LotKeys tabs on this phone will stop seeing Android messages until you open LotKeys from this setup again. Phone messages and customer records are not deleted.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Reset", (dialog, which) -> {
                InstallIdentity.rotateToken(this);
                alert("Link reset. Tap Open LotKeys & Link This Phone when ready.");
            }).show(), false);
        button("Change PC Pairing Account", () -> new AlertDialog.Builder(this)
            .setTitle("Change the PC pairing account?")
            .setMessage("This disconnects and forgets trusted computers. Phone messages and LotKeys customer records are not deleted.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Change", (dialog, which) -> {
                DriveRelay.clearAccount(this);
                chooseGoogleAccount();
            }).show(), false);
        button("Stop Phone Connection", () -> {
            prefs().edit().putBoolean("enabled", false).apply();
            stopService(new Intent(this, PhoneConnectorService.class));
            alert("Phone connection stopped. Open LotKeys & Link This Phone to start it again.");
        }, false);
        footer();
    }

    private void explainMessages() {
        new AlertDialog.Builder(this)
            .setTitle("Allow your phone's SMS/MMS?")
            .setMessage("LotKeys can read existing SMS/MMS conversations and send a plain SMS reply only when you press Send. " +
                "It cannot delete phone conversations in this checkpoint. Carrier charges may apply. RCS is not included yet.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Continue", (dialog, which) -> requestPermissions(messagePermissions(), REQUEST_MESSAGES))
            .show();
    }

    private String[] messagePermissions() {
        List<String> permissions = new ArrayList<>();
        permissions.add(Manifest.permission.READ_SMS);
        permissions.add(Manifest.permission.SEND_SMS);
        return permissions.toArray(new String[0]);
    }

    private boolean requiredMessagesGranted() {
        return checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED &&
            checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean notificationsGranted() {
        return Build.VERSION.SDK_INT < 33 || checkSelfPermission(POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private void openLotKeys() {
        if (!requiredMessagesGranted() || !notificationsGranted()) {
            alert("Finish the required Android access first.");
            return;
        }
        prefs().edit().putBoolean("enabled", true).commit();
        try { startForegroundService(new Intent(this, PhoneConnectorService.class)); }
        catch (Exception error) { alert("Android could not start the phone connection. Check App Permissions and try again."); return; }
        String fragment = "#lotkeys-phone=" + Uri.encode(InstallIdentity.token(this));
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(TEST_URL + fragment))); }
        catch (ActivityNotFoundException error) { alert("No browser is available to open LotKeys."); }
    }

    private void chooseGoogleAccount() {
        try {
            Intent picker = AccountPicker.newChooseAccountIntent(
                null, null, new String[]{"com.google"}, true,
                "Choose the Google account used by LotKeys", null, null, null);
            startActivityForResult(picker, REQUEST_GOOGLE_ACCOUNT);
        } catch (Exception error) {
            alert("Android could not open the Google account chooser. Update Google Play services and try again.");
        }
    }

    private void authorizeGoogleAccount(Account account) {
        if (account == null) return;
        pendingGoogleAccount = account;
        text("Authorizing private PC pairing…", 14, Color.rgb(100, 181, 246), true);
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                DriveRelay.authorizeAccount(this, account);
                prefs().edit().putBoolean("enabled", true).commit();
                startForegroundService(new Intent(this, PhoneConnectorService.class));
                runOnUiThread(() -> { pendingGoogleAccount = null; render(); });
            } catch (UserRecoverableAuthException recoverable) {
                runOnUiThread(() -> startActivityForResult(recoverable.getIntent(), REQUEST_GOOGLE_AUTHORIZATION));
            } catch (GoogleAuthException | java.io.IOException error) {
                runOnUiThread(() -> alert(error.getMessage() == null ? "Google did not authorize PC pairing." : error.getMessage()));
            }
        });
    }

    private void renderPairRequest(JSONObject request) {
        step("Computer wants to connect");
        text(request.optString("pcName", "Computer"), 19, Color.WHITE, true);
        TextView code = text(request.optString("code"), 38, Color.rgb(100, 181, 246), true);
        code.setGravity(Gravity.CENTER);
        text("Approve only when these same four digits are visible on the computer in front of you.", 15, Color.LTGRAY, false);
        button("Approve · Ask Every Time", () -> pairAction("APPROVE_PAIR", request, "ask"), false);
        button("Approve · Trust 36 Hours", () -> pairAction("APPROVE_PAIR", request, "36h"), true);
        button("Approve · Trust 7 Days", () -> pairAction("APPROVE_PAIR", request, "7d"), false);
        button("Approve · Until I Disconnect", () -> pairAction("APPROVE_PAIR", request, "until-disconnect"), false);
        button("Decline", () -> pairAction("DECLINE_PAIR", request, ""), false);
    }

    private void pairAction(String action, JSONObject request, String trustMode) {
        Intent intent = new Intent(this, PhoneConnectorService.class).setAction(action)
            .putExtra("sessionId", request.optString("sessionId"));
        if (!trustMode.isEmpty()) intent.putExtra("trustMode", trustMode);
        startForegroundService(intent);
        alert("DECLINE_PAIR".equals(action) ? "Computer connection declined." : "Approval sent. The computer will connect in a moment.");
        body.postDelayed(this::render, 1200);
    }

    private void openAppSettings() {
        try { startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); }
        catch (ActivityNotFoundException error) { alert("Open Android Settings > Apps > LotKeys Connector TEST."); }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQUEST_MESSAGES && !requiredMessagesGranted()) {
            alert("Messages access is required for this phone-source checkpoint. LotKeys has not changed your default messaging app.");
        }
        if (requestCode == REQUEST_CONTACTS && new PhoneStore(this).canReadContacts()) {
            prefs().edit().putBoolean("contactsSkipped", false).apply();
        }
        render();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_GOOGLE_ACCOUNT && resultCode == RESULT_OK && data != null) {
            String name = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
            String type = data.getStringExtra(AccountManager.KEY_ACCOUNT_TYPE);
            if (name != null && !name.trim().isEmpty()) authorizeGoogleAccount(new Account(name, type == null ? "com.google" : type));
            return;
        }
        if (requestCode == REQUEST_GOOGLE_AUTHORIZATION) {
            if (resultCode == RESULT_OK && pendingGoogleAccount != null) authorizeGoogleAccount(pendingGoogleAccount);
            else { pendingGoogleAccount = null; alert("Google pairing access was not approved."); }
        }
    }

    private SharedPreferences prefs() {
        return getSharedPreferences("lotkeys-connector", MODE_PRIVATE);
    }

    private void step(String value) {
        TextView view = text(value, 14, Color.rgb(255, 183, 77), true);
        view.setPadding(0, dp(26), 0, dp(4));
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setLineSpacing(0, 1.15f);
        if (bold) view.setTypeface(view.getTypeface(), android.graphics.Typeface.BOLD);
        view.setPadding(0, dp(7), 0, dp(7));
        body.addView(view);
        return view;
    }

    private void statusLine(String label, boolean good, String detail) {
        text((good ? "● " : "● ") + label + " · " + detail, 15,
            good ? Color.rgb(63, 210, 122) : Color.rgb(255, 183, 77), false);
    }

    private void button(String label, Runnable action, boolean primary) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextSize(16);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, dp(10), 0, 0);
        button.setLayoutParams(params);
        button.setGravity(Gravity.CENTER);
        if (primary) button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(37, 99, 235)));
        button.setTextColor(Color.WHITE);
        button.setOnClickListener(view -> action.run());
        body.addView(button);
    }

    private void footer() {
        TextView view = text("The phone remains the source of truth. This test layer does not create contacts, archive message history, delete conversations, or become your default messenger.",
            13, Color.rgb(145, 151, 161), false);
        view.setPadding(0, dp(28), 0, 0);
    }

    private void alert(String message) {
        new AlertDialog.Builder(this).setTitle("LotKeys Phone Connection").setMessage(message).setPositiveButton("OK", null).show();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
