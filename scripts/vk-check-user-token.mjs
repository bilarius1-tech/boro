#!/usr/bin/env node
/**
 * Check VK_USER_ACCESS_TOKEN can upload wall photos + delete for the group.
 * Usage: node scripts/vk-check-user-token.mjs
 */
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const raw = fs.readFileSync(
    path.join(__dirname, "..", ".env.local"),
    "utf8"
  );
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

async function call(token, method, params) {
  const body = new URLSearchParams({
    access_token: token,
    v: "5.199",
    ...params,
  });
  const res = await fetch(`https://api.vk.com/method/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return res.json();
}

(async () => {
  const env = loadEnv();
  const user = env.VK_USER_ACCESS_TOKEN;
  const groupId = env.VK_GROUP_ID || "58585039";
  if (!user) {
    console.error("FAIL: VK_USER_ACCESS_TOKEN пуст — см. docs/VK_AUTOPOST.md");
    process.exit(1);
  }

  const me = await call(user, "users.get", {});
  console.log("user", JSON.stringify(me.response?.[0] || me));

  const up = await call(user, "photos.getWallUploadServer", {
    group_id: groupId,
  });
  if (up.error) {
    console.error("FAIL upload_server", up.error);
    process.exit(1);
  }
  console.log("upload_server OK");

  // dry: post tiny text then delete
  const post = await call(user, "wall.post", {
    owner_id: `-${groupId}`,
    from_group: "1",
    message: "🧪 Boro check — удаляю сразу",
    guid: `boro-check-${Date.now()}`,
  });
  if (post.error) {
    console.error("FAIL wall.post", post.error);
    process.exit(1);
  }
  const postId = post.response.post_id;
  console.log("wall.post OK", postId);

  const del = await call(user, "wall.delete", {
    owner_id: `-${groupId}`,
    post_id: String(postId),
  });
  if (del.error) {
    console.error("FAIL wall.delete", del.error);
    process.exit(1);
  }
  console.log("wall.delete OK");
  console.log("FULL CYCLE READY");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
