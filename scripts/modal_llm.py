"""N-ATLaS LLM on Modal: the official NCAIR1 weights behind an OpenAI-compatible endpoint.

Why Modal rather than the local `llama-server` in `docs/deployment.md` §1 Option A:
the Next.js app runs on Vercel, and a Vercel function cannot reach a localhost
llama-server — that is the whole reason `/api/health` reports `fetch failed`. Modal
gives the app a public HTTPS URL, and the weights are pulled by Modal's network
into a Volume rather than over a local connection.

Cost: this app scales to zero after 30 idle minutes, so an endpoint nobody is
demonstrating to costs nothing. The price of that is a vLLM cold start on the
first turn after an idle stretch, which takes minutes and will not fit inside the
60 s the Next.js route allows. So warm it on purpose, immediately before you need
it — this entrypoint boots the server, waits for /health, and then checks that a
Hausa prompt comes back in Hausa:

    python -m modal run scripts/modal_llm.py

Run it a few minutes before recording the demo video or before a validation
session, not after. Set `min_containers=1` back for demo day only, if a cold start
in the middle of a judged run is a risk you would rather pay for.

Prerequisites:

    python -m modal setup
    python -m modal secret create natlas-hf      # HF_TOKEN, NATLAS_LLM_API_KEY

`HF_TOKEN` needs read access to the gated `NCAIR1/N-ATLaS` repo, which means
accepting its licence conditions on huggingface.co first.

Deploy:

    python -m modal deploy scripts/modal_llm.py

Then set on the Vercel project (see `docs/deployment.md` §1):

    NATLAS_LLM_BASE_URL = <the printed URL>/v1
    NATLAS_LLM_API_KEY  = the NATLAS_LLM_API_KEY used in the Modal secret
    NATLAS_LLM_MODEL    = NCAIR1/N-ATLaS
"""

import modal

MODEL_ID = "NCAIR1/N-ATLaS"
# `src/lib/natlas/config.ts` refuses any model id without the `NCAIR1/` prefix, and
# `llm.ts` sends this exact string as the `model` field, so the served name must be
# the official id rather than a convenience alias.
SERVED_NAME = "NCAIR1/N-ATLaS"
# N-ATLaS's documented context. `llm.ts::trimToContext` budgets 18,000 characters
# at 3.2 chars/token, which is sized against this number.
MAX_MODEL_LEN = 8092
VLLM_PORT = 8000
GPU = "L4:1"

image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.9.0-devel-ubuntu22.04",
        add_python="3.12",
    )
    .entrypoint([])
    .uv_pip_install("vllm==0.21.0")
    .env(
        {
            "HF_XET_HIGH_PERFORMANCE": "1",
            "VLLM_LOG_STATS_INTERVAL": "1",
        }
    )
)

hf_cache_vol = modal.Volume.from_name("natlas-hf-cache", create_if_missing=True)
vllm_cache_vol = modal.Volume.from_name("natlas-vllm-cache", create_if_missing=True)

app = modal.App("natlas-llm")


@app.server(
    image=image,
    gpu=GPU,
    secrets=[
        modal.Secret.from_name(
            "natlas-hf",
            required_keys=["HF_TOKEN", "NATLAS_LLM_API_KEY"],
        )
    ],
    volumes={
        "/root/.cache/huggingface": hf_cache_vol,
        "/root/.cache/vllm": vllm_cache_vol,
    },
    port=VLLM_PORT,
    # Scale to zero so an idle endpoint costs nothing. The window is 30 minutes,
    # not the 5 it was set to: this app is called once per conversational turn, so
    # a short window means a pause mid-lesson pays a multi-minute vLLM cold start
    # against a Next.js route capped at 60 s. Warm it deliberately instead —
    # `python -m modal run scripts/modal_llm.py` boots it and verifies a Hausa
    # prompt answers in Hausa.
    scaledown_window=30 * 60,
    startup_timeout=600,
    target_concurrency=8,
    unauthenticated=True,
    routing_region="us-east",
)
class Server:
    """vLLM in OpenAI-compatible mode.

    `unauthenticated=True` opens the Modal proxy so the Vercel app can reach it;
    access is still gated by vLLM's own `--api-key`, so the endpoint cannot be used
    to burn the free credit by anyone who has not got the key.
    """

    @modal.enter()
    def start(self):
        import os
        import subprocess

        cmd = [
            "vllm",
            "serve",
            MODEL_ID,
            "--served-model-name",
            SERVED_NAME,
            "--host",
            "0.0.0.0",
            "--port",
            str(VLLM_PORT),
            "--max-model-len",
            str(MAX_MODEL_LEN),
            "--dtype",
            "bfloat16",
            "--gpu-memory-utilization",
            "0.9",
            "--api-key",
            os.environ["NATLAS_LLM_API_KEY"],
            "--enforce-eager",
            "--uvicorn-log-level=info",
        ]
        print(" ".join(cmd))
        self.process = subprocess.Popen(cmd)

    @modal.exit()
    def stop(self):
        self.process.terminate()


@app.local_entrypoint()
async def smoke(test_timeout=15 * 60):
    """Cold-start the server and confirm N-ATLaS replies in the target language.

    This is the check that matters for the bug where the tutor answered in English:
    a Hausa prompt must come back as Hausa. A 503 from `/health` is Modal's normal
    "still booting" response, so it is retried rather than treated as a failure.
    """
    import asyncio
    import json
    import os
    import time

    import aiohttp

    url = await Server.get_url.aio()
    key = os.environ["NATLAS_LLM_API_KEY"]
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    deadline = time.time() + test_timeout
    async with aiohttp.ClientSession(base_url=url, headers=headers) as session:
        while time.time() < deadline:
            async with session.get("/health", timeout=aiohttp.ClientTimeout(total=60)) as resp:
                if resp.status == 200:
                    break
                if resp.status == 503:
                    await asyncio.sleep(5)
                    continue
                raise RuntimeError(f"health check failed: HTTP {resp.status}")
        else:
            raise RuntimeError(f"server not ready after {test_timeout}s")

        async with session.get("/v1/models") as resp:
            print("models:", json.dumps(await resp.json()))

        payload = {
            "model": SERVED_NAME,
            "messages": [
                {
                    "role": "system",
                    "content": "You are N-ATLaS, a patient Hausa tutor. Reply only in Hausa.",
                },
                {"role": "user", "content": "Ka fa za ka iya magana da ni?"},
            ],
            "max_tokens": 120,
            "temperature": 0.4,
            "chat_template_kwargs": {"date_string": "03 Oct 2026"},
        }
        async with session.post("/v1/chat/completions", json=payload) as resp:
            resp.raise_for_status()
            print("reply:", (await resp.json())["choices"][0]["message"]["content"])
