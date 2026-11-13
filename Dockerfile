FROM python:3.13-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

# yt-dlp needs a JavaScript runtime for YouTube
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app

ENV DATA_DIR=/data PYTHONUNBUFFERED=1
VOLUME /data
EXPOSE 8000

# YouTube changes often; optionally refresh yt-dlp on every container start
CMD ["sh", "-c", "if [ \"$YTDLP_AUTO_UPDATE\" = \"1\" ]; then pip install -q --no-cache-dir -U 'yt-dlp[default]' || true; fi; exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
