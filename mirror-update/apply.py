"""Keep the existing wire encryption; preserve complete hello frames for live challenges."""
from pathlib import Path
p = Path('device-bridge/android/app/src/main/java/ca/lotkeys/bridge/Protocol.java')
s = p.read_text()
old = '''                    heartbeat(true);
                    result.add(
                        new JSONObject()
                            .put("kind", "hello")
                            .put("client", p.optString("client"))
                    );'''
new = '''                    // Preserve the fresh browser challenge and client identity.
                    result.add(p);'''
if old in s:
    p.write_text(s.replace(old,new))
elif new not in s:
    raise SystemExit('Protocol hello block changed: review before building')
