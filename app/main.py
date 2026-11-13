"""Homelab Music - self-hosted player.

Sources: YouTube (search / links), Spotify links (resolved to YouTube audio),
and files uploaded from the user's device. Extras: folders, lyrics (LRCLIB),
server-side settings."""
import base64
import hashlib
import hmac
import json
import mimetypes
import os
import queue
import re
import secrets
import shutil
import sqlite3
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from collections import deque
from contextlib import contextmanager
from http.cookies import SimpleCookie
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import (FileResponse, HTMLResponse, JSONResponse,
                               RedirectResponse, StreamingResponse)
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool
from yt_dlp import YoutubeDL

DATA = Path(os.environ.get("DATA_DIR", "/data"))
MUSIC = DATA / "music"
COVERS = DATA / "covers"
MUSIC.mkdir(parents=True, exist_ok=True)
COVERS.mkdir(parents=True, exist_ok=True)
DB = DATA / "library.db"
WORKERS = int(os.environ.get("DOWNLOAD_WORKERS", "2"))
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")
FORMATS = ("m4a", "mp3", "opus")
AUDIO_EXT = {".mp3", ".m4a", ".aac", ".flac", ".wav", ".ogg", ".opus",
             ".webm", ".mp4", ".wma", ".aiff", ".aif", ".mkv", ".mov", ".m4v"}
mimetypes.add_type("audio/mp4", ".m4a")
mimetypes.add_type("audio/ogg", ".opus")
mimetypes.add_type("audio/flac", ".flac")

SPOTIFY_RE = re.compile(
    r"open\.spotify\.com/(?:intl-[\w-]+/)?(track|album|playlist)/([A-Za-z0-9]+)")
YOUTUBE_HOSTS = ("youtube.com", "youtu.be", "youtube-nocookie.com")
ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")
TRACK_COLS = ("id,title,artist,duration,source,video_id,status,error,"
              "lyrics_state,kind,liked,plays")

app = FastAPI(title="Homelab Music")
jobs: "queue.Queue[tuple[str, object]]" = queue.Queue()
events: deque = deque(maxlen=30)
_event_id = 0
_event_lock = threading.Lock()


# ---------------------------------------------------------------- database
@contextmanager
def db():
    con = sqlite3.connect(DB, timeout=30)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init_db():
    with db() as con:
        con.execute("PRAGMA journal_mode=WAL")
        con.executescript("""
        CREATE TABLE IF NOT EXISTS tracks(
            id INTEGER PRIMARY KEY,
            ext_id TEXT UNIQUE,
            title TEXT, artist TEXT, duration INTEGER DEFAULT 0,
            source TEXT, video_id TEXT,
            status TEXT DEFAULT 'queued', error TEXT,
            added_at REAL);
        CREATE TABLE IF NOT EXISTS playlists(
            id INTEGER PRIMARY KEY, name TEXT, url TEXT UNIQUE, source TEXT);
        CREATE TABLE IF NOT EXISTS playlist_tracks(
            playlist_id INTEGER, track_id INTEGER, position INTEGER,
            PRIMARY KEY(playlist_id, track_id));
        CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, created REAL);
        CREATE TABLE IF NOT EXISTS artists(
            name TEXT PRIMARY KEY, data TEXT, fetched REAL);
        """)
        if "position" not in {r["name"] for r in
                              con.execute("PRAGMA table_info(playlists)")}:
            con.execute("ALTER TABLE playlists ADD COLUMN position INTEGER")
        cols = {r["name"] for r in con.execute("PRAGMA table_info(tracks)")}
        for name, ddl in (("file", "TEXT"), ("lyrics", "TEXT"),
                          ("lyrics_state", "TEXT"),
                          ("kind", "TEXT DEFAULT 'audio'"),
                          ("liked", "INTEGER DEFAULT 0"),
                          ("plays", "INTEGER DEFAULT 0"),
                          ("last_played", "REAL"), ("video_file", "TEXT"),
                          ("raw_title", "TEXT"), ("raw_artist", "TEXT"),
                          ("lyrics_offset", "REAL DEFAULT 0")):
            if name not in cols:
                con.execute(f"ALTER TABLE tracks ADD COLUMN {name} {ddl}")
        con.execute("UPDATE tracks SET file=video_id||'.m4a' WHERE file IS NULL "
                    "AND status='ready' AND video_id IS NOT NULL")
        # Older versions kept a separate "ytv:" row for the video copy of a
        # song. Fold it into the audio row so each song appears once.
        for r in con.execute("SELECT * FROM tracks WHERE ext_id LIKE 'ytv:%'"
                             ).fetchall():
            twin = con.execute("SELECT id FROM tracks WHERE ext_id=?",
                               ("yt:" + r["video_id"],)).fetchone()
            if twin:
                con.execute("UPDATE tracks SET kind='video',video_file=?,"
                            "status=CASE WHEN ? IS NULL THEN 'queued' ELSE "
                            "status END WHERE id=?",
                            (r["file"], r["file"], twin["id"]))
                con.execute("UPDATE OR IGNORE playlist_tracks SET track_id=? "
                            "WHERE track_id=?", (twin["id"], r["id"]))
                con.execute("DELETE FROM playlist_tracks WHERE track_id=?",
                            (r["id"],))
                con.execute("DELETE FROM tracks WHERE id=?", (r["id"],))
            else:
                con.execute("UPDATE tracks SET ext_id=?,video_file=file "
                            "WHERE id=?", ("yt:" + r["video_id"], r["id"]))


def get_setting(key: str, default: str = "") -> str:
    with db() as con:
        row = con.execute("SELECT value FROM settings WHERE key=?",
                          (key,)).fetchone()
    return row["value"] if row and row["value"] is not None else default


def set_setting(key: str, value: str):
    with db() as con:
        con.execute("INSERT OR REPLACE INTO settings VALUES(?,?)", (key, value))


def spotify_creds():
    return (get_setting("spotify_client_id") or
            os.environ.get("SPOTIFY_CLIENT_ID", "").strip(),
            get_setting("spotify_client_secret") or
            os.environ.get("SPOTIFY_CLIENT_SECRET", "").strip())


def notify(msg: str, level: str = "info"):
    global _event_id
    with _event_lock:
        _event_id += 1
        events.append({"id": _event_id, "msg": msg, "level": level})


def clean_err(e: Exception) -> str:
    return ANSI_RE.sub("", str(e)).replace("ERROR: ", "")[:300]


# -------------------------------------------------------------------- auth
# Optional single password. When one is set, every /api and /media request
# needs the session cookie handed out by /api/login.
_auth = {"hash": "", "sessions": set(), "fails": deque(maxlen=50)}
COOKIE = "hm_session"
OPEN_PATHS = {"/api/login", "/api/auth"}


def hash_pw(pw: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 200_000)
    return f"{salt}${digest.hex()}"


def check_pw(pw: str, stored: str) -> bool:
    return hmac.compare_digest(hash_pw(pw, stored.split("$")[0]), stored)


def load_auth():
    stored = get_setting("password_hash")
    env_pw = os.environ.get("APP_PASSWORD", "")
    if not stored and env_pw and get_setting("password_removed") != "1":
        stored = hash_pw(env_pw)
        set_setting("password_hash", stored)
    _auth["hash"] = stored
    with db() as con:
        _auth["sessions"] = {r["token"] for r in
                             con.execute("SELECT token FROM sessions")}


def new_session() -> str:
    token = secrets.token_urlsafe(32)
    with db() as con:
        con.execute("INSERT INTO sessions VALUES(?,?)", (token, time.time()))
    _auth["sessions"].add(token)
    return token


def clear_sessions():
    with db() as con:
        con.execute("DELETE FROM sessions")
    _auth["sessions"] = set()


def scope_token(scope) -> str:
    for k, v in scope.get("headers") or []:
        if k == b"cookie":
            c = SimpleCookie()
            try:
                c.load(v.decode("latin-1"))
            except Exception:
                return ""
            return c[COOKIE].value if COOKIE in c else ""
    return ""


def is_authed(scope) -> bool:
    return not _auth["hash"] or scope_token(scope) in _auth["sessions"]


def set_cookie(resp, token: str):
    resp.set_cookie(COOKIE, token, max_age=60 * 60 * 24 * 60, httponly=True,
                    samesite="lax")


class AuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope["path"]
            if (path.startswith(("/api/", "/media/")) and path not in OPEN_PATHS
                    and not is_authed(scope)):
                resp = JSONResponse({"detail": "Login required"}, 401)
                return await resp(scope, receive, send)

            async def hardened(message):
                # Browser protections: no guessing of file types, no showing
                # the player inside another site's frame, no leaking its
                # address to the sites that covers and streams come from.
                if message["type"] == "http.response.start":
                    message["headers"] = [
                        *message.get("headers", []),
                        (b"x-content-type-options", b"nosniff"),
                        (b"x-frame-options", b"DENY"),
                        (b"referrer-policy", b"no-referrer")]
                await send(message)
            return await self.inner(scope, receive, hardened)
        await self.inner(scope, receive, send)


