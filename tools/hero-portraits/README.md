# Full-body hero portraits

One reference-guided portrait job for each playable hero, using the current
shipping idle sprites and the briefs in `catalog.mjs`. The portrait prompts
show the entire character naturally occupied in a medieval setting: tracking,
walking, studying ruins or tending the forest, with shared environmental light
and convincing ground contact. They are staged
separately from the game's current menu art.

Requires Node 18+; no npm packages. Offline preparation needs no API key:

```powershell
node tools/hero-portraits/generate.mjs
```

This exports enlarged sprite references, individual prompts and `manifest.json`
under `output/hero-portraits/api/`. It makes **no network requests**. `--dry-run`
is an explicit alias for this default.

Later, set `OPENAI_API_KEY` locally in your terminal environment. Keep it out of
chat, source files, browser code and Git. Then generate one hero first:

```powershell
node tools/hero-portraits/generate.mjs --generate --hero knight
```

Generate the remaining roster (already completed matching files are skipped):

```powershell
node tools/hero-portraits/generate.mjs --generate
```

Default model: `gpt-image-2.5-sunburst`, high quality, 1024×1536, one PNG per
hero. Use `--model gpt-image-2.5-flare` for the other 2.5 model, `--quality medium`
for a draft, or `--hero archer,mage` for a subset. Settings or sprite changes
require a fresh output folder, e.g. `--out output/hero-portraits/api-v2`.

API mode sends each current sprite as an image reference to
`https://api.openai.com/v1/images/edits`. This is paid API usage against your
API organization's credits. It does not use signed-in Codex message limits.
No API call has been made while preparing this tool. There are no automatic
retries: an ambiguous network failure might already have incurred a charge;
check your API usage before repeating it. Successful images are saved one at a
time with prompt, source fingerprint, request ID and returned usage metadata.

The original chat images are under `output/hero-portraits/chat/`; the revised
candid scenes are under `output/hero-portraits/chat-natural-v2/`. The current
mixed set is `output/hero-portraits/chat-varied-v3/`: four reworked viewpoints
(Ranger, Sorcerer, Shadow, Paladin) alongside five retained scenes. Each folder
keeps its prompts and comparisons. Paladin now uses iron and antique gold in
both her portrait brief and the shipping sprite, rebuilt from
`tools/art-v4/src/paladin-a.px.js`. Prepare current API prompts in a fresh folder:
`node tools/hero-portraits/generate.mjs --out output/hero-portraits/api-varied-v3`.
The API script does not overwrite chat images or install
either set into the game. Promoting portraits into the menu is a separate art
integration step.

API reference: https://developers.openai.com/api/docs/guides/image-generation
