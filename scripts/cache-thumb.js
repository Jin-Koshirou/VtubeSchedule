import fs from "fs";
import fetch from "node-fetch";
import path from "path";

const data = JSON.parse(fs.readFileSync("agenda.json"));
const outDir = path.resolve("public/cache");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const item of data) {
  if (item.id === "placeholder") { continue };

  const parts = item.thumb.split("/");
  const name = parts[parts.length - 2] + ".jpg";
  const file = path.join(outDir, name);

  if (!fs.existsSync(file)) {
    const res = await fetch(item.thumb);
    const buf = await res.arrayBuffer();
    fs.writeFileSync(file, Buffer.from(buf));
  }

  item.thumb = `/cache/${name}`;
}

fs.writeFileSync(path.join(outDir, "agenda.cached.json"), JSON.stringify(data, null, 2));