app.add_middleware(AuthMiddleware)


class LoginReq(BaseModel):
    password: str


@app.get("/api/auth")
def auth_state(request: Request):
    return {"required": bool(_auth["hash"]), "authed": is_authed(request.scope)}


@app.post("/api/login")
def login(req: LoginReq):
    if not _auth["hash"]:
        return {"ok": True}
    now = time.time()
    if sum(1 for t in _auth["fails"] if now - t < 300) >= 8:
        raise HTTPException(429, "Too many attempts. Try again in a few minutes.")
    if not check_pw(req.password, _auth["hash"]):
        _auth["fails"].append(now)
        time.sleep(1)
        raise HTTPException(401, "Wrong password")
    resp = JSONResponse({"ok": True})
    set_cookie(resp, new_session())
    return resp


@app.post("/api/logout")
def logout(request: Request):
    token = scope_token(request.scope)
    if token:
        with db() as con:
            con.execute("DELETE FROM sessions WHERE token=?", (token,))
        _auth["sessions"].discard(token)
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(COOKIE)
    return resp


@app.put("/api/password")
def set_password(body: dict):
    """Set, change or (with an empty value) remove the password. Everyone
    else is signed out; the caller stays signed in."""
    pw = str(body.get("password") or "")
    if pw and len(pw) < 4:
        raise HTTPException(400, "Password must be at least 4 characters")
    clear_sessions()
    resp = JSONResponse({"ok": True, "password_set": bool(pw)})
    if pw:
        _auth["hash"] = hash_pw(pw)
        set_setting("password_hash", _auth["hash"])
        set_setting("password_removed", "0")
        set_cookie(resp, new_session())
    else:
        _auth["hash"] = ""
        set_setting("password_hash", "")
        set_setting("password_removed", "1")
        resp.delete_cookie(COOKIE)
    return resp


# ------------------------------------------------------------------ yt-dlp
def yt_info(target: str, **extra):
    opts = {"quiet": True, "no_warnings": True, "skip_download": True,
            "extract_flat": True, **extra}
    with YoutubeDL(opts) as y:
        return y.extract_info(target, download=False)


def entry_dict(e: dict) -> dict:
    artist = e.get("channel") or e.get("uploader") or ""
    return {"video_id": e.get("id"), "title": e.get("title") or "Unknown",
            "artist": re.sub(r" - Topic$", "", artist),
            "duration": int(e.get("duration") or 0)}


def match_youtube(artist: str, title: str, duration: int) -> str:
    """Find the YouTube video that best matches a Spotify track."""
    info = yt_info(f"ytsearch5:{artist} - {title}")
    best, best_score = None, None
    for rank, e in enumerate(info.get("entries") or []):
        if not e or not e.get("id"):
            continue
        d = int(e.get("duration") or 0)
        score = rank * 3 + (abs(d - duration) if d and duration else 15)
        if best_score is None or score < best_score:
            best, best_score = e["id"], score
    if not best:
        raise RuntimeError("No YouTube match found")
    return best


def audio_setting() -> str:
    """'best' keeps YouTube's top audio stream untouched (no re-encoding)."""
    fmt = get_setting("format", "best")
    return fmt if fmt in ("best", *FORMATS) else "best"


def video_format() -> str:
    # The video file's sound is what plays, so it gets the best audio too.
    audio = ("bestaudio[ext=m4a]" if audio_setting() in ("m4a", "mp3")
             else "bestaudio")
    return (f"bestvideo[height<=720][vcodec^=avc1]+{audio}/"
            "bestvideo[height<=720]+bestaudio/best[height<=720]/best")


progress: dict = {}   # track id -> {"stage", "pct", "speed", "eta"}
cancelled: set = set()  # track ids whose download should stop


class Cancelled(Exception):
    pass


def hook_for(tid: int, stage: str):
    """A yt-dlp progress hook that records how far a track's download is
    and aborts it once the track has been cancelled."""
    def hook(d):
        if tid in cancelled:
            raise Cancelled()
        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            done = d.get("downloaded_bytes") or 0
            progress[tid] = {"stage": stage, "speed": d.get("speed"),
                             "eta": d.get("eta"),
                             "pct": min(100, round(done * 100 / total))
                             if total else None}
        elif d.get("status") == "finished":
            progress[tid] = {"stage": stage, "pct": 100, "speed": None,
                             "eta": 0}
    return hook


def drop_files(vid: str | None):
    """Remove every file of a video that no track uses any more."""
    if not vid:
        return
    with db() as con:
        if con.execute("SELECT 1 FROM tracks WHERE video_id=?",
                       (vid,)).fetchone():
            return
    for p in MUSIC.glob(f"{vid}.*"):
        p.unlink(missing_ok=True)


def download(video_id: str, kind: str = "audio", hook=None) -> str:
    """Download audio (or 720p video); returns the file name inside MUSIC."""
    hooks = {"progress_hooks": [hook]} if hook else {}
    if kind == "video":
        name = f"{video_id}.mp4"
        if not (MUSIC / name).exists():
            opts = {"quiet": True, "no_warnings": True, "noplaylist": True,
                    **hooks,
                    "format": video_format(), "merge_output_format": "mp4",
                    "outtmpl": str(MUSIC / "%(id)s.%(ext)s")}
            with YoutubeDL(opts) as y:
                y.extract_info(f"https://www.youtube.com/watch?v={video_id}",
                               download=True)
            if not (MUSIC / name).exists():
                raise RuntimeError("Download finished but video file is missing")
        return name
    fmt = audio_setting()
    exts = tuple(dict.fromkeys((fmt, "opus", *FORMATS, "ogg")))
    for ext in exts:
        if (MUSIC / f"{video_id}.{ext}").exists():
            return f"{video_id}.{ext}"
    pp = {"key": "FFmpegExtractAudio", "preferredcodec": fmt}
    if fmt == "mp3":
        pp["preferredquality"] = "0"
    opts = {
        "quiet": True, "no_warnings": True, "noplaylist": True, **hooks,
        "format": ("bestaudio[ext=m4a]/bestaudio/best" if fmt == "m4a"
                   else "bestaudio/best"),
        "outtmpl": str(MUSIC / "%(id)s.%(ext)s"),
        "postprocessors": [pp],
    }
    with YoutubeDL(opts) as y:
        y.extract_info(f"https://www.youtube.com/watch?v={video_id}",
                       download=True)
    for ext in exts:  # with 'best' the extension depends on the stream
        if (MUSIC / f"{video_id}.{ext}").exists():
            return f"{video_id}.{ext}"
    raise RuntimeError("Download finished but audio file is missing")


