import { parse } from "https://deno.land/std@0.198.0/toml/mod.ts";
import { join } from "https://deno.land/std@0.198.0/path/mod.ts";

const MODS_DIR = join(Deno.cwd(), "pack", "mods");

const modData: { name: string; slug: string }[] = [];

for await (const f of Deno.readDir(MODS_DIR)) {
  const path = join(MODS_DIR, f.name);
  const toml = parse(await Deno.readTextFile(path));

  const name = toml["name"] as string;
  const slug =
    (toml["update"] as Record<string, Record<string, string>>)["modrinth"][
      "mod-id"
    ];

  console.log("Found mod", name);

  modData.push({ name, slug });
}

modData.sort((a, b) => (a.name > b.name) ? 1 : -1);

const markdownList = modData.map((k) =>
  `- [${k.name}](https://modrinth.com/mod/${k.slug})`
);

const readmeLines = await Deno.readTextFile(join(Deno.cwd(), "README.md")).then(
  (txt) => txt.split("\n"),
);

const start = readmeLines.indexOf("<!-- MODS_START -->");
const end = readmeLines.indexOf("<!-- MODS_END -->");

const newReadmeLines = [
  ...readmeLines.slice(0, start + 1),
  ...markdownList,
  ...readmeLines.slice(end, readmeLines.length),
];

await Deno.writeTextFile(
  join(Deno.cwd(), "README.md"),
  newReadmeLines.join("\n"),
);

console.log("Wrote new README");

{
  const r = await fetch("https://api.modrinth.com/v2/project/vanillish", {
    method: "PATCH",
    body: JSON.stringify(
      { body: newReadmeLines.join("\n") },
    ),
    headers: {
      "Content-Type": "application/json",
      "Authorization": Deno.env.get("MODRINTH_TOKEN") ?? "",
    },
  });

  if (!r.ok) {
    console.error("Updating Modrinth failed:", await r.text());
  } else {
    console.log("Updated Modrinth description");
  }
}
