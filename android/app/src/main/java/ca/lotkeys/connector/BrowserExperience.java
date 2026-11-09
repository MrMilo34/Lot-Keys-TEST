package ca.lotkeys.connector;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;

/** Uses the existing HTTPS origin and browser storage; never creates a WebView data silo. */
final class BrowserExperience {
    static final String WEB_URL = "https://mrmilo34.github.io/Lot-Keys-TEST/?build=095045";
    static final String SHOW_SETUP = "showPhoneSetup";
    private static final String PROVIDER = "experienceBrowserPackage";

    static Uri appUri(String token) {
        // The installation bearer is a fragment, never an HTTP query or caller-supplied URL.
        return Uri.parse(WEB_URL).buildUpon()
            .fragment(token == null || token.isEmpty() ? null : "lotkeys-phone=" + token).build();
    }

    static Intent setupIntent(Context context) {
        return new Intent(context, MainActivity.class).putExtra(SHOW_SETUP, true)
            .setAction("ca.lotkeys.connector.OPEN_SETTINGS")
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }

    static String provider(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("lotkeys-connector", Context.MODE_PRIVATE);
        String saved = prefs.getString(PROVIDER, "");
        if (!saved.isEmpty()) {
            Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(WEB_URL)).setPackage(saved);
            if (context.getPackageManager().resolveActivity(view, 0) == null)
                throw new ActivityNotFoundException("Restore your previously used browser to keep using its saved LotKeys data. No data was cleared.");
            return saved;
        }
        // Prefer the default browser. This is the same browser used by the .44 external launch.
        ResolveInfo resolved = context.getPackageManager().resolveActivity(
            new Intent(Intent.ACTION_VIEW, Uri.parse(WEB_URL)), android.content.pm.PackageManager.MATCH_DEFAULT_ONLY);
        String selected = resolved != null && resolved.activityInfo != null ? resolved.activityInfo.packageName : null;
        if (selected == null || selected.equals("android")) selected = CustomTabsClient.getPackageName(context, null);
        if (selected == null) throw new ActivityNotFoundException("Choose your existing LotKeys browser as Android's default browser, then reopen LotKeys. Your saved data stays in that browser.");
        return selected;
    }

    static void launch(Activity activity, String token) {
        String selected = provider(activity);
        PendingIntent settings = PendingIntent.getActivity(activity, 9545, setupIntent(activity),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        CustomTabsIntent tab = new CustomTabsIntent.Builder()
            .setShowTitle(true)
            .addMenuItem("Phone & upload settings", settings)
            .build();
        // Retain the selected provider before handing control to the browser. A changed default must not silently hide local records.
        tab.intent.setPackage(selected);
        if (!activity.getSharedPreferences("lotkeys-connector", Context.MODE_PRIVATE).edit().putString(PROVIDER, selected).commit())
            throw new ActivityNotFoundException("LotKeys could not retain its browser choice. Try opening again; your saved data is retained.");
        tab.launchUrl(activity, appUri(token));
    }

    private BrowserExperience() {}
}
