package ca.lotkeys.bridge;

import org.json.JSONObject;
import org.json.JSONArray;

import android.util.Base64;

import java.net.URL;

import javax.net.ssl.HttpsURLConnection;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import java.security.SecureRandom;
import java.security.MessageDigest;

import java.nio.charset.StandardCharsets;

import java.io.InputStream;
import java.io.ByteArrayOutputStream;

import java.util.*;

final class Protocol {

    final String base, room, token;
    final byte[] key;

    final String session = UUID.randomUUID().toString();

    long cursor = 0;
    long lastStatus = 0;

    final LinkedHashMap<String, Long> seen = new LinkedHashMap<>();

    Protocol(String raw) throws Exception {

        String cleaned = sanitizePairingJson(raw);

        JSONObject c;

        try {
            c = new JSONObject(cleaned);
        } catch (Exception ex) {
            throw new Exception(
                "Device pairing JSON could not be read.\n\n" +
                "The pasted text is not valid JSON even after cleaning common " +
                "copy/paste characters.\n\n" +
                "Please copy the complete device.json contents again."
            );
        }

        Object versionObject = c.opt("version");
        Object roleObject = c.opt("role");

        int version = c.optInt("version", -1);
        String role = c.optString("role", "").trim();

        String versionRead =
            versionObject == null || versionObject == JSONObject.NULL
                ? "(missing)"
                : String.valueOf(versionObject);

        String roleRead =
            roleObject == null || roleObject == JSONObject.NULL
                ? "(missing)"
                : String.valueOf(roleObject);

        if (version != 1 || !"device".equals(role)) {
            throw new Exception(
                "Device pairing code was recognized, but its identity does not match.\n\n" +
                "Version read: " + versionRead + "\n" +
                "Role read: " + roleRead + "\n\n" +
                "Expected:\n" +
                "Version: 1\n" +
                "Role: device"
            );
        }

        URL u = new URL(c.getString("url"));

        if (
            !"https".equals(u.getProtocol()) ||
            u.getUserInfo() != null ||
            u.getQuery() != null ||
            u.getRef() != null ||
            !(u.getPath().isEmpty() || "/".equals(u.getPath()))
        ) {
            throw new Exception(
                "A trusted HTTPS relay origin is required."
            );
        }

        base = c.getString("url").replaceAll("/+$", "");
        room = c.getString("room");
        token = c.getString("token");

        key = Base64.decode(
            c.getString("key"),
            Base64.NO_WRAP
        );

        if (
            !room.matches("[A-Za-z0-9_-]{16,80}") ||
            token.length() < 40 ||
            key.length != 32
        ) {
            throw new Exception(
                "Device pairing JSON was recognized, but one of the pairing values is invalid."
            );
        }
    }

    /*
     * Copying JSON through Word, Google Docs, messaging apps, etc.
     * can occasionally introduce invisible Unicode characters or
     * typographic quotation marks.
     *
     * This cleans only the pairing configuration text before parsing.
     * It does not alter relayed messages.
     */
    private static String sanitizePairingJson(String raw) {

        if (raw == null) {
            return "";
        }

        String s = raw.trim();

        // UTF BOM
        s = s.replace("\uFEFF", "");

        // Common invisible copy/paste characters
        s = s.replace("\u200B", "");
        s = s.replace("\u200C", "");
        s = s.replace("\u200D", "");
        s = s.replace("\u2060", "");

        // Non-breaking space
        s = s.replace('\u00A0', ' ');

        // Smart quotation marks occasionally introduced by editors
        s = s.replace('\u201C', '"');
        s = s.replace('\u201D', '"');

        return s.trim();
    }

    static String b64(byte[] b) {
        return Base64.encodeToString(
            b,
            Base64.NO_WRAP
        );
    }

    JSONObject seal(JSONObject plain) throws Exception {

        byte[] iv = new byte[12];
        new SecureRandom().nextBytes(iv);

        Cipher c = Cipher.getInstance(
            "AES/GCM/NoPadding"
        );

        c.init(
            Cipher.ENCRYPT_MODE,
            new SecretKeySpec(key, "AES"),
            new GCMParameterSpec(128, iv)
        );

        c.updateAAD(
            room.getBytes(StandardCharsets.UTF_8)
        );

        return new JSONObject()
            .put("v", 1)
            .put("iv", b64(iv))
            .put(
                "ciphertext",
                b64(
                    c.doFinal(
                        plain.toString()
                            .getBytes(StandardCharsets.UTF_8)
                    )
                )
            );
    }

    JSONObject unseal(JSONObject frame) throws Exception {

        if (
            frame.optInt("v") != 1 ||
            frame.optString("ciphertext").length() > 100000
        ) {
            throw new Exception("Bad frame");
        }

        Cipher c = Cipher.getInstance(
            "AES/GCM/NoPadding"
        );

        c.init(
            Cipher.DECRYPT_MODE,
            new SecretKeySpec(key, "AES"),
            new GCMParameterSpec(
                128,
                Base64.decode(
                    frame.getString("iv"),
                    Base64.NO_WRAP
                )
            )
        );

        c.updateAAD(
            room.getBytes(StandardCharsets.UTF_8)
        );

        return new JSONObject(
            new String(
                c.doFinal(
                    Base64.decode(
                        frame.getString("ciphertext"),
                        Base64.NO_WRAP
                    )
                ),
                StandardCharsets.UTF_8
            )
        );
    }