# ----------------------------------------------------------------- spotify
def http(url: str, headers: dict | None = None, data: bytes | None = None):
    req = urllib.request.Request(url, data=data,
                                 headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


def spotify_api(kind: str, sid: str, cid: str, secret: str):
    auth = base64.b64encode(f"{cid}:{secret}".encode()).decode()
    tok = json.loads(http("https://accounts.spotify.com/api/token",
                          {"Authorization": f"Basic {auth}"},
                          b"grant_type=client_credentials"))["access_token"]
    hdr = {"Authorization": f"Bearer {tok}"}
    api = "https://api.spotify.com/v1"

    def conv(t):
        return {"id": t["id"], "title": t["name"],
                "artist": ", ".join(a["name"] for a in t.get("artists", [])),
                "duration": int(t.get("duration_ms") or 0) // 1000}

    if kind == "track":
        t = json.loads(http(f"{api}/tracks/{sid}", hdr))
        return t["name"], [conv(t)]
    head = json.loads(http(f"{api}/{kind}s/{sid}", hdr))
    tracks, page = [], head["tracks"]
    while page:
        for it in page.get("items", []):
            t = it.get("track") if kind == "playlist" else it
            if t and t.get("id"):
                tracks.append(conv(t))
        page = json.loads(http(page["next"], hdr)) if page.get("next") else None
    return head["name"], tracks


def spotify_embed(kind: str, sid: str):
    """No-credentials fallback: read the public embed page (max ~100 tracks)."""
    html = http(f"https://open.spotify.com/embed/{kind}/{sid}")
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        raise RuntimeError("Could not read Spotify page")
    ent = json.loads(m.group(1))["props"]["pageProps"]["state"]["data"]["entity"]
    name = ent.get("name") or ent.get("title") or "Spotify"
    if kind == "track":
        return name, [{
            "id": sid, "title": name,
            "artist": ", ".join(a["name"] for a in ent.get("artists", [])),
            "duration": int(ent.get("duration") or 0) // 1000}]
    tracks = []
    for t in ent.get("trackList", []):
        tid = (t.get("uri") or "").split(":")[-1] or t.get("uid")
        tracks.append({"id": tid, "title": t.get("title") or "Unknown",
                       "artist": t.get("subtitle") or "",
                       "duration": int(t.get("duration") or 0) // 1000})
    return name, tracks


def spotify_fetch(kind: str, sid: str):
    cid, secret = spotify_creds()
    if cid and secret:
        try:
            return spotify_api(kind, sid, cid, secret)
        except Exception as e:  # fall back to the embed page
            notify(f"Spotify API failed ({clean_err(e)}), using fallback", "warn")
    return spotify_embed(kind, sid)


# ------------------------------------------------------------------ lyrics
def lrclib(path: str, **params):
    url = f"https://lrclib.net/api/{path}?{urllib.parse.urlencode(params)}"
    try:
        return json.loads(http(url, {"User-Agent": "HomelabMusic/1.0"}))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def clean_title(title: str, artist: str, source: str):
    t = re.sub(r"\s*[\(\[][^)\]]*[\)\]]", "", title or "")
    if source != "spotify" and " - " in t:
        artist, t = t.split(" - ", 1)
    t = re.sub(r"\s+(ft\.?|feat\.?)\s.*$", "", t, flags=re.I)
    artist = (artist or "").split(",")[0]
    return t.strip() or (title or ""), artist.strip()


def fetch_lyrics(tid: int):
    """Look up lyrics on LRCLIB and store them. Returns (state, lyrics)."""
    with db() as con:
        row = con.execute("SELECT * FROM tracks WHERE id=?", (tid,)).fetchone()
    if not row:
        raise HTTPException(404)
    state, text = lookup_lyrics(row["title"], row["artist"], row["source"],
                                row["duration"] or 0)
    with db() as con:
        con.execute("UPDATE tracks SET lyrics=?,lyrics_state=? WHERE id=?",
                    (text, state, tid))
    return state, text


def lookup_lyrics(title: str, artist: str, source: str, dur: int):
    title, artist = clean_title(title, artist, source)
    if not artist:  # a bare title (e.g. an untagged upload) matches random songs
        return "none", None
    has = lambda r: r and (r.get("syncedLyrics") or r.get("plainLyrics"))
    hit = None
    if dur and artist:
        hit = lrclib("get", track_name=title, artist_name=artist, duration=dur)
    if not has(hit):
        res = (lrclib("search", track_name=title, artist_name=artist)
               if artist else None) or []
        if not res:
            res = lrclib("search", q=f"{title} {artist}".strip()) or []
        res = [r for r in res if has(r)]
        res.sort(key=lambda r: (
            bool(dur) and abs((r.get("duration") or 0) - dur) > 3,
            not r.get("syncedLyrics"),
            abs((r.get("duration") or 0) - dur) if dur else 0))
        hit = res[0] if res else None
    if has(hit):
        synced = hit.get("syncedLyrics")
        state, text = ("synced", synced) if synced else ("plain",
                                                         hit["plainLyrics"])
    else:
        state, text = "none", None
    return state, text


# ------------------------------------------------- streaming (no download)
_stream_cache: dict = {}
_stream_lock = threading.Lock()
_STREAM_MIME = {"m4a": "audio/mp4", "mp4": "audio/mp4", "webm": "audio/webm",
                "opus": "audio/ogg", "mp3": "audio/mpeg"}


def resolve_stream(video_id: str, kind: str = "audio", fresh: bool = False):
    """Return (url, headers, mime) of a direct stream, cached ~1h.

    Video uses a single file that already contains sound, because the browser
    cannot join YouTube's separate video and audio streams itself."""
    key = (video_id, kind)
    hit = _stream_cache.get(key)
    if hit and not fresh and hit[0] > time.time():
        return hit[1:]
    fmt = ("best[height<=720][ext=mp4][acodec!=none][vcodec!=none]/"
           "best[ext=mp4][acodec!=none][vcodec!=none]/best"
           if kind == "video" else "bestaudio[ext=m4a]/bestaudio/best")
    opts = {"quiet": True, "no_warnings": True, "noplaylist": True,
            "format": fmt}
    with YoutubeDL(opts) as y:
        info = y.extract_info(f"https://www.youtube.com/watch?v={video_id}",
                              download=False)
    if not info.get("url"):
        raise RuntimeError("No streamable audio found")
    if len(_stream_cache) > 200:
        _stream_cache.clear()
    if kind == "video":
        mime = "video/mp4" if info.get("ext") == "mp4" else "video/webm"
    else:
        mime = _STREAM_MIME.get(info.get("ext"), "audio/mpeg")
    _stream_cache[key] = (time.time() + 3600, info["url"],
                          dict(info.get("http_headers") or {}), mime)
    return _stream_cache[key][1:]


# ------------------------------------------------------------- clean names
# YouTube titles carry clutter ("(Official Video)", "#song", "| lyrics").
# Brackets that describe the version (remix, slowed, live...) are kept.
_JUNK = (r"official|lyrics?|lyric|audio|video|visuali[sz]er|m/?v|hd|hq|4k|"
         r"karaoke|clip|videoclip|full song|out now|subtitles?|sub|"
         r"çeviri|sözleri|letra|legendado|explicit|clean|premiere|new")
_KEEP = (r"remix|mix|slowed|reverb|sped|speed|nightcore|live|acoustic|cover|"
         r"extended|edit|version|ver\.?|feat|ft|prod|with|instrumental|"
         r"remaster|bass|8d|hour|loop|mashup|unplugged|demo")
_BRACKET = re.compile(r"\s*[\(\[\{【]([^\(\)\[\]\{\}【】]*)[\)\]\}】]")
_TAIL = re.compile(r"\s*[-–—|:]?\s*\b(official\s+)?(music\s+)?"
                   r"(lyrics?|lyric|audio|video|visuali[sz]er)(\s+video)?\s*$",
                   re.I)
_DASH = re.compile(r"\s+[-–—]\s+")


def _norm(s: str) -> str:
    return re.sub(r"[\W_]+", "", (s or "").lower())


def clean_names(title: str, artist: str):
    """Return a tidier (title, artist) for a YouTube video."""
    raw = title or ""

    def bracket(m):
        inner = m.group(1)
        junk = re.search(rf"\b({_JUNK})\b", inner, re.I)
        keep = re.search(rf"\b({_KEEP})\b", inner, re.I)
        return "" if junk and not keep else m.group(0)

    t = _BRACKET.sub(bracket, raw)
    t = re.split(r"\s+[|｜]\s+|\s+//\s+", t)[0]
    t = re.sub(r"\s*#\w+", "", t)
    for _ in range(3):
        t = _TAIL.sub("", t)
    t = re.sub(r"\s{2,}", " ", t).strip(" -–—|:")
    a = re.sub(r"\s*(- Topic|VEVO|Official)$", "", artist or "", flags=re.I).strip()
    # "Artist - Title": split at the first dash that is not inside brackets
    depth, cut = 0, None
    for m in re.finditer(r"[\(\[\{【]|[\)\]\}】]|\s+[-–—]\s+", t):
        s = m.group(0)
        if s in "([{【":
            depth += 1
        elif s in ")]}】":
            depth = max(0, depth - 1)
        elif depth == 0:
            cut = m
            break
    if cut:
        left, right = t[:cut.start()].strip(), t[cut.end():].strip()
        if left and right:
            # the side that is the channel's own name is the artist
            if _norm(right) and _norm(right) == _norm(a):
                t, a = left, right
            else:
                t, a = right, left
    return (t or raw or "Unknown"), a


# ----------------------------------------------------------------- library
def add_track(ext_id, title, artist, duration, source, video_id=None,
              kind="video") -> int:
    raw_title, raw_artist = title, artist
    if source == "youtube" and get_setting("clean_names", "1") == "1":
        title, artist = clean_names(title, artist)
    with db() as con:
        if video_id:  # same YouTube video already here (e.g. via Spotify)?
            same = con.execute("SELECT ext_id FROM tracks WHERE video_id=? "
                               "ORDER BY id LIMIT 1", (video_id,)).fetchone()
            if same:
                ext_id = same["ext_id"]
        cur = con.execute(
            "INSERT OR IGNORE INTO tracks(ext_id,title,artist,duration,source,"
            "video_id,kind,added_at,raw_title,raw_artist) "
            "VALUES(?,?,?,?,?,?,?,?,?,?)",
            (ext_id, title, artist, duration, source, video_id, kind,
             time.time(), raw_title, raw_artist))
        row = con.execute("SELECT id,status,kind FROM tracks WHERE ext_id=?",
                          (ext_id,)).fetchone()
        enqueue = bool(cur.rowcount)
        if not enqueue and kind == "video" and row["kind"] != "video":
            con.execute("UPDATE tracks SET kind='video',status='queued',"
                        "error=NULL WHERE id=?", (row["id"],))
            enqueue = True
        elif not enqueue and row["status"] == "error":
            con.execute("UPDATE tracks SET status='queued',error=NULL WHERE id=?",
                        (row["id"],))
            enqueue = True
    if enqueue:
        jobs.put(("track", row["id"]))
    return row["id"]


def playlist_append(con, pid: int, tid: int):
    pos = con.execute("SELECT COALESCE(MAX(position),-1)+1 p FROM "
                      "playlist_tracks WHERE playlist_id=?", (pid,)).fetchone()["p"]
    con.execute("INSERT OR IGNORE INTO playlist_tracks VALUES(?,?,?)",
                (pid, tid, pos))


def make_playlist(name: str, url: str, source: str, track_ids: list[int]):
    with db() as con:
        con.execute("INSERT OR IGNORE INTO playlists(name,url,source) "
                    "VALUES(?,?,?)", (name, url, source))
        pid = con.execute("SELECT id FROM playlists WHERE url=?",
                          (url,)).fetchone()["id"]
        for pos, tid in enumerate(track_ids):
            con.execute("INSERT OR REPLACE INTO playlist_tracks VALUES(?,?,?)",
                        (pid, tid, pos))


def yt_ext(video_id: str, kind: str) -> str:
    return "yt:" + video_id


def do_import(url: str, kind: str = "video", skip=()):
    m = SPOTIFY_RE.search(url)
    if m:
        kind, sid = m.groups()
        name, tracks = spotify_fetch(kind, sid)
        tracks = [t for t in tracks if t["id"] not in set(skip)]
        ids = [add_track(f"sp:{t['id']}", t["title"], t["artist"],
                         t["duration"], "spotify") for t in tracks if t["id"]]
        if kind != "track":
            make_playlist(name, f"spotify:{kind}:{sid}", "spotify", ids)
        notify(f"Spotify: queued {len(ids)} track(s) from “{name}”")
        return
    single = "watch?v=" in url or "youtu.be/" in url or "/shorts/" in url
    info = yt_info(url, noplaylist=single)
    if info.get("_type") == "playlist":
        ids = []
        for e in info.get("entries") or []:
            if e and e.get("id") and e.get("title") not in ("[Deleted video]",
                                                          "[Private video]"):
                t = entry_dict(e)
                ids.append(add_track(yt_ext(t["video_id"], kind), t["title"],
                                     t["artist"], t["duration"], "youtube",
                                     t["video_id"], kind))
        name = info.get("title") or "YouTube playlist"
        make_playlist(name, f"youtube:{info.get('id') or url}", "youtube", ids)
        notify(f"YouTube: queued {len(ids)} track(s) from “{name}”")
    else:
        t = entry_dict(info)
        add_track(yt_ext(t["video_id"], kind), t["title"], t["artist"],
                  t["duration"], "youtube", t["video_id"], kind)
        notify(f"Queued “{t['title']}”")


def file_duration(name: str) -> int:
    try:
        return probe(MUSIC / name)["duration"]
    except Exception:
        return 0


def audio_codec(path: Path) -> str:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0",
                        "-show_entries", "stream=codec_name", "-of",
                        "csv=p=0", str(path)],
                       capture_output=True, text=True, timeout=60)
    return r.stdout.strip()


def upgrade_scan():
    """Queue a fresh download for every song saved before 'Best' quality."""
    with db() as con:
        rows = con.execute(
            "SELECT id,file,video_file FROM tracks WHERE status='ready' AND "
            "video_id IS NOT NULL AND source!='upload'").fetchall()
    n = 0
    for r in rows:
        name = r["video_file"] or r["file"]
        try:
            if not name or audio_codec(MUSIC / Path(name).name) == "opus":
                continue
        except Exception:
            continue
        jobs.put(("upgrade", r["id"]))
        n += 1
    notify(f"Upgrading {n} song(s) to best quality" if n
           else "Every song is already at the best quality")


def do_upgrade(tid: int):
    """Download a song again at the current quality. The old files are set
    aside first and put back if the new download fails."""
    with db() as con:
        row = con.execute("SELECT * FROM tracks WHERE id=?", (tid,)).fetchone()
        if not row or row["status"] != "ready" or not row["video_id"]:
            return
        olds = [Path(n).name for n in (row["file"], row["video_file"]) if n]
        for n in olds:  # leave files that another track also uses
            if con.execute("SELECT 1 FROM tracks WHERE id!=? AND (file=? OR "
                           "video_file=?)", (tid, n, n)).fetchone():
                return
        con.execute("UPDATE tracks SET status='downloading' WHERE id=?", (tid,))
    vid, bak, moved = row["video_id"], MUSIC / ".old", []
    bak.mkdir(exist_ok=True)
    try:
        for n in olds:
            if (MUSIC / n).exists():
                (MUSIC / n).replace(bak / n)
                moved.append(n)
        fname = download(vid, "audio", hook_for(tid, "audio"))
        vname = (download(vid, "video", hook_for(tid, "video"))
                 if row["video_file"] else None)
        with db() as con:
            con.execute("UPDATE tracks SET file=?,video_file=?,status='ready' "
                        "WHERE id=?", (fname, vname, tid))
        for n in moved:
            (bak / n).unlink(missing_ok=True)
    except Exception as e:
        for p in MUSIC.glob(f"{vid}.*"):
            p.unlink(missing_ok=True)
        if tid in cancelled:  # the song was deleted meanwhile
            cancelled.discard(tid)
            for n in moved:
                (bak / n).unlink(missing_ok=True)
        else:
            for n in moved:
                (bak / n).replace(MUSIC / n)
            with db() as con:
                con.execute("UPDATE tracks SET status='ready' WHERE id=?",
                            (tid,))
            notify(f"Could not upgrade “{row['title']}”: {clean_err(e)}", "warn")
    finally:
        progress.pop(tid, None)


def process_track(tid: int):
    with db() as con:
        row = con.execute("SELECT * FROM tracks WHERE id=?", (tid,)).fetchone()
        if not row:
            cancelled.discard(tid)
            return
        need_video = (row["kind"] == "video" and not row["video_file"]
                      and row["source"] != "upload")
        if row["status"] == "ready" and row["file"] and not need_video:
            return
        con.execute("UPDATE tracks SET status='downloading' WHERE id=?", (tid,))
    vid = row["video_id"]
    try:
        vid = vid or match_youtube(row["artist"], row["title"],
                                   row["duration"])
        fname = row["file"] or download(vid, "audio", hook_for(tid, "audio"))
        vname, kind = row["video_file"], row["kind"]
        if need_video:
            try:
                vname = download(vid, "video", hook_for(tid, "video"))
            except Exception:
                if tid in cancelled:
                    raise
                kind = "audio"  # no video to be had: keep the sound only
        # Use the real length of the file: lyrics are matched against it.
        dur = file_duration(fname) or row["duration"]
        with db() as con:
            con.execute("UPDATE tracks SET video_id=?,file=?,video_file=?,"
                        "kind=?,duration=?,status='ready',error=NULL "
                        "WHERE id=?", (vid, fname, vname, kind, dur, tid))
        if get_setting("auto_lyrics", "1") == "1":
            jobs.put(("lyrics", tid))
    except Exception as e:
        if tid in cancelled:  # deleted while downloading: leave nothing behind
            cancelled.discard(tid)
            drop_files(vid)
        else:
            with db() as con:
                con.execute("UPDATE tracks SET status='error',error=? "
                            "WHERE id=?", (clean_err(e), tid))
    finally:
        progress.pop(tid, None)


def worker():
    while True:
        kind, arg = jobs.get()
        try:
            if kind == "import":
                do_import(*arg)
            elif kind == "upgrade_scan":
                upgrade_scan()
            elif kind == "upgrade":
                do_upgrade(arg)
            elif kind == "ai":
                run_ai(arg)
            elif kind == "lyrics":
                try:
                    fetch_lyrics(arg)
                except Exception:
                    pass  # stays unfetched; the UI can retry on demand
            else:
                process_track(arg)
        except Exception as e:
            notify(f"Import failed: {clean_err(e)}", "error")
        finally:
            jobs.task_done()


@app.on_event("startup")
def startup():
    init_db()
    load_auth()
    with db() as con:  # resume anything interrupted by a restart
        con.execute("UPDATE tracks SET status='queued' WHERE status='downloading'")
        pending = [r["id"] for r in con.execute(
            "SELECT id FROM tracks WHERE status='queued' ORDER BY id")]
    for tid in pending:
        jobs.put(("track", tid))
    for _ in range(max(1, WORKERS)):
        threading.Thread(target=worker, daemon=True).start()


# ------------------------------------------------------------------ upload
def probe(path: Path):
    r = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json",
                        "-show_format", "-show_streams", str(path)],
                       capture_output=True, text=True, timeout=120)
    info = json.loads(r.stdout or "{}")
    streams = info.get("streams") or []
    if not any(s.get("codec_type") == "audio" for s in streams):
        raise ValueError("not an audio file")
    fmt = info.get("format") or {}
    tags = {k.lower(): v for k, v in (fmt.get("tags") or {}).items()}
    for s in streams:
        for k, v in (s.get("tags") or {}).items():
            tags.setdefault(k.lower(), v)
    def is_picture(s):  # embedded cover art shows up as a "video" stream
        return bool((s.get("disposition") or {}).get("attached_pic")
                    or s.get("codec_name") in ("mjpeg", "png", "bmp", "gif"))

    vids = [s for s in streams if s.get("codec_type") == "video"]
    return {"title": tags.get("title"), "artist": tags.get("artist") or
            tags.get("album_artist") or "",
            "duration": int(float(fmt.get("duration") or 0)),
            "cover": any(is_picture(s) for s in vids),
            "video": any(not is_picture(s) for s in vids)}


def save_upload_meta(path: Path, name: str, playlist: int | None) -> dict:
    try:
        meta = probe(path)
    except Exception:
        path.unlink(missing_ok=True)
        raise HTTPException(400, f"“{name}” is not a playable audio file")
    title = meta["title"] or Path(name).stem
    with db() as con:
        cur = con.execute(
            "INSERT INTO tracks(ext_id,title,artist,duration,source,file,kind,"
            "status,added_at) VALUES(?,?,?,?,?,?,?,'ready',?)",
            (f"up:{path.name}", title, meta["artist"], meta["duration"],
             "upload", path.name, "video" if meta["video"] else "audio",
             time.time()))
        tid = cur.lastrowid
        if playlist and con.execute("SELECT 1 FROM playlists WHERE id=?",
                                    (playlist,)).fetchone():
            playlist_append(con, playlist, tid)
    if meta["cover"] or meta["video"]:  # cover art, or a frame of the video
        seek = ["-ss", "2"] if meta["video"] and meta["duration"] > 4 else []
        subprocess.run(["ffmpeg", "-y", "-v", "error", *seek, "-i", str(path),
                        "-an", "-frames:v", "1", "-vf", "scale=480:-2",
                        str(COVERS / f"{tid}.jpg")],
                       capture_output=True, timeout=120)
    if get_setting("auto_lyrics", "1") == "1":
        jobs.put(("lyrics", tid))
    return {"id": tid, "title": title,
            "kind": "video" if meta["video"] else "audio"}


@app.post("/api/upload")
async def upload(request: Request, name: str, playlist: int | None = None):
    ext = Path(name).suffix.lower()
    if ext not in AUDIO_EXT:
        raise HTTPException(400, f"Unsupported file type: {ext or name}")
    path = MUSIC / f"up_{uuid.uuid4().hex[:12]}{ext}"
    with open(path, "wb") as f:
        async for chunk in request.stream():
            f.write(chunk)
    return await run_in_threadpool(save_upload_meta, path, name, playlist)


# --------------------------------------------------------------------- api
class AddReq(BaseModel):
    video_id: str
    title: str = "Unknown"
    artist: str = ""
    duration: int = 0
    kind: str = "video"
    playlist: int | None = None  # also put the track into this folder


class ImportReq(BaseModel):
    url: str
    kind: str = "video"
    skip: list[str] = []  # Spotify track ids to leave out


class LikeReq(BaseModel):
    liked: bool


class NameReq(BaseModel):
    name: str


class TrackRef(BaseModel):
    track_id: int


class TrackEdit(BaseModel):
    title: str | None = None
    artist: str | None = None


@app.get("/api/search")
def search(q: str):
    q = q.strip()
    if not q:
        return []
    try:
        info = yt_info(f"ytsearch15:{q}")
    except Exception as e:
        raise HTTPException(502, clean_err(e))
    res = [entry_dict(e) for e in info.get("entries") or [] if e and e.get("id")]
    with db() as con:
        have = {r["video_id"] for r in con.execute(
            "SELECT video_id FROM tracks WHERE video_id IS NOT NULL")}
    for r in res:
        r["in_library"] = r["video_id"] in have
    return res


@app.post("/api/add")
def add(req: AddReq):
    if not re.fullmatch(r"[\w-]{6,20}", req.video_id):
        raise HTTPException(400, "Bad video id")
    kind = "video" if req.kind == "video" else "audio"
    tid = add_track(yt_ext(req.video_id, kind), req.title, req.artist,
                    req.duration, "youtube", req.video_id, kind)
    if req.playlist:
        with db() as con:
            if con.execute("SELECT 1 FROM playlists WHERE id=?",
                           (req.playlist,)).fetchone():
                playlist_append(con, req.playlist, tid)
    return {"id": tid}


@app.post("/api/import")
def import_url(req: ImportReq):
    url = req.url.strip()
    host = (urllib.parse.urlparse(url).hostname or "").lower()
    ok = SPOTIFY_RE.search(url) or any(
        host == h or host.endswith("." + h) for h in YOUTUBE_HOSTS)
    if not ok:
        raise HTTPException(400, "Only YouTube and Spotify links are supported")
    jobs.put(("import", (url, "video" if req.kind == "video" else "audio",
                         tuple(req.skip))))
    return {"ok": True}


@app.get("/api/spotify/preview")
def spotify_preview(url: str):
    """What a Spotify link contains, so it can be checked before importing."""
    m = SPOTIFY_RE.search(url)
    if not m:
        raise HTTPException(400, "Not a Spotify track, album or playlist link")
    kind, sid = m.groups()
    try:
        name, tracks = spotify_fetch(kind, sid)
    except Exception as e:
        raise HTTPException(502, f"Could not read that Spotify link: "
                                 f"{clean_err(e)}")
    with db() as con:
        have = {r["ext_id"] for r in con.execute(
            "SELECT ext_id FROM tracks WHERE ext_id LIKE 'sp:%'")}
    tracks = [{**t, "in_library": f"sp:{t['id']}" in have}
              for t in tracks if t.get("id")]
    return {"kind": kind, "name": name, "tracks": tracks}


_sp_covers: dict = {}


@app.get("/api/spotify/cover/{sid}")
def spotify_cover(sid: str):
    """Cover art of a Spotify track (looked up once, then remembered)."""
    if not re.fullmatch(r"[A-Za-z0-9]{10,40}", sid):
        raise HTTPException(400, "Bad track id")
    if sid not in _sp_covers:
        try:
            page = urllib.parse.quote(f"https://open.spotify.com/track/{sid}",
                                      safe="")
            _sp_covers[sid] = json.loads(http(
                f"https://open.spotify.com/oembed?url={page}")
            ).get("thumbnail_url") or ""
        except Exception:
            _sp_covers[sid] = ""
        if len(_sp_covers) > 5000:
            _sp_covers.clear()
    if not _sp_covers.get(sid):
        raise HTTPException(404)
    return RedirectResponse(_sp_covers[sid],
                            headers={"Cache-Control": "max-age=86400"})


# ------------------------------------------------------------------- remix
class RemixReq(BaseModel):
    track_id: int
    name: str = ""
    speed: float = 1.0    # 0.5 - 1.5; pitch follows, like a record player
    bass: float = 0.0     # dB of bass boost
    reverb: float = 0.0   # 0 - 1
    pan: bool = False     # "8D": the sound circles from ear to ear


def scale_lrc(text: str, speed: float) -> str:
    """Move synced-lyrics time stamps to match a slower or faster song."""
    def stamp(m):
        t = (int(m.group(1)) * 60 + float(m.group(2))) / speed
        return f"[{int(t // 60):02d}:{t % 60:05.2f}]"
    return re.sub(r"\[(\d+):(\d+(?:\.\d+)?)\]", stamp, text)


@app.post("/api/remix")
def remix(req: RemixReq):
    """Render a changed copy of a song (speed, bass, reverb, 8D) and add it
    to the library as a new track. The original is left alone."""
    with db() as con:
        row = con.execute("SELECT * FROM tracks WHERE id=?",
                          (req.track_id,)).fetchone()
    if not row or row["status"] != "ready" or not row["file"]:
        raise HTTPException(404, "That song is not in the library")
    speed = max(0.5, min(1.5, req.speed))
    bass = max(0.0, min(15.0, req.bass))
    reverb = max(0.0, min(1.0, req.reverb))
    af = ["aresample=48000"]
    if abs(speed - 1) > 0.004:
        af += [f"asetrate={48000 * speed:.0f}", "aresample=48000"]
    if bass:
        af.append(f"bass=g={bass:.1f}:f=110:w=0.7")
    if reverb:
        decays = "|".join(f"{d * reverb:.2f}" for d in (0.5, 0.4, 0.3, 0.2))
        af.append(f"aecho=0.8:0.9:70|140|230|360:{decays}")
    if req.pan:
        af.append("apulsator=hz=0.09:amount=1")
    if len(af) == 1:
        raise HTTPException(400, "Nothing was changed")
    af.append("alimiter=limit=0.95")
    out = MUSIC / f"rx_{uuid.uuid4().hex[:12]}.m4a"
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i",
                        str(MUSIC / Path(row["file"]).name), "-vn", "-af",
                        ",".join(af), "-c:a", "aac", "-b:a", "256k", str(out)],
                       capture_output=True, text=True, timeout=900)
    if r.returncode or not out.exists():
        out.unlink(missing_ok=True)
        raise HTTPException(500, f"Remix failed: {r.stderr.strip()[-200:]}")
    lyrics, state = row["lyrics"], row["lyrics_state"]
    if lyrics and state == "synced" and abs(speed - 1) > 0.004:
        lyrics = scale_lrc(lyrics, speed)
    title = req.name.strip() or f"{row['title']} (Remix)"
    with db() as con:
        cur = con.execute(
            "INSERT INTO tracks(ext_id,title,artist,duration,source,file,kind,"
            "status,added_at,lyrics,lyrics_state,lyrics_offset) "
            "VALUES(?,?,?,?,?,?,'audio','ready',?,?,?,?)",
            (f"rx:{out.stem}", title, row["artist"], file_duration(out.name),
             "remix", out.name, time.time(), lyrics, state,
             (row["lyrics_offset"] or 0) / speed))
        tid = cur.lastrowid
    copy_cover(row, tid)
    return {"id": tid, "title": title}


