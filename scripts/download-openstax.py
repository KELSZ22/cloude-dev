"""Acquire OpenStax's public catalog and downloads using only Python's stdlib."""
import argparse
import concurrent.futures
import hashlib
import html
import json
import re
import shutil
import time
import unicodedata
import urllib.parse
import urllib.request
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://openstax.org"
CATALOG = BASE + "/apps/cms/api/v2/pages/?type=books.Book&fields=*&limit=200"
METADATA = Path(__file__).resolve().parents[1] / "content" / "openstax"
HEADERS = {"User-Agent": "AralSearch-Content-Downloader/1.0", "Accept-Encoding": "identity"}


def request(url, method="GET", extra_headers=None):
    headers = {**HEADERS, **(extra_headers or {})}
    return urllib.request.urlopen(urllib.request.Request(url, headers=headers, method=method), timeout=90)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    # Windows readers briefly prevent replacement of an otherwise valid file.
    for attempt in range(20):
        try:
            temporary.replace(path)
            break
        except PermissionError:
            if attempt == 19:
                raise
            time.sleep(0.1)


def slug(value):
    value = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:110] or "unknown"


def file_url(value):
    if not isinstance(value, str):
        return None
    value = html.unescape(value.strip())
    value = urllib.parse.urljoin(BASE, value)
    if urllib.parse.urlsplit(value).scheme not in ("http", "https"):
        return None
    suffix = Path(urllib.parse.unquote(urllib.parse.urlsplit(value).path)).suffix.lower()
    return value if suffix in (".pdf", ".zip", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".csv", ".epub", ".imscc") else None


def discover(root):
    books = []
    offset = 0
    while True:
        with request(CATALOG + f"&offset={offset}") as response:
            page = json.load(response)
        books.extend(page["items"])
        if len(books) >= page["meta"]["total_count"]:
            break
        if not page["items"]:
            raise RuntimeError("Catalog pagination stopped before total_count")
        offset = len(books)
    write_json(METADATA / "catalog.json", books)
    assets, references = {}, []

    def add(book, label, url, kind, status="pending", description=""):
        ref = {"book_id": book["id"], "book_title": book["title"], "book_slug": book["meta"]["slug"],
               "subjects": [s["subject_name"] for s in book.get("book_subjects", [])],
               "language": book["meta"].get("locale"), "book_state": book.get("book_state"),
               "source_page": book["meta"].get("html_url"), "label": label, "kind": kind,
               "url": url, "status": status, "description": description,
               "book_license": {"name": book.get("license_name"), "version": book.get("license_version"), "url": book.get("license_url")},
               "resource_license": "Review resource itself; book license does not automatically apply" if kind != "book" else None}
        references.append(ref)
        if status != "pending":
            return
        url = file_url(url)
        if not url:
            ref["status"] = "external_or_not_downloadable"
            return
        ref["url"] = url
        if url not in assets:
            filename = Path(urllib.parse.unquote(urllib.parse.urlsplit(url).path)).name
            extension = Path(filename).suffix.lower()
            digest = hashlib.sha256(url.encode()).hexdigest()[:12]
            relative = Path("files") / slug((ref["subjects"] or ["Other"])[0]) / slug(book["meta"]["slug"]) / (slug(Path(filename).stem) + "-" + digest + extension)
            assets[url] = {"url": url, "path": relative.as_posix(), "status": "pending", "references": []}
        assets[url]["references"].append(len(references) - 1)
        ref["path"] = assets[url]["path"]

    for book in books:
        for field in ("pdf_url", "high_resolution_pdf_url"):
            if book.get(field):
                add(book, field, book[field], "book")
        if not book.get("pdf_url"):
            add(book, "PDF unavailable", None, "book", "no_pdf_published")
        for field in ("book_student_resources", "book_faculty_resources"):
            for resource in book.get(field, []):
                urls = [resource.get("link_document_url"), resource.get("link_external")]
                urls.extend(re.findall(r'href=[\"\x27]([^\"\x27]+)', resource.get("resource_description") or ""))
                urls = list(dict.fromkeys(u for u in urls if u)) or [None]
                for url in urls:
                    status = "hidden" if resource.get("hidden") else "restricted" if not resource.get("resource_unlocked") else "pending"
                    add(book, resource.get("resource_heading"), url, field, status, resource.get("resource_description") or "")
        for field in ("community_resource_feature_link_url", "community_resource_url", "polish_site_link"):
            if book.get(field):
                add(book, book.get("community_resource_feature_text") or field, book[field], "community")
    manifest = {"schema_version": 1, "retrieved_at": datetime.now(timezone.utc).isoformat(),
                "catalog_url": CATALOG, "storage_root": str(root.resolve()), "book_count": len(books),
                "scope": "All catalog locales and editions; public direct book PDFs and downloadable resources. Locked/hidden resources and external interactive hubs are inventoried, not scraped.",
                "assets": list(assets.values()), "references": references}

    def measure(asset):
        try:
            with request(asset["url"], "HEAD") as response:
                asset["expected_bytes"] = int(response.headers.get("Content-Length") or 0)
                asset["content_type"] = response.headers.get("Content-Type")
                asset["last_modified"] = response.headers.get("Last-Modified")
        except Exception as error:
            asset["head_error"] = str(error)

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(measure, manifest["assets"]))
    write_json(METADATA / "manifest.json", manifest)
    print(json.dumps({"books": len(books), "assets": len(assets), "estimated_bytes": sum(a.get("expected_bytes", 0) for a in assets.values()), "reference_statuses": dict(Counter(r["status"] for r in references))}), flush=True)


