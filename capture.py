import datetime, html, os, re, ssl, sys, urllib.request
WIKI_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INBOX = os.path.join(WIKI_ROOT, "inbox", "inbox.md")
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
def fetch_meta(url):
    ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
    raw = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"}), timeout=30, context=ctx).read()
    enc="utf-8"; m=re.search(rb'charset=["\']?([\w\-]+)', raw[:4000], re.I)
    if m:
        try: enc=m.group(1).decode("ascii")
        except Exception: pass
    t=raw.decode(enc, errors="ignore")
    title=""; mt=re.search(r"<title[^>]*>(.*?)</title>", t, re.I|re.S)
    if mt: title=html.unescape(" ".join(mt.group(1).split()))
    desc=""; md=re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', t, re.I|re.S)
    if md: desc=html.unescape(" ".join(md.group(1).split()))
    return title, desc
def main():
    if len(sys.argv)<2: print("用法: python tools/capture.py <URL> [备注]"); sys.exit(1)
    url=sys.argv[1]; note=" ".join(sys.argv[2:]).strip()
    try: title,desc=fetch_meta(url)
    except Exception as e: title,desc="",f"(抓取失败:{e})"
    line=f"- [{datetime.datetime.now():%Y-%m-%d}] {url} — {note or title or desc or '(无标题)'}"
    open(INBOX,"a",encoding="utf-8").write("\n"+line+"\n")
    print("[captured]", line)
if __name__=="__main__": main()
