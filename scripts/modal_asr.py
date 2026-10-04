"""N-ATLaS ASR on Modal: the official NCAIR1 speech checkpoints behind a GPU endpoint.

Serves the existing FastAPI app in `asr-service/app.py`, which loads:
  * NCAIR1/Hausa-ASR
  * NCAIR1/Igbo-ASR
  * NCAIR1/Yoruba-ASR
  * NCAIR1/NigerianAccentedEnglish (optional)

The Next.js app on Vercel calls `{NATLAS_ASR_BASE_URL}/transcribe` and expects
a JSON reply with `text` and `model`. This Modal app provides that.

Prerequisites:

    python -m modal setup
    # `natlas-hf` must contain HF_TOKEN *and* NATLAS_ASR_API_KEY

Both keys are required. NATLAS_ASR_API_KEY is not optional: `asr-service/app.py`
skips authentication entirely when it is unset, which would leave this GPU
endpoint open to anyone who finds the URL.

Deploy:

    python -m modal deploy scripts/modal_asr.py

Then set on the Vercel project:

    NATLAS_ASR_BASE_URL = https://<workspace>--natlas-asr-server.modal.run
    NATLAS_ASR_API_KEY  = the NATLAS_ASR_API_KEY in the natlas-hf secret
"""

import modal

APP_NAME = "natlas-asr"
ASR_PORT = 8000
GPU = "L4:1"

# Dependency pins are copied verbatim from asr-service/requirements.txt so the
# hosted service and a self-hosted GPU box run identical code.
image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04",
        add_python="3.11",
    )
    .apt_install("ffmpeg")
    .uv_pip_install(
        "fastapi==0.115.5",
        "uvicorn[standard]==0.32.1",
        "python-multipart==0.0.17",
        "transformers==4.46.3",
        "accelerate==1.1.1",
        "numpy==2.1.3",
        "soundfile==0.12.1",
        "huggingface_hub==0.26.2",
        "torch==2.5.1",
    )
    .add_local_file("asr-service/app.py", "/srv/app.py", copy=True)
)

# The checkpoints are pulled straight from their NCAIR1 repo ids at load time, so
# without a cache every cold start re-downloads all three. This keeps repeated
# boots inside the startup timeout.
hf_cache_vol = modal.Volume.from_name("natlas-hf-cache", create_if_missing=True)

app = modal.App(APP_NAME)


@app.server(
    image=image,
    gpu=GPU,
    secrets=[
        modal.Secret.from_name(
            "natlas-hf",
            required_keys=["HF_TOKEN", "NATLAS_ASR_API_KEY"],
        ),
    ],
    volumes={"/root/.cache/huggingface": hf_cache_vol},
    port=ASR_PORT,
    # Scale to zero so an idle endpoint costs nothing. 30 minutes rather than 5,
    # for the same reason as the LLM app: this is called once per voice turn, and a
    # short window turns a pause in the lesson into a cold start that the 60 s
    # route cannot wait for. Warm it with `python -m modal run scripts/modal_asr.py`
    # before recording or demoing.
    scaledown_window=30 * 60,
    startup_timeout=600,
    target_concurrency=4,
    unauthenticated=True,
    routing_region="us-east",
)
class Server:
    """Run the existing FastAPI app with uvicorn."""

    @modal.enter()
    def start(self):
        import os
        import subprocess

        # Defaults to all three required languages. `setdefault` respects an
        # override from the Modal secret. `asr-service/app.py` reads this in its
        # startup hook, which uvicorn runs inside the subprocess that inherits
        # this environment.
        os.environ.setdefault("PRELOAD_LANGUAGES", "ha,ig,yo")

        cmd = [
            "uvicorn",
            "app:app",
            "--host",
            "0.0.0.0",
            "--port",
            str(ASR_PORT),
            "--timeout-keep-alive",
            "75",
        ]
        print(" ".join(cmd))
        self.process = subprocess.Popen(cmd, cwd="/srv")

    @modal.exit()
    def stop(self):
        self.process.terminate()


@app.local_entrypoint()
async def smoke(test_timeout=15 * 60):
    """Cold-start the ASR service and confirm it loads the official NCAIR1 checkpoints.

    Mirrors `probeAsr` in src/app/api/health/route.ts, which only reports the
    service healthy once at least three `NCAIR1/` checkpoints are resident.
    """
    import asyncio
    import json
    import time

    import aiohttp

    url = await Server.get_url.aio()
    deadline = time.time() + test_timeout

    async with aiohttp.ClientSession(base_url=url) as session:
        while time.time() < deadline:
            async with session.get(
                "/health", timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 200:
                    body = await resp.json()
                    print("health:", json.dumps(body, indent=2))
                    loaded = [
                        model
                        for model in body.get("loaded", [])
                        if model.startswith("NCAIR1/")
                    ]
                    if len(loaded) >= 3:
                        print(f"OK: {len(loaded)} NCAIR1 checkpoints loaded")
                        return
                    print(f"... {len(loaded)} official checkpoints, waiting for 3")
                elif resp.status == 503:
                    print("... booting (503)")
                else:
                    raise RuntimeError(f"health check failed: HTTP {resp.status}")
            await asyncio.sleep(10)
        raise RuntimeError(f"server not ready after {test_timeout}s")