def copy_cover(row, tid: int):
    """Give a song made from another one (remix, split) that song's cover."""
    try:
        cover = COVERS / f"{tid}.jpg"
        if row["video_id"]:
            req_ = urllib.request.Request(
                f"https://i.ytimg.com/vi/{row['video_id']}/mqdefault.jpg",
                headers={"User-Agent": UA})
            with urllib.request.urlopen(req_, timeout=15) as resp:
                cover.write_bytes(resp.read())
        elif (COVERS / f"{row['id']}.jpg").exists():
            cover.write_bytes((COVERS / f"{row['id']}.jpg").read_bytes())
    except Exception:
        pass


# -------------------------------------------------------------- AI add-on
# An optional second container (see ai/) does the work that needs a graphics
# card. Both containers mount the same /data folder, so files are passed by
# path. Without the add-on these endpoints simply report "not available".
AI_URL = os.environ.get("AI_URL", "http://ai:8000").rstrip("/")
AI_TMP = DATA / "ai_tmp"
ai_jobs: deque = deque(maxlen=20)


def ai_call(path: str, body: dict | None = None, timeout: float = 5):
    req = urllib.request.Request(
        AI_URL + path, headers={"Content-Type": "application/json"},
        data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read()).get("detail")
        except Exception:
            detail = None
        raise RuntimeError(detail or f"The AI add-on failed ({e.code})")
    except (urllib.error.URLError, OSError):
        raise RuntimeError("The AI add-on is not running")


