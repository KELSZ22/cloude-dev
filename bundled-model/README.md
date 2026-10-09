# Built-in model (optional)

Put the pinned model file here to build an app that carries it inside the APK:

```
bundled-model/qwen3.5-0.8b-Q4_K_M.gguf
```

Then run `bunx expo prebuild --platform android --no-install` and build as usual. On first launch the app copies the model into its own storage, so users skip the import step.

- The file must be the exact pinned model. The build plugin checks its size and SHA-256 and stops if they differ. See [docs/LOCAL-MODEL.md](../docs/LOCAL-MODEL.md) for the download link and checksum.
- The file is git-ignored. Never commit it: it is 529 MB.
- Without the file, the app builds normally and asks the user to import the model.
- An APK with the model inside is about 600 MB, and the app needs another 529 MB on the device for its working copy.
- The model is Apache-2.0. When you share an APK that contains it, include the licence notice from the model's Hugging Face page.
