```markdown
# N-ATLAS Voice Tutor

**Voice-first language learning for Hausa, Igbo & Yorùbá**  
Powered exclusively by official N-ATLAS (NCAIR1/N-ATLaS)

Built for the **National AI Innovation Challenge (NAIC) 2026**  
**Problem Statement 02: Voice-First Access** – “Build applications for Nigerians who do not type”

---

## Overview

N-ATLAS Voice Tutor is a production-grade, voice-first web application that allows Nigerian users to learn and practice Hausa, Igbo, or Yorùbá through natural spoken conversation.

Users speak → N-ATLAS ASR transcribes → N-ATLAS LLM generates a pedagogically appropriate response → the tutor replies with spoken audio and a live transcript.

**Key principles:**
- Genuine N-ATLAS integration only (no GPT-4, AssemblyAI, global Whisper, or other general models)
- Guest mode by default (no login wall)
- Mobile-first and low-bandwidth optimised
- Full interaction logging for real-world validation

---

## Live Demo

🔗 **[Coming soon – deploy link will be added here]**

---

## Features

- **Language Selection** with distinct cultural theming for Hausa, Igbo, and Yorùbá
- **Voice Conversation Interface** – single large microphone button, clear recording states
- **Live Transcript Panel** for accessibility and learning review
- **Patient Language Tutor** – responds primarily in the target language, gently corrects errors, provides cultural context
- **Guest Mode** – start learning immediately, optional account for progress tracking
- **Full Interaction Logging** – every session is logged and exportable as CSV

---

## Tech Stack

| Layer          | Technology                                      |
|----------------|-------------------------------------------------|
| Frontend       | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| Backend        | Next.js API Routes (or FastAPI if GPU required) |
| LLM            | Official **NCAIR1/N-ATLaS** (Hugging Face)      |
| ASR            | Official N-ATLAS ASR models (Hausa / Igbo / Yorùbá) |
| TTS            | Pre-recorded phrases + Web Speech API fallback  |
| Database       | Redis (sessions) + SQLite/PostgreSQL (logs)     |
| Deployment     | Vercel (frontend) + GPU instance if self-hosting |

---

## N-ATLAS Integration

This project uses **only** official N-ATLAS models:

- **LLM**: [`NCAIR1/N-ATLaS`](https://huggingface.co/NCAIR1/N-ATLaS)
- **ASR**: Official N-ATLAS language-specific ASR models

Detailed integration evidence, inference method, code locations, and rejected alternatives are documented in:

📄 [`/docs/n-atlas-integration.md`](./docs/n-atlas-integration.md)

---

## Getting Started

### Prerequisites

- Node.js 18+
- Hugging Face account with access to `NCAIR1/N-ATLaS`
- (Optional) GPU instance if self-hosting ASR/LLM

### Installation

```bash
git clone https://github.com/<your-username>/n-atlas-voice-tutor.git
cd n-atlas-voice-tutor
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
HF_TOKEN=your_huggingface_token
N_ATLAS_LLM_ENDPOINT=...
N_ATLAS_ASR_ENDPOINT=...
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
n-atlas-voice-tutor/
├── app/                    # Next.js App Router
├── components/             # UI components
├── lib/                    # N-ATLAS clients, utils
├── docs/
│   └── n-atlas-integration.md
├── validation/             # Real-user interaction logs & CSV
├── public/
└── README.md
```

---

## Real-World Validation

Minimum 50 documented real user interactions with actual learners.

- Logs and CSV exports are stored in `/validation/`
- Summary metrics and (optional) testimonials will be added here

---

## Team (Track A – Academia & Research)

| Name | Role | Affiliation |
|------|------|-------------|
|      |      |             |
|      |      |             |
|      | Faculty Supervisor |             |

Institutional endorsement letter: `/docs/endorsement-letter.pdf` (to be added)

---

## Documentation

- [N-ATLAS Integration Evidence](./docs/n-atlas-integration.md)
- [Architecture Overview](./docs/architecture.md) *(coming soon)*
- [Setup & Usage Guide](./docs/setup.md) *(coming soon)*

---

## License

MIT License – see [LICENSE](./LICENSE)

---

## Acknowledgements

- National Centre for Artificial Intelligence and Robotics (NCAIR)
- Awarri Technologies
- Federal Ministry of Communications, Innovation and Digital Economy
- Official N-ATLAS model: [NCAIR1/N-ATLaS](https://huggingface.co/NCAIR1/N-ATLaS)

---

**Built for NAIC 2026 – Problem Statement 02: Voice-First Access**  
*Ship real solutions. Log real interactions. Use official N-ATLAS.*
```

---

**How to use it:**
1. Create the repository with the settings we agreed earlier.
2. On the empty repo page, click **“creating a new file”** or edit the auto-generated README.
3. Paste the content above.
4. Replace `<your-username>` with your actual GitHub username.
5. Commit the file.