def wav_to_track(wav: Path, title: str, artist: str, source: str,
                 like=None) -> int:
    """Store an AI result as a new song (256 kbps AAC)."""
    out = MUSIC / f"ai_{uuid.uuid4().hex[:12]}.m4a"
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav),
                        "-c:a", "aac", "-b:a", "256k", str(out)],
                       capture_output=True, text=True, timeout=900)
    if r.returncode or not out.exists():
        out.unlink(missing_ok=True)
        raise RuntimeError("Could not save the result")
    with db() as con:
        cur = con.execute(
            "INSERT INTO tracks(ext_id,title,artist,duration,source,file,kind,"
            "status,added_at,lyrics,lyrics_state,lyrics_offset) "
            "VALUES(?,?,?,?,?,?,'audio','ready',?,?,?,?)",
            (f"ai:{out.stem}", title, artist, file_duration(out.name), source,
             out.name, time.time(), like["lyrics"] if like else None,
             like["lyrics_state"] if like else None,
             (like["lyrics_offset"] or 0) if like else 0))
        tid = cur.lastrowid
    if like is not None:
        copy_cover(like, tid)
    return tid


def run_ai(job: dict):
    job["state"] = "working"
    tmp = AI_TMP / job["id"]
    try:
        if job["kind"] == "split":
            with db() as con:
                row = con.execute("SELECT * FROM tracks WHERE id=?",
                                  (job["track_id"],)).fetchone()
            if not row or not row["file"]:
                raise RuntimeError("That song is no longer in the library")
            res = ai_call("/separate", {
                "src": str(MUSIC / Path(row["file"]).name),
                "out_dir": str(tmp)}, 3600)
            wav_to_track(Path(res["instrumental"]),
                         f"{row['title']} (Instrumental)", row["artist"],
                         "remix", row)
            wav_to_track(Path(res["vocals"]), f"{row['title']} (Vocals only)",
                         row["artist"], "remix", row)
            notify(f"“{row['title']}” is split: the instrumental and the "
                   "vocals-only song are in your library")
        else:
            out = tmp / "music.wav"
            ai_call("/generate", {"prompt": job["prompt"],
                                  "seconds": job["seconds"],
                                  "out": str(out)}, 3600)
            wav_to_track(out, job["label"], "AI", "ai")
            notify(f"“{job['label']}” is ready in your library")
        job["state"] = "done"
    except Exception as e:
        job.update(state="error", error=clean_err(e))
        notify(f"AI: {clean_err(e)}", "error")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def ai_queue(job: dict):
    try:
        ai_call("/health", timeout=3)
    except Exception as e:
        raise HTTPException(503, f"{e}. Start it on the server with: "
                                 "docker compose --profile ai up -d --build")
    job.update(id=uuid.uuid4().hex[:12], state="queued")
    ai_jobs.append(job)
    jobs.put(("ai", job))
    return {"ok": True}


