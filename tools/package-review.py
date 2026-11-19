"""Package tracked .50 preview source; never publish or sign an Android app."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
paths = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
files, omitted = [], []
for name in filter(None, paths):
    if name.startswith('downloads/') and 'V0.9.5.46.apk' not in name:
        omitted.append(name)
        continue
    files.append(name)
manifest = {'kind': 'UNRELEASED SOURCE REVIEW ONLY', 'version': '0.9.5.51',
            'sourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
            'baseCommit': 'a3cbd0aac8d956ec9d8110a1c5dd7f08f7fb7cbe',
            'nativeApkVersion': '0.9.5.46', 'newNativeApk': False, 'deployed': False,
            'omittedHistoricalInstallers': omitted, 'sha256': {}}
output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in sorted(files):
        data = (root / name).read_bytes()
        manifest['sha256'][name] = hashlib.sha256(data).hexdigest()
        archive.writestr('LotKeys-0.9.5.51-REVIEW-ONLY/' + name, data)
    archive.writestr('LotKeys-0.9.5.51-REVIEW-ONLY/REVIEW-MANIFEST.json', json.dumps(manifest, indent=2))
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
print(json.dumps({'file': output.name, 'bytes': output.stat().st_size, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'files': len(files), 'newNativeApk': False, 'deployed': False}))