    JSONObject http(
        String path,
        JSONObject body
    ) throws Exception {

        HttpsURLConnection c =
            (HttpsURLConnection)
                new URL(base + path)
                    .openConnection();

        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(10000);
        c.setReadTimeout(10000);
        c.setUseCaches(false);

        c.setRequestProperty(
            "Authorization",
            "Bearer " + token
        );

        c.setRequestProperty(
            "Content-Type",
            "application/json"
        );

        try {

            if (body != null) {

                c.setRequestMethod("POST");
                c.setDoOutput(true);

                byte[] bytes =
                    body.toString()
                        .getBytes(StandardCharsets.UTF_8);

                c.setFixedLengthStreamingMode(
                    bytes.length
                );

                try (
                    java.io.OutputStream stream =
                        c.getOutputStream()
                ) {
                    stream.write(bytes);
                }
            }

            int status =
                c.getResponseCode();

            if (status != 200) {
                throw new Exception(
                    "Relay request failed (" +
                    status +
                    ")."
                );
            }

            try (
                InputStream in =
                    c.getInputStream();

                ByteArrayOutputStream out =
                    new ByteArrayOutputStream()
            ) {

                byte[] buf =
                    new byte[8192];

                int n;

                while (
                    (n = in.read(buf)) != -1
                ) {

                    out.write(
                        buf,
                        0,
                        n
                    );

                    if (
                        out.size() >
                        11000000
                    ) {
                        throw new Exception(
                            "Reply too large"
                        );
                    }
                }

                return new JSONObject(
                    out.toString("UTF-8")
                );
            }

        } finally {
            c.disconnect();
        }
    }

    void publish(
        JSONObject plain
    ) throws Exception {

        long now =
            System.currentTimeMillis();

        if (!plain.has("id")) {
            plain.put(
                "id",
                UUID.randomUUID()
                    .toString()
            );
        }

        if (!plain.has("at")) {
            plain.put(
                "at",
                now
            );
        }

        plain.put(
            "expiresAt",
            now + 30000
        );

        plain.put(
            "session",
            session
        );

        http(
            "/v1/event?room=" + room,
            seal(plain)
        );
    }

    void heartbeat(
        boolean force
    ) throws Exception {

        long now =
            System.currentTimeMillis();

        if (
            force ||
            now - lastStatus > 8000
        ) {

            publish(
                new JSONObject()
                    .put(
                        "kind",
                        "status"
                    )
                    .put(
                        "deviceName",
                        "Android notification bridge [prototype]"
                    )
                    .put(
                        "capabilities",
                        new JSONObject()
                            .put("text", true)
                            .put("reply", true)
                            .put("history", false)
                            .put("attachments", false)
                            .put("notificationOnly", true)
                    )
            );

            lastStatus = now;
        }
    }

    List<JSONObject> poll()
        throws Exception {

        JSONArray rows =
            http(
                "/v1/poll?room=" +
                room +
                "&after=" +
                cursor,
                null
            ).optJSONArray("events");

        List<JSONObject> result =
            new ArrayList<>();

        if (rows == null) {
            return result;
        }

        for (
            int i = 0;
            i < rows.length();
            i++
        ) {

            JSONObject item =
                rows.getJSONObject(i);

            cursor =
                Math.max(
                    cursor,
                    item.optLong("seq")
                );

            try {

                JSONObject p =
                    unseal(
                        item.getJSONObject(
                            "envelope"
                        )
                    );

                long now =
                    System.currentTimeMillis();

                long at =
                    p.optLong(
                        "at",
                        0
                    );

                long expires =
                    p.optLong(
                        "expiresAt",
                        0
                    );

                String id =
                    p.optString("id");

                if (
                    id.isEmpty() ||
                    seen.containsKey(id) ||
                    at <= 0 ||
                    at > now + 60000 ||
                    expires < now ||
                    expires > at + 90000
                ) {
                    continue;
                }

                seen.put(
                    id,
                    now
                );

                while (
                    seen.size() >
                    1500
                ) {
                    seen.remove(
                        seen.keySet()
                            .iterator()
                            .next()
                    );
                }

                if (
                    "hello".equals(
                        p.optString("kind")
                    )
                ) {

                    heartbeat(true);
                    result.add(
                        new JSONObject()
                            .put("kind", "hello")
                            .put("client", p.optString("client"))
                    );
                    continue;
                }

                if (
                    session.equals(
                        p.optString("session")
                    )
                ) {
                    result.add(p);
                }

            } catch (
                Exception ignored
            ) {
                /*
                 * Invalid or expired frames
                 * are intentionally ignored.
                 */
            }
        }

        return result;
    }

    void ack(
        JSONObject request,
        boolean ok,
        String error
    ) throws Exception {

        publish(
            new JSONObject()
                .put(
                    "kind",
                    "ack"
                )
                .put(
                    "requestId",
                    request.getString("id")
                )
                .put(
                    "ok",
                    ok
                )
                .put(
                    "error",
                    error
                )
        );
    }

    static String digest(
        String raw
    ) throws Exception {

        return b64(
            MessageDigest
                .getInstance("SHA-256")
                .digest(
                    raw.getBytes(
                        StandardCharsets.UTF_8
                    )
                )
        )
        .replace('/', '_')
        .replace('+', '-')
        .replace("=", "");
    }

    void destroy() {

        Arrays.fill(
            key,
            (byte) 0
        );

        seen.clear();
    }
}
