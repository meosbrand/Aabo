"""Phase 1 helper for the deep-research pipeline.

Downloads each URL from a TSV list (slug<TAB>category<TAB>url) into the sources
directory as plain markdown-ish text. Idempotent: existing slugs are skipped.
Failures are appended to failed.log; a manifest is written to _index.md.

Usage: python3 -I fetch_sources.py <urls.tsv> <sources_dir>
"""

import html
import os
import re
import subprocess
import sys
from html.parser import HTMLParser

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"
MAX_CHARS = 60000

BLOCK_TAGS = {"p", "div", "section", "article", "br", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "td", "th", "dd", "dt"}
SKIP_TAGS = {"script", "style", "noscript", "svg", "nav", "footer", "header", "form", "iframe", "button", "select"}


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.skip = 0
        self.title = ""
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self.skip += 1
        if tag == "title":
            self._in_title = True
        if not self.skip:
            if tag in ("h1", "h2", "h3"):
                self.out.append("\n\n" + "#" * int(tag[1]) + " ")
            elif tag == "li":
                self.out.append("\n- ")
            elif tag in BLOCK_TAGS:
                self.out.append("\n")

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS and self.skip:
            self.skip -= 1
        if tag == "title":
            self._in_title = False
        if not self.skip and tag in BLOCK_TAGS:
            self.out.append("\n")

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if not self.skip:
            self.out.append(data)

    def text(self):
        raw = "".join(self.out)
        raw = re.sub(r"[ \t\r\f\v]+", " ", raw)
        raw = re.sub(r"\n\s*\n\s*\n+", "\n\n", raw)
        lines = [ln.strip() for ln in raw.split("\n")]
        # Drop very short navigation crumbs but keep headings/bullets.
        kept = [ln for ln in lines if len(ln) > 2 or ln == ""]
        return "\n".join(kept).strip()


def fetch(url, dest_raw):
    res = subprocess.run(
        ["curl", "-sS", "-L", "--max-time", "30", "-A", UA, "-o", dest_raw, "-w", "%{http_code} %{content_type}", url],
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        return None, f"curl exit {res.returncode}: {res.stderr.strip()[:200]}"
    code, _, ctype = res.stdout.partition(" ")
    if not code.startswith("2"):
        return None, f"HTTP {code}"
    return ctype, None


def main():
    list_path, sources = sys.argv[1], sys.argv[2]
    os.makedirs(sources, exist_ok=True)
    failed_log = os.path.join(sources, "failed.log")
    index_rows = []
    with open(list_path, encoding="utf-8") as fh:
        rows = [ln.rstrip("\n").split("\t") for ln in fh if ln.strip() and not ln.startswith("#")]
    for slug, category, url in rows:
        out = os.path.join(sources, f"{slug}.md")
        if os.path.exists(out):
            index_rows.append((slug, category, url, "cached"))
            continue
        tmp = os.path.join(sources, f".{slug}.tmp")
        ctype, err = fetch(url, tmp)
        if err:
            with open(failed_log, "a", encoding="utf-8") as fl:
                fl.write(f"{url}\t{err}\n")
            if os.path.exists(tmp):
                os.remove(tmp)
            print(f"FAIL {slug}: {err}")
            continue
        if "pdf" in (ctype or "") or url.lower().endswith(".pdf"):
            res = subprocess.run(["pdftotext", "-layout", tmp, "-"], capture_output=True, text=True)
            body, title = res.stdout, slug
        else:
            with open(tmp, encoding="utf-8", errors="replace") as fh:
                parser = TextExtractor()
                parser.feed(fh.read())
            body, title = parser.text(), html.unescape(parser.title.strip()) or slug
        os.remove(tmp)
        if len(body) < 400:
            with open(failed_log, "a", encoding="utf-8") as fl:
                fl.write(f"{url}\tcontent too short ({len(body)} chars, likely JS-rendered or blocked)\n")
            print(f"FAIL {slug}: too short")
            continue
        with open(out, "w", encoding="utf-8") as fh:
            fh.write(f"---\nsource_url: {url}\ncategory: {category}\ntitle: {title}\n---\n\n{body[:MAX_CHARS]}\n")
        index_rows.append((slug, category, url, f"{len(body)} chars"))
        print(f"OK   {slug} ({len(body)} chars)")
    with open(os.path.join(sources, "_index.md"), "w", encoding="utf-8") as fh:
        fh.write("| file | category | url | note |\n|---|---|---|---|\n")
        for slug, category, url, note in sorted(index_rows):
            fh.write(f"| {slug}.md | {category} | {url} | {note} |\n")


if __name__ == "__main__":
    main()
