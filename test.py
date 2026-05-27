# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import subprocess, json, re, time, os, webbrowser
import urllib.request, urllib.error

CRON_SECRET = "change_this_to_a_random_secret"

def green(t):  return f"\033[92m{t}\033[0m"
def yellow(t): return f"\033[93m{t}\033[0m"
def red(t):    return f"\033[91m{t}\033[0m"
def bold(t):   return f"\033[1m{t}\033[0m"
def cyan(t):   return f"\033[96m{t}\033[0m"

def fetch(url, method="GET", headers=None):
    req = urllib.request.Request(url, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.read().decode("utf-8", errors="ignore"), r.status
    except urllib.error.HTTPError as e:
        return e.read().decode("utf-8", errors="ignore"), e.code
    except Exception as e:
        return str(e), 0

def find_port():
    for port in [3000, 3001, 3002]:
        _, status = fetch(f"http://localhost:{port}/")
        if status == 200:
            return port
    return None

def start_server():
    print(yellow("  السيرفر غير شغّال — جاري التشغيل..."))
    project_dir = os.path.dirname(os.path.abspath(__file__))
    subprocess.Popen(
        ["cmd", "/c", "npm run dev"],
        cwd=project_dir,
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )
    print(yellow("  انتظر 12 ثانية..."))
    for i in range(12, 0, -1):
        print(f"\r  {i}...", end="", flush=True)
        time.sleep(1)
    print()
    return find_port()

# ─── Header ─────────────────────────────────────────────────────
os.system("cls")
print(bold(cyan("=" * 52)))
print(bold(cyan("   Fortnite Maps -- اختبار الموقع")))
print(bold(cyan("=" * 52)))
print()

# ─── Find / start server ────────────────────────────────────────
port = find_port()
if not port:
    port = start_server()
if not port:
    print(red("  [X] فشل تشغيل السيرفر"))
    input("\nاضغط Enter للخروج...")
    sys.exit(1)

base = f"http://localhost:{port}"
print(green(f"  [OK] السيرفر يعمل على {base}"))
print()

results = []

# ─── Test 1: Homepage ────────────────────────────────────────────
print(bold("[ 1 ] الصفحة الرئيسية"))
html, status = fetch(base + "/")
titles = re.findall(r'font-semibold text-sm[^"]*">([^<]{3,60})', html)
imgs   = re.findall(r'qstv\.on\.epicgames\.com', html)
badges = re.findall(r'bg-green-500[^>]+>(.{2,40}?)(?:</span>|<!--)', html)
stats  = re.findall(r'text-3xl font-bold[^>]*>([^<]+)', html)

ok = status == 200 and len(titles) > 0
results.append(ok)
print(f"  الحالة        : {green('[OK] ناجح') if ok else red('[X] فشل')}")
print(f"  مابات معروضة : {len(titles)}")
print(f"  صور QSTV      : {len(imgs)}")
print(f"  شارات لاعبين  : {len(badges)}")
if stats: print(f"  احصائيات      : {' | '.join(s.strip() for s in stats[:3])}")
if titles: print(f"  اول ماب       : {titles[0].strip()[:50]}")
print()

# ─── Test 2: Maps page ───────────────────────────────────────────
print(bold("[ 2 ] صفحة /maps"))
html2, status2 = fetch(base + "/maps")
titles2 = re.findall(r'font-semibold text-sm[^"]*">([^<]{3,60})', html2)
empty   = "لا توجد" in html2

ok2 = status2 == 200 and len(titles2) > 0
results.append(ok2)
print(f"  الحالة        : {green('[OK] ناجح') if ok2 else red('[X] فشل')}")
print(f"  مابات معروضة : {len(titles2)}")
if empty: print(f"  {red('[!] صفحة فارغة')}")
print()

# ─── Test 3: Metrics sync ────────────────────────────────────────
print(bold("[ 3 ] مزامنة عدد اللاعبين"))
body, _ = fetch(
    base + "/api/cron/metrics",
    headers={"x-cron-secret": CRON_SECRET}
)
try:
    d = json.loads(body)
    ok3 = d.get("ok", False)
    results.append(ok3)
    print(f"  الحالة        : {green('[OK] ناجح') if ok3 else red('[X] فشل')}")
    print(f"  معالج         : {d.get('processed',0)} ماب  |  اخطاء: {d.get('errors',0)}")
except:
    results.append(False)
    print(f"  {red('[X] فشل الاتصال')}")
print()

# ─── Test 4: Image sync ──────────────────────────────────────────
print(bold("[ 4 ] مزامنة الصور"))
body4, _ = fetch(
    base + "/api/sync/images?batch=3",
    method="POST",
    headers={"x-cron-secret": CRON_SECRET, "Content-Length": "0"}
)
try:
    d4 = json.loads(body4)
    ok4 = d4.get("ok", False)
    results.append(ok4)
    print(f"  الحالة        : {green('[OK] ناجح') if ok4 else red('[X] فشل')}")
    if d4.get("updated",0) == 0 and d4.get("skipped",0) == 0:
        print(f"  {green('كل المابات لها صور')}")
    else:
        print(f"  محدث: {d4.get('updated',0)}  |  بدون صورة: {d4.get('skipped',0)}")
except:
    results.append(False)
    print(f"  {red('[X] فشل')}")
print()

# ─── Summary ────────────────────────────────────────────────────
print(bold(cyan("=" * 52)))
passed = sum(results)
total  = len(results)
if passed == total:
    print(bold(green(f"  [OK] كل الاختبارات ناجحة ({passed}/{total})")))
else:
    print(bold(yellow(f"  [!] {passed}/{total} ناجحة")))
print(bold(cyan("=" * 52)))
print()

# ─── Open browser ───────────────────────────────────────────────
print(f"  فتح: {base}")
webbrowser.open(base)
time.sleep(0.8)
webbrowser.open(base + "/maps")
print(green("  [OK] تم فتح الموقع"))
print()
input("اضغط Enter للخروج...")