def checksum(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def download(manifest):
    root = Path(manifest["storage_root"])
    root.mkdir(parents=True, exist_ok=True)
    remaining = sum(a.get("expected_bytes", 0) for a in manifest["assets"] if a["status"] != "downloaded")
    if remaining + 512 * 1024**2 > shutil.disk_usage(root).free:
        raise RuntimeError("Insufficient free storage for remaining downloads and 512 MB reserve")

    def acquire(asset):
        # Workers return a result; only the coordinator updates the manifest.
        asset = dict(asset)
        path = root / asset["path"]
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and asset.get("sha256") == checksum(path):
            asset["status"] = "downloaded"
            return asset
        if path.exists() and asset.get("expected_bytes") == path.stat().st_size:
            asset.update(status="downloaded", bytes=path.stat().st_size, sha256=checksum(path),
                         downloaded_at=datetime.now(timezone.utc).isoformat())
            return asset
        temporary = path.with_suffix(path.suffix + ".part")
        for attempt in range(3):
            try:
                expected = asset.get("expected_bytes", 0)
                use_ranges = expected > 32 * 1024**2 and urllib.parse.urlsplit(asset["url"]).hostname == "assets.openstax.org"
                with temporary.open("wb") as stream:
                    offset = 0
                    while True:
                        end = min(offset + 16 * 1024**2, expected) - 1
                        headers = {"Range": f"bytes={offset}-{end}"} if use_ranges else {}
                        with request(asset["url"], extra_headers=headers) as response:
                            if "text/html" in response.headers.get("Content-Type", ""):
                                raise ValueError("Server returned HTML instead of downloadable content")
                            if use_ranges:
                                if response.status != 206 or response.headers.get("Content-Range") != f"bytes {offset}-{end}/{expected}":
                                    raise ValueError("Server returned an unexpected byte range")
                            else:
                                expected = int(response.headers.get("Content-Length") or 0)
                            first = response.read(1024 * 1024)
                            if offset == 0 and path.suffix == ".pdf" and not first.startswith(b"%PDF-"):
                                raise ValueError("Missing PDF signature")
                            before = stream.tell()
                            stream.write(first)
                            shutil.copyfileobj(response, stream, length=1024 * 1024)
                            if use_ranges and stream.tell() - before != end - offset + 1:
                                raise ValueError("Incomplete byte range")
                            asset["resolved_url"] = response.url
                        offset = stream.tell()
                        if not use_ranges or offset >= expected:
                            break
                size = temporary.stat().st_size
                if not size or (expected and size != expected):
                    raise ValueError(f"Size mismatch: received {size}, expected {expected}")
                asset.update(status="downloaded", bytes=size, sha256=checksum(temporary), downloaded_at=datetime.now(timezone.utc).isoformat())
                asset.pop("error", None)
                temporary.replace(path)
                break
            except Exception as error:
                asset.update(status="failed", error=str(error))
                temporary.unlink(missing_ok=True)
                if attempt < 2:
                    time.sleep(2 ** attempt)
        return asset

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(acquire, a) for a in manifest["assets"]]
        positions = {a["url"]: i for i, a in enumerate(manifest["assets"])}
        for count, future in enumerate(concurrent.futures.as_completed(futures), 1):
            asset = future.result()
            manifest["assets"][positions[asset["url"]]] = asset
            write_json(METADATA / "manifest.json", manifest)
            print(f"[{count}/{len(futures)}] {asset['status']}: {asset['path']}", flush=True)
    for ref in manifest["references"]:
        if ref["status"] == "pending":
            asset = next(a for a in manifest["assets"] if a["url"] == ref["url"])
            ref["status"] = asset["status"]
    write_json(METADATA / "manifest.json", manifest)
    write_json(root / "manifest.json", manifest)
    for name in ("catalog.json", "README.md"):
        source = METADATA / name
        destination = root / name
        if source.exists() and source.resolve() != destination.resolve():
            shutil.copyfile(source, destination)


