# N-ATLaS ASR service image.
#
# Build on a CUDA base image so the NCAIR1 ASR checkpoints run on the GPU:
#   docker build -f asr-service/Dockerfile -t natlas-asr .
#   docker run --gpus all -p 8000:8000 \
#     -e HF_TOKEN=<your gated-access token> \
#     -e NATLAS_ASR_API_KEY=<shared secret> \
#     natlas-asr
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# ffmpeg decodes the browser's WebM/Opus and MP4/AAC uploads to 16 kHz mono.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3.11 python3.11-venv python3-pip ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.11 /usr/bin/python

WORKDIR /srv

COPY asr-service/requirements.txt ./requirements.txt
RUN python -m pip install --upgrade pip \
    && python -m pip install --extra-index-url https://download.pytorch.org/whl/cu124 -r requirements.txt

COPY asr-service/app.py ./app.py

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "75"]
