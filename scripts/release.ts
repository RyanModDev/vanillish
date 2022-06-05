import { parse } from "https://deno.land/std@0.141.0/encoding/toml.ts";
import { join } from "https://deno.land/std@0.141.0/path/mod.ts";

const RELEASE_NAME = Deno.env.get("RELEASE_NAME");
const RELEASE_TAG = Deno.env.get("RELEASE_TAG");

if (!RELEASE_NAME) {
  throw new Error("No RELEASE_NAME environment variable!");
}
if (!RELEASE_TAG) {
  throw new Error("No RELEASE_TAG environment variable!");
}

const PACK_FILENAME = `vanillish-${RELEASE_TAG}.mrpack`;

const { success: buildOk } = await Deno.run({
  cmd: [
    join(Deno.env.get("HOME") ?? "", "go", "bin", "packwiz"),
    "modrinth",
    "export",
    "-o",
    `../${PACK_FILENAME}`,
  ],

  cwd: join(Deno.cwd(), "pack"),
  stdout: "inherit",
  stderr: "inherit",
}).status();

if (!buildOk) {
  Deno.exit(1);
}

const gameVersion = (parse(
  await Deno.readTextFile(join(Deno.cwd(), "pack", "pack.toml")),
)["versions"] as { "minecraft": string })["minecraft"];

const f = await Deno.readFile(
  join(Deno.cwd(), PACK_FILENAME),
);
const file = new File([f], PACK_FILENAME);
const form = new FormData();

const data = {
  "name": RELEASE_NAME,
  "version_number": RELEASE_TAG,
  "game_versions": [gameVersion],
  "version_type": "release",
  "loaders": ["fabric"],
  "featured": true,
  "project_id": "aBvDpMMt",
  "file_parts": [PACK_FILENAME],
  "dependencies": [],
};
form.append("data", JSON.stringify(data));
form.append(PACK_FILENAME, file);

const res = await fetch("https://api.modrinth.com/v2/version", {
  method: "POST",
  body: form,
  headers: {
    "Authorization": Deno.env.get("MODRINTH_TOKEN") ?? "",
  },
});

if (!res.ok) {
  throw new Error(await res.text());
}

console.log("Uploaded to Modrinth!");
