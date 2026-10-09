# Content and model licenses

## Bundled knowledge content

One pack is bundled: **Algebra Starter (Sample)**, [`assets/knowledge-packs/algebra-starter-sample.json`](../assets/knowledge-packs/algebra-starter-sample.json).

- 32 short passages on linear equations, quadratic equations, functions, and exponents.
- Written for this project on 2026-10-09. It was not copied, paraphrased, or adapted from any textbook, and no textbook was opened while writing it. The mathematics is standard and the wording and examples are original.
- The pack declares `MIT`, matching the repository `LICENSE`. **The team should confirm this choice** before any public release; a Creative Commons license is the more usual choice for prose.

No other article corpus is bundled and no external content was scraped.

## OpenStax textbook: not included

A copy of OpenStax *Algebra and Trigonometry 2e* sits in `resources/raw/` on one developer machine. It is **not** part of the app, the knowledge pack, the search index, or the tests, and `resources/raw/` is git-ignored so it cannot be committed by accident.

Do not ingest or redistribute it until someone has read the current OpenStax terms and recorded the outcome here. Two things need an answer in writing:

1. Whether its license notice permits loading the text into a retrieval index that feeds a language model. OpenStax books carry an added notice about use with AI systems, separate from the Creative Commons license.
2. What attribution and change notices redistribution inside an app would require.

Until then, expand the sample pack with original writing or with sources whose terms clearly allow this use.

## Before adding any pack

Record publisher, provenance, redistribution license, URLs, version, content hashes, and reproducible generation steps. Prefer original content or explicitly compatible licenses. The pack format requires `author`, `source`, and `license`, and the app shows them beside every cited passage.

## Model

The selected model is [diodel/Qwen3.5-0.8B-Q4_K_M-GGUF](https://huggingface.co/diodel/Qwen3.5-0.8B-Q4_K_M-GGUF), which declares Apache-2.0. See [LOCAL-MODEL.md](LOCAL-MODEL.md) for the exact revision, byte size, SHA-256, and provisioning steps. The original model is [Qwen/Qwen3.5-0.8B](https://huggingface.co/Qwen/Qwen3.5-0.8B). Model weights are excluded from the APK. Users explicitly download the pinned file from Hugging Face through Seekora's setup flow or import an existing local copy. Setup displays the declared license, and the model manager links the source repository and its notices. Native runtime artifacts are dependency assets.

For models, record exact GGUF source/version, byte size, SHA-256, license, chat template, and compatible runtime. Verify integrity before loading. Free access does not imply redistribution rights.