def verify(manifest):
    failures = []
    archive_pdfs = []
    for asset in manifest["assets"]:
        path = Path(manifest["storage_root"]) / asset["path"]
        if asset["status"] != "downloaded" or not path.is_file():
            failures.append({"url": asset["url"], "error": asset.get("error", "not downloaded")})
        elif path.stat().st_size != asset["bytes"] or checksum(path) != asset["sha256"]:
            failures.append({"url": asset["url"], "error": "integrity mismatch"})
        else:
            try:
                if path.suffix == ".pdf":
                    with path.open("rb") as stream:
                        if stream.read(5) != b"%PDF-":
                            raise ValueError("Missing PDF signature")
                        stream.seek(max(0, path.stat().st_size - 65536))
                        if b"%%EOF" not in stream.read():
                            raise ValueError("Missing PDF end-of-file marker")
                elif path.suffix in (".zip", ".docx", ".pptx", ".xlsx", ".epub", ".imscc"):
                    with zipfile.ZipFile(path) as archive:
                        broken = archive.testzip()
                        if broken:
                            raise ValueError(f"Archive CRC failure: {broken}")
                        for info in archive.infolist():
                            if (info.filename.lower().endswith(".pdf")
                                    and not info.filename.startswith("__MACOSX/")
                                    and not Path(info.filename).name.startswith("._")):
                                archive_pdfs.append({"archive_path": asset["path"], "member": info.filename, "bytes": info.file_size, "source_url": asset["url"]})
            except Exception as error:
                failures.append({"url": asset["url"], "error": str(error)})
    report = {"verified_at": datetime.now(timezone.utc).isoformat(), "books": manifest["book_count"],
              "asset_statuses": dict(Counter(a["status"] for a in manifest["assets"])),
              "reference_statuses": dict(Counter(r["status"] for r in manifest["references"])),
              "downloaded_bytes": sum(a.get("bytes", 0) for a in manifest["assets"]),
              "pdfs_inside_archives": archive_pdfs, "failures": failures}
    write_json(METADATA / "verification.json", report)
    write_json(Path(manifest["storage_root"]) / "verification.json", report)
    summary = {k: v for k, v in report.items() if k != "pdfs_inside_archives"}
    summary["pdfs_inside_archives_count"] = len(archive_pdfs)
    print(json.dumps(summary, indent=2), flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["discover", "download", "verify"])
    parser.add_argument("--storage", type=Path, default=METADATA)
    args = parser.parse_args()
    if args.action == "discover":
        discover(args.storage)
    else:
        current = json.loads((METADATA / "manifest.json").read_text(encoding="utf-8"))
        if args.action == "download":
            download(current)
        else:
            raise SystemExit(verify(current))