def ai_active() -> list:
    return [{"kind": j["kind"], "label": j["label"], "state": j["state"]}
            for j in ai_jobs if j["state"] in ("queued", "working")]


@app.get("/api/ai")
def ai_status():
    try:
        info = ai_call("/health", timeout=2)
    except Exception:
        info = {}
    return {"available": bool(info.get("ok")), "device": info.get("device"),
            "gpu": info.get("gpu"), "vram_mb": info.get("vram_mb"),
            "jobs": ai_active()}


class SplitReq(BaseModel):
    track_id: int


class GenerateReq(BaseModel):
    prompt: str
    seconds: int = 20
    name: str = ""


@app.post("/api/ai/split")
def ai_split(req: SplitReq):
    with db() as con:
        row = con.execute("SELECT title FROM tracks WHERE id=? AND "
                          "status='ready'", (req.track_id,)).fetchone()
    if not row:
        raise HTTPException(404, "That song is not in the library")
    return ai_queue({"kind": "split", "track_id": req.track_id,
                     "label": row["title"]})


@app.post("/api/ai/generate")
def ai_generate(req: GenerateReq):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(400, "Describe the music first")
    return ai_queue({"kind": "generate", "prompt": prompt[:500],
                     "seconds": max(5, min(30, req.seconds)),
                     "label": (req.name.strip() or prompt)[:80]})


# ------------------------------------------------------------- artist info
def _deezer_artist(name: str) -> dict:
    j = json.loads(http("https://api.deezer.com/search/artist?limit=5&q="
                        + urllib.parse.quote(name)))
    for a in j.get("data") or []:
        if _norm(a.get("name")) == _norm(name):
            pic = a.get("picture_xl") or a.get("picture_big") or ""
            return {"picture": "" if "/artist//" in pic else pic,
                    "fans": a.get("nb_fan"), "albums": a.get("nb_album"),
                    "deezer": a.get("link")}
    return {}


def _musicbrainz_artist(name: str) -> dict:
    q = urllib.parse.quote(f'artist:"{name}"')
    j = json.loads(http(
        f"https://musicbrainz.org/ws/2/artist/?query={q}&fmt=json&limit=3",
        {"User-Agent": "HomelabMusic/1.0 (self-hosted music player)"}))
    for a in j.get("artists") or []:
        if (a.get("score") or 0) >= 90 and _norm(a.get("name")) == _norm(name):
            tags = sorted(a.get("tags") or [],
                          key=lambda t: -(t.get("count") or 0))
            span = a.get("life-span") or {}
            return {"type": a.get("type"),
                    "country": (a.get("area") or {}).get("name"),
                    "since": (span.get("begin") or "")[:4] or None,
                    "ended": bool(span.get("ended")),
                    "about": a.get("disambiguation") or None,
                    "genres": [t["name"] for t in tags[:4] if t.get("name")]}
    return {}


def artist_data(name: str, full: bool) -> dict:
    """Facts about an artist from Deezer (picture, fans) and MusicBrainz
    (country, genres, years). Looked up once, then kept for a month."""
    key = name.strip().lower()
    with db() as con:
        row = con.execute("SELECT data,fetched FROM artists WHERE name=?",
                          (key,)).fetchone()
    data = json.loads(row["data"]) if row else None
    if data and time.time() - row["fetched"] < 30 * 86400 and (
            data.get("full") or not full):
        return data
    data = {"name": name.strip(), "full": full, **(data or {})}
    try:
        data.update(_deezer_artist(name))
    except Exception:
        pass
    if full:
        data["full"] = True
        try:
            data.update(_musicbrainz_artist(name))
        except Exception:
            data["full"] = False  # try again next time
    with db() as con:
        con.execute("INSERT OR REPLACE INTO artists VALUES(?,?,?)",
                    (key, json.dumps(data), time.time()))
    return data


