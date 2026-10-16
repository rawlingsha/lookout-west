import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Window } from "happy-dom";

const html = await readFile("dist/index.html", "utf8");
const script = await readFile("public/scripts/subscribe-modal.js", "utf8");

function fixture(t, enhance = true, url = "https://lookoutwest.us/") {
  const win = new Window({
    url,
    settings: {
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
    },
  });
  // No network, provider requests or real subscriptions in these tests.
  win.document.body.innerHTML = html.replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/g,
    "",
  );
  const timers = new Map();
  let timerId = 0;
  win.setTimeout = (fn) => {
    timers.set(++timerId, fn);
    return timerId;
  };
  win.clearTimeout = (id) => timers.delete(id);
  win.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  if (enhance) {
    win.eval(script);
    win.document.dispatchEvent(new win.Event("DOMContentLoaded"));
  }
  t.after(() => win.happyDOM.close());
  const form = win.document.querySelector("[data-subscribe-form]");
  const email = form.querySelector('[name="email"]');
  const submit = form.querySelector('button[type="submit"]');
  const status = form.querySelector("[data-subscribe-status]");
  const recovery = form.querySelector("[data-subscribe-recovery]");
  const send = () => {
    const event = new win.Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    return event;
  };
  return { win, form, email, submit, status, recovery, send, timers };
}

test("signup works as HTML without JavaScript and avoids iframe dependencies", async (t) => {
  const { win, form, email } = fixture(t, false);
  assert.equal(
    win.document.querySelector("#subscribe-modal").tagName,
    "DIALOG",
  );
  assert.equal(
    win.document.querySelector("#subscribe-modal").hasAttribute("open"),
    false,
  );
  assert.equal(
    win.document.querySelectorAll("#subscribe-modal iframe").length,
    0,
  );
  assert.equal(form.method, "post");
  assert.equal(
    form.action,
    "https://buttondown.com/api/emails/embed-subscribe/lookoutwest",
  );
  assert.equal(form.querySelector('[name="embed"]').value, "1");
  assert.equal(email.required, true);
  assert.equal(email.autocomplete, "email");
  email.value = "invalid";
  assert.equal(form.checkValidity(), false);
  email.value = "reader@example.com";
  assert.equal(form.checkValidity(), true);
  for (const link of win.document.querySelectorAll("[data-subscribe-open]")) {
    assert.equal(link.tagName, "A");
    assert.equal(link.getAttribute("href"), "/subscribe/");
  }
  assert.match(
    await readFile("dist/subscribe/index.html", "utf8"),
    /name="email"/,
  );
});

test("invalid email gets useful feedback which clears on editing", (t) => {
  const { win, form, email, status } = fixture(t);
  email.value = "invalid";
  assert.equal(form.checkValidity(), false);
  assert.equal(email.getAttribute("aria-invalid"), "true");
  assert.match(status.textContent, /valid email/);
  email.value = "reader@example.com";
  email.dispatchEvent(new win.Event("input"));
  assert.equal(email.hasAttribute("aria-invalid"), false);
  assert.equal(status.textContent, "");
});

test("submission preserves native POST, prevents duplicates and recovers from a stall", (t) => {
  const { form, email, submit, status, recovery, send, timers } = fixture(t);
  email.value = "reader@example.com";
  assert.equal(send().defaultPrevented, false);
  assert.equal(submit.disabled, true);
  assert.equal(form.getAttribute("aria-busy"), "true");
  assert.match(status.textContent, /Continuing/);
  assert.equal(send().defaultPrevented, true);
  for (const callback of [...timers.values()]) callback();
  assert.equal(submit.disabled, false);
  assert.equal(form.hasAttribute("aria-busy"), false);
  assert.equal(email.value, "reader@example.com");
  assert.equal(recovery.hidden, false);
  assert.equal(send().defaultPrevented, false);
});

test("offline attempt preserves the address and returning via Back resets submit state", (t) => {
  const { win, email, submit, status, recovery, send } = fixture(t);
  email.value = "reader@example.com";
  Object.defineProperty(win.navigator, "onLine", {
    configurable: true,
    value: false,
  });
  assert.equal(send().defaultPrevented, true);
  assert.match(status.textContent, /offline/);
  assert.equal(submit.disabled, false);
  assert.equal(email.value, "reader@example.com");
  Object.defineProperty(win.navigator, "onLine", {
    configurable: true,
    value: true,
  });
  assert.equal(send().defaultPrevented, false);
  win.dispatchEvent(new win.Event("pageshow"));
  assert.equal(submit.disabled, false);
  assert.equal(status.textContent, "");
  assert.equal(recovery.hidden, true);
  assert.equal(email.value, "reader@example.com");
});

test("dialog focuses email, restores the opener, and respects modified links", (t) => {
  const { win } = fixture(t);
  const modal = win.document.querySelector("#subscribe-modal");
  const opener = win.document.querySelector("[data-subscribe-open]");
  // Block native navigation in the DOM harness, after our handler observes it.
  opener.addEventListener("click", (event) => event.preventDefault());
  opener.dispatchEvent(
    new win.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    }),
  );
  assert.equal(modal.open, false);
  opener.click();
  assert.equal(modal.open, true);
  assert.equal(win.document.activeElement.id, "modal-subscribe-email");
  assert.equal(
    win.document.documentElement.classList.contains("has-overlay-open"),
    true,
  );
  modal.querySelector("[data-subscribe-close]").click();
  assert.equal(modal.open, false);
  // happy-dom does not dispatch the browser's native close event.
  modal.dispatchEvent(new win.Event("close"));
  assert.equal(
    win.document.documentElement.classList.contains("has-overlay-open"),
    false,
  );
  assert.equal(win.document.activeElement, opener);
});

test("confirmation appears only on Buttondown's success return and cleans the URL", (t) => {
  const { win } = fixture(
    t,
    true,
    "https://lookoutwest.us/?utm_source=newsletter&subscription=check-email#main-content",
  );
  const notice = win.document.querySelector("[data-subscribe-confirmation]");
  assert.equal(notice.hidden, false);
  assert.equal(
    notice.querySelector("strong").textContent,
    "Confirmation email sent",
  );
  assert.equal(
    notice.querySelector("span").textContent,
    "Check your inbox to finish subscribing.",
  );
  assert.equal(
    win.location.href,
    "https://lookoutwest.us/?utm_source=newsletter#main-content",
  );
  notice.querySelector("button").click();
  assert.equal(notice.hidden, true);
  assert.equal(win.document.activeElement.tagName, "MAIN");
  win.eval(script);
  win.document.dispatchEvent(new win.Event("DOMContentLoaded"));
  assert.equal(notice.hidden, true);
});

test("normal visits, invalid flags and submission attempts never claim an email was sent", (t) => {
  for (const suffix of [
    "",
    "?subscription=failed",
    "?subscription=confirmed",
  ]) {
    const { win, send } = fixture(t, true, `https://lookoutwest.us/${suffix}`);
    const notice = win.document.querySelector("[data-subscribe-confirmation]");
    assert.equal(notice.hidden, true);
    send();
    assert.equal(notice.hidden, true);
    assert.equal(notice.querySelector("strong").textContent, "");
  }
});
