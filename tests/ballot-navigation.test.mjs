import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Window } from "happy-dom";

test("every ballot navigator link reaches the correct numbered section", () => {
  const document = new Window().document;
  document.body.innerHTML = readFileSync(
    new URL("../dist/research/economic-ballot-2026/index.html", import.meta.url),
    "utf8",
  );
  const links = document.querySelectorAll(".ballot-nav a");
  assert.equal(links.length, 28);
  for (const link of links) {
    const id = link.hash.slice(1);
    const targets = document.querySelectorAll(`[id="${id}"]`);
    assert.equal(targets.length, 1, `${link.getAttribute("aria-label")}: missing or duplicate target`);
    assert.equal(targets[0].tagName, "H2");
    const number = Number(link.textContent.trim());
    if (number) assert.ok(targets[0].textContent.startsWith(`${number}. `), `Wrong section for ${link.textContent}`);
    else assert.equal(id, "ballot-closing");
  }
  const expected = {
    "Oil & gas": ["ballot-texas-oil"],
    "Housing & development": ["ballot-arizona-nevada-growth", "ballot-california-housing"],
    "California": ["ballot-california-wealth-tax", "ballot-california-housing", "ballot-california-budget"],
    "Texas": ["ballot-congress", "ballot-texas-oil"],
    "South Dakota": ["ballot-south-dakota-medicaid"],
  };
  for (const [label, ids] of Object.entries(expected)) {
    const row = [...document.querySelectorAll(".ballot-nav li")].find(
      (item) => item.querySelector(".ballot-nav__name").textContent === label,
    );
    assert.deepEqual([...row.querySelectorAll("a")].map((a) => a.hash.slice(1)), ids);
  }
});