@app.get("/api/artist")
def artist_info(name: str):
    if not name.strip():
        raise HTTPException(400, "Name is required")
    return artist_data(name, True)


@app.get("/api/artist/picture")
def artist_picture(name: str):
    pic = artist_data(name, False).get("picture") if name.strip() else None
    if not pic:
        raise HTTPException(404)
    return RedirectResponse(pic, headers={"Cache-Control": "max-age=86400"})


@app.post("/api/upgrade")
def upgrade():
    """Re-download songs that were saved before 'Best' quality was chosen."""
    if audio_setting() not in ("best", "opus"):
        raise HTTPException(400, "Set the audio format to Best first")
    jobs.put(("upgrade_scan", None))
    return {"ok": True}


@app.post("/api/clean-names")
def clean_all_names():
    """Tidy the title and artist of every song that came from YouTube."""
    n = 0
    with db() as con:
        for r in con.execute("SELECT id,title,artist,raw_title FROM tracks "
                             "WHERE source='youtube'").fetchall():
            title, artist = clean_names(r["title"], r["artist"])
            if (title, artist) == (r["title"], r["artist"] or ""):
                continue
            if r["raw_title"] is None:  # keep the original for "restore"
                con.execute("UPDATE tracks SET raw_title=title,"
                            "raw_artist=artist WHERE id=?", (r["id"],))
            con.execute("UPDATE tracks SET title=?,artist=?,lyrics_state=CASE "
                        "WHEN lyrics_state='none' THEN NULL ELSE lyrics_state "
                        "END WHERE id=?", (title, artist, r["id"]))
            n += 1
    return {"count": n}


@app.post("/api/restore-names")
def restore_names():
    """Put back the names the songs had when they were downloaded."""
    with db() as con:
        cur = con.execute(
            "UPDATE tracks SET title=raw_title,artist=raw_artist WHERE "
            "raw_title IS NOT NULL AND (title!=raw_title OR "
            "COALESCE(artist,'')!=COALESCE(raw_artist,''))")
        return {"count": cur.rowcount}


@app.get("/api/tracks")
def tracks(playlist: int | None = None, view: str = ""):
    cols = (",".join("t." + c for c in TRACK_COLS.split(","))
            + ",t.video_file IS NOT NULL AS vfile")
    smart = {"liked": "WHERE liked=1 ORDER BY id DESC",
             "recent": "WHERE last_played IS NOT NULL "
                       "ORDER BY last_played DESC LIMIT 100",
             "top": "WHERE plays>0 ORDER BY plays DESC, last_played DESC "
                    "LIMIT 100"}
    with db() as con:
        if view in smart:
            rows = con.execute(f"SELECT {cols} FROM tracks t {smart[view]}")
        elif playlist:
            rows = con.execute(
                f"SELECT {cols} FROM tracks t JOIN playlist_tracks p ON "
                "p.track_id=t.id WHERE p.playlist_id=? ORDER BY p.position",
                (playlist,))
        else:
            rows = con.execute(f"SELECT {cols} FROM tracks t ORDER BY id DESC")
        return [dict(r) for r in rows]


@app.patch("/api/tracks/{tid}")
def edit_track(tid: int, req: TrackEdit):
    with db() as con:
        if req.title is not None and req.title.strip():
            con.execute("UPDATE tracks SET title=? WHERE id=?",
                        (req.title.strip(), tid))
        if req.artist is not None:
            con.execute("UPDATE tracks SET artist=? WHERE id=?",
                        (req.artist.strip(), tid))
        # metadata changed: forget a previous failed lyrics lookup
        con.execute("UPDATE tracks SET lyrics_state=NULL WHERE id=? AND "
                    "lyrics_state='none'", (tid,))
    return {"ok": True}


@app.post("/api/tracks/{tid}/like")
def like(tid: int, req: LikeReq):
    with db() as con:
        con.execute("UPDATE tracks SET liked=? WHERE id=?",
                    (1 if req.liked else 0, tid))
    return {"ok": True}


@app.post("/api/tracks/{tid}/played")
def played(tid: int):
    with db() as con:
        con.execute("UPDATE tracks SET plays=COALESCE(plays,0)+1,last_played=? "
                    "WHERE id=?", (time.time(), tid))
    return {"ok": True}


@app.post("/api/tracks/{tid}/retry")
def retry(tid: int):
    with db() as con:
        con.execute("UPDATE tracks SET status='queued',error=NULL "
                    "WHERE id=? AND status='error'", (tid,))
    jobs.put(("track", tid))
    return {"ok": True}


@app.post("/api/retry-failed")
def retry_failed():
    with db() as con:
        ids = [r["id"] for r in con.execute(
            "SELECT id FROM tracks WHERE status='error'")]
        con.execute("UPDATE tracks SET status='queued',error=NULL "
                    "WHERE status='error'")
    for tid in ids:
        jobs.put(("track", tid))
    return {"count": len(ids)}


@app.delete("/api/tracks/{tid}")
def delete_track(tid: int):
    with db() as con:
        row = con.execute("SELECT file,video_file,status FROM tracks WHERE "
                          "id=?", (tid,)).fetchone()
        if not row:
            raise HTTPException(404)
        if row["status"] in ("queued", "downloading"):
            cancelled.add(tid)  # stops the download if it is running
        con.execute("DELETE FROM tracks WHERE id=?", (tid,))
        con.execute("DELETE FROM playlist_tracks WHERE track_id=?", (tid,))
        names = {n for n in (row["file"], row["video_file"]) if n}
        keep = {n for n in names if con.execute(
            "SELECT 1 FROM tracks WHERE file=? OR video_file=?", (n, n)).fetchone()}
    for n in names - keep:
        (MUSIC / Path(n).name).unlink(missing_ok=True)
    (COVERS / f"{tid}.jpg").unlink(missing_ok=True)
    return {"ok": True}


@app.get("/api/tracks/{tid}/lyrics")
def lyrics(tid: int, refresh: bool = False):
    with db() as con:
        row = con.execute("SELECT lyrics,lyrics_state,lyrics_offset FROM tracks "
                          "WHERE id=?", (tid,)).fetchone()
    if not row:
        raise HTTPException(404)
    if refresh or not row["lyrics_state"]:
        try:
            state, text = fetch_lyrics(tid)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(502, f"Lyrics lookup failed: {clean_err(e)}")
        return {"state": state, "lyrics": text,
                "offset": row["lyrics_offset"] or 0}
    return {"state": row["lyrics_state"], "lyrics": row["lyrics"],
            "offset": row["lyrics_offset"] or 0}


@app.put("/api/tracks/{tid}/lyrics")
def save_lyrics(tid: int, body: dict):
    """Store lyrics uploaded from the user's device and/or a sync offset."""
    out = {}
    with db() as con:
        if not con.execute("SELECT 1 FROM tracks WHERE id=?", (tid,)).fetchone():
            raise HTTPException(404)
        if "lyrics" in body:
            text = str(body["lyrics"] or "").replace("\r\n", "\n").strip()[:200_000]
            state = ("none" if not text else "synced"
                     if re.search(r"^\[\d+:\d+", text, re.M) else "plain")
            con.execute("UPDATE tracks SET lyrics=?,lyrics_state=?,"
                        "lyrics_offset=0 WHERE id=?", (text or None, state, tid))
            out = {"state": state, "lyrics": text or None, "offset": 0}
        if "offset" in body:
            off = max(-30.0, min(30.0, float(body["offset"] or 0)))
            con.execute("UPDATE tracks SET lyrics_offset=? WHERE id=?",
                        (off, tid))
            out["offset"] = off
    return out


@app.get("/api/lyrics/lookup")
def lyrics_lookup(title: str, artist: str = "", duration: int = 0):
    """Lyrics for a track that is only being streamed (nothing is stored)."""
    try:
        state, text = lookup_lyrics(title, artist, "youtube", duration)
    except Exception as e:
        raise HTTPException(502, f"Lyrics lookup failed: {clean_err(e)}")
    return {"state": state, "lyrics": text}


