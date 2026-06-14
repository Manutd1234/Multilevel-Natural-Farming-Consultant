import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const model = process.argv.includes("--model")
  ? process.argv[process.argv.indexOf("--model") + 1]
  : "openai/whisper-small";
const includeWeights = process.argv.includes("--weights");
const outDir = path.resolve("models", model.replace("/", "__"));
const baseUrl = `https://huggingface.co/${model}/resolve/main`;
const coreFiles = [
  "config.json",
  "generation_config.json",
  "preprocessor_config.json",
  "tokenizer.json",
  "vocab.json",
  "merges.txt",
  "normalizer.json"
];
const weightFiles = ["model.safetensors"];
const files = includeWeights ? [...coreFiles, ...weightFiles] : coreFiles;

fs.mkdirSync(outDir, { recursive: true });

function download(file) {
  const target = path.join(outDir, file);
  const url = `${baseUrl}/${file}`;
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        https.get(response.headers.location, (redirect) => {
          if (redirect.statusCode !== 200) return reject(new Error(`${file}: HTTP ${redirect.statusCode}`));
          redirect.pipe(fs.createWriteStream(target)).on("finish", resolve).on("error", reject);
        }).on("error", reject);
        return;
      }
      if (response.statusCode !== 200) return reject(new Error(`${file}: HTTP ${response.statusCode}`));
      response.pipe(fs.createWriteStream(target)).on("finish", resolve).on("error", reject);
    });
    request.on("error", reject);
  });
}

for (const file of files) {
  process.stdout.write(`Downloading ${file}... `);
  await download(file);
  process.stdout.write("done\n");
}

console.log(`Whisper artifacts saved to ${outDir}`);
console.log("Use --weights to include model.safetensors. Keep models/ out of Git.");