@app.get("/api/stream/{video_id}")
def stream(video_id: str, request: Request, kind: str = "audio"):
    """Proxy YouTube audio straight to the browser without saving it."""
    if not re.fullmatch(r"[\w-]{6,20}", video_id):
        raise HTTPException(400, "Bad video id")
    up = None
    for fresh in (False, True):
        try:
            with _stream_lock:  # parallel browser requests share one lookup
                url, hdrs, mime = resolve_stream(
                    video_id, "video" if kind == "video" else "audio", fresh)
        except Exception as e:
            raise HTTPException(502, clean_err(e))
        if request.headers.get("range"):
            hdrs = {**hdrs, "Range": request.headers["range"]}
        # A freshly issued link is refused (403) for its first few seconds,
        # so wait and retry before giving up and asking for a new link.
        for wait in (0, 1.5, 2, 2.5, 3):
            time.sleep(wait)
            try:
                up = urllib.request.urlopen(
                    urllib.request.Request(url, headers=hdrs), timeout=20)
                break
            except urllib.error.HTTPError as e:
                if e.code not in (403, 410):
                    raise HTTPException(502, f"Stream failed ({e.code})")
            except Exception as e:
                raise HTTPException(502, clean_err(e))
        if up:
            break
    if not up:
        raise HTTPException(502, "YouTube refused the stream")
    out = {"Accept-Ranges": "bytes", "Cache-Control": "no-store"}
    for h in ("Content-Length", "Content-Range"):
        if up.headers.get(h):
            out[h] = up.headers[h]

    def body():
        try:
            while chunk := up.read(64 * 1024):
                yield chunk
        finally:
            up.close()

    return StreamingResponse(body(), status_code=up.status, headers=out,
                             media_type=mime)


@app.post("/api/lyrics/all")
def lyrics_all():
    with db() as con:
        ids = [r["id"] for r in con.execute(
            "SELECT id FROM tracks WHERE status='ready' AND lyrics_state IS NULL")]
    for tid in ids:
        jobs.put(("lyrics", tid))
    return {"count": len(ids)}


@app.get("/api/cover/{tid}")
def cover(tid: int):
    path = COVERS / f"{tid}.jpg"
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path, media_type="image/jpeg")


# folders & playlists
@app.get("/api/playlists")
def playlists():
    with db() as con:
        return [dict(r) for r in con.execute(
            "SELECT p.id,p.name,p.source, (SELECT COUNT(*) FROM playlist_tracks "
            "WHERE playlist_id=p.id) AS count FROM playlists p "
            "ORDER BY p.position IS NULL, p.position, p.name COLLATE NOCASE")]


@app.put("/api/playlists/order")
def playlists_order(body: dict):
    """Save the order the folders are shown in (ids, top to bottom)."""
    try:
        ids = [int(i) for i in body.get("ids") or []]
    except (TypeError, ValueError):
        raise HTTPException(400, "Bad folder list")
    with db() as con:
        for pos, pid in enumerate(ids):
            con.execute("UPDATE playlists SET position=? WHERE id=?", (pos, pid))
    return {"ok": True}


@app.post("/api/playlists")
def create_folder(req: NameReq):
    name = req.name.strip()
    if not name:
        raise HTTPException(400, "Name is required")
    with db() as con:
        cur = con.execute("INSERT INTO playlists(name,url,source) VALUES(?,?,?)",
                          (name, f"folder:{uuid.uuid4().hex}", "folder"))
        return {"id": cur.lastrowid, "name": name}


@app.patch("/api/playlists/{pid}")
def rename_playlist(pid: int, req: NameReq):
    if not req.name.strip():
        raise HTTPException(400, "Name is required")
    with db() as con:
        con.execute("UPDATE playlists SET name=? WHERE id=?",
                    (req.name.strip(), pid))
    return {"ok": True}


@app.delete("/api/playlists/{pid}")
def delete_playlist(pid: int):
    """Removes the folder/playlist only; its tracks stay in the library."""
    with db() as con:
        con.execute("DELETE FROM playlists WHERE id=?", (pid,))
        con.execute("DELETE FROM playlist_tracks WHERE playlist_id=?", (pid,))
    return {"ok": True}


@app.post("/api/playlists/{pid}/tracks")
def playlist_add(pid: int, req: TrackRef):
    with db() as con:
        if not con.execute("SELECT 1 FROM playlists WHERE id=?",
                           (pid,)).fetchone():
            raise HTTPException(404)
        playlist_append(con, pid, req.track_id)
    return {"ok": True}


@app.put("/api/playlists/{pid}/order")
def playlist_order(pid: int, body: dict):
    """Save a new order for the folder's tracks (ids, first to last)."""
    try:
        ids = [int(i) for i in body.get("track_ids") or []]
    except (TypeError, ValueError):
        raise HTTPException(400, "Bad track list")
    with db() as con:
        for pos, tid in enumerate(ids):
            con.execute("UPDATE playlist_tracks SET position=? WHERE "
                        "playlist_id=? AND track_id=?", (pos, pid, tid))
    return {"ok": True}


@app.delete("/api/playlists/{pid}/tracks/{tid}")
def playlist_remove(pid: int, tid: int):
    with db() as con:
        con.execute("DELETE FROM playlist_tracks WHERE playlist_id=? AND "
                    "track_id=?", (pid, tid))
    return {"ok": True}


# settings & status
@app.get("/api/settings")
def settings():
    with db() as con:
        s = con.execute(
            "SELECT COUNT(*) total, SUM(status='ready') ready, "
            "SUM(status='error') failed, "
            "SUM(lyrics_state IN ('synced','plain')) lyrics FROM tracks"
        ).fetchone()
        folders = con.execute("SELECT COUNT(*) c FROM playlists").fetchone()["c"]
    size = sum(f.stat().st_size for f in MUSIC.iterdir() if f.is_file())
    cid, secret = spotify_creds()
    return {"format": audio_setting(),
            "auto_lyrics": get_setting("auto_lyrics", "1") == "1",
            "clean_names": get_setting("clean_names", "1") == "1",
            "spotify_client_id": cid, "spotify_secret_set": bool(secret),
            "password_set": bool(_auth["hash"]),
            "stats": {"tracks": s["total"], "ready": s["ready"] or 0,
                      "failed": s["failed"] or 0, "lyrics": s["lyrics"] or 0,
                      "folders": folders, "bytes": size}}


@app.put("/api/settings")
def update_settings(body: dict):
    if "format" in body:
        if body["format"] not in ("best", *FORMATS):
            raise HTTPException(400, "Unknown format")
        set_setting("format", body["format"])
    if "auto_lyrics" in body:
        set_setting("auto_lyrics", "1" if body["auto_lyrics"] else "0")
    if "clean_names" in body:
        set_setting("clean_names", "1" if body["clean_names"] else "0")
    for key in ("spotify_client_id", "spotify_client_secret"):
        if key in body:
            set_setting(key, str(body[key]).strip())
    return {"ok": True}


@app.get("/api/status")
def status():
    with db() as con:
        rows = con.execute(
            "SELECT id,title,artist,video_id,status,error FROM tracks WHERE "
            "status IN ('queued','downloading','error') "
            "ORDER BY status!='downloading', status='error', id").fetchall()
    downloads = [{**dict(r), **progress.get(r["id"], {})} for r in rows]
    n = sum(1 for r in rows if r["status"] != "error")
    return {"pending": n or jobs.unfinished_tasks, "events": list(events),
            "downloads": downloads, "ai": ai_active()}


@app.get("/media/{tid}")
def media(tid: int, v: int = 0):
    """The song's audio file, or with ?v=1 its video file."""
    with db() as con:
        row = con.execute("SELECT file,video_file FROM tracks WHERE id=?",
                          (tid,)).fetchone()
    name = row and ((v and row["video_file"]) or row["file"])
    path = MUSIC / Path(name).name if name else None
    if not path or not path.exists():
        raise HTTPException(404)
    return FileResponse(
        path, media_type=mimetypes.guess_type(path.name)[0] or "audio/mpeg")


@app.get("/api/where/{video_id}")
def where(video_id: str):
    """Where a YouTube song lives in the library: its id and a folder, if any."""
    with db() as con:
        row = con.execute("SELECT id FROM tracks WHERE video_id=? ORDER BY id "
                          "LIMIT 1", (video_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Not in the library")
        pl = con.execute(
            "SELECT p.id,p.name,p.source FROM playlists p JOIN playlist_tracks "
            "pt ON pt.playlist_id=p.id WHERE pt.track_id=? ORDER BY p.id LIMIT 1",
            (row["id"],)).fetchone()
    return {"id": row["id"], "playlist": dict(pl) if pl else None}


STATIC = Path(__file__).parent / "static"


class FreshStatic(StaticFiles):
    """Make browsers check for a newer file every time instead of quietly
    running an old copy of the page after an update."""

    async def get_response(self, path, scope):
        resp = await super().get_response(path, scope)
        resp.headers["Cache-Control"] = "no-cache"
        return resp


@app.get("/")
def index():
    ver = int(max((STATIC / n).stat().st_mtime for n in ("app.js", "style.css")))
    html = (STATIC / "index.html").read_text("utf-8")
    html = html.replace('"style.css"', f'"style.css?v={ver}"').replace(
        '"app.js"', f'"app.js?v={ver}"')
    return HTMLResponse(html, headers={"Cache-Control": "no-cache"})


app.mount("/", FreshStatic(directory=STATIC, html=True), name="static")
