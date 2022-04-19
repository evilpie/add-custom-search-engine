"use strict";
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

const XML_TEMPLATE = `<?xml version="1.0" encoding="utf-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
<ShortName>####REPLACE####</ShortName>
<Description></Description>
<InputEncoding>UTF-8</InputEncoding>
<Image height="16" width="16"></Image>
<Url type="text/html" method="get" template=""></Url>
<Url type="application/x-suggestions+json" method="get" template=""></Url>
</OpenSearchDescription>`;

// Work around broken paste.mozilla.org when using Cyrillic.
function htmlEntityEncode(before) {
  let after = "";

  for (let char of before) {
    let codePoint = char.codePointAt(0);
    if ((codePoint >= 65 && codePoint < 91) || (codePoint >= 97 && codePoint < 123)) {
      after += char;
    } else {
      after += `&#${codePoint};`;
    }
  }

  return after;
}

function createXMLString() {
  const parser = new DOMParser();
  const doc = parser.parseFromString(XML_TEMPLATE, "application/xml");

  const form = document.querySelector("form");
  const data = new FormData(form);

  // // Name
  // const name = doc.getElementsByTagName("ShortName")[0];
  // name.innerText = data.get("name");

  // Search URL
  const url = doc.querySelector("Url[type=\"text/html\"]");
  url.setAttribute("template", data.get("url").replace(/%s/g, "{searchTerms}"));
  if (data.get("use-post")) {
    url.setAttribute("method", "POST");

    const params = new URLSearchParams(data.get("post"));
    for (const [name, value] of params) {
      const param = doc.createElementNS("http://a9.com/-/spec/opensearch/1.1/", "Param");
      param.setAttribute("name", name);
      param.setAttribute("value", value);
      url.append("\n"); // Nicer format!
      url.append(param);
    }
  } else {
    url.setAttribute("method", "GET");
  }

  // Icon
  const image = doc.getElementsByTagName("Image")[0];
  if (data.get("icon")) {
    image.textContent = data.get("icon");
  } else {
    image.remove();
  }

  // == Advanced ==

  // Suggest URL
  const suggestUrl = doc.querySelector("Url[type=\"application/x-suggestions+json\"]");
  if (data.get("suggest-url")) {
    suggestUrl.setAttribute("rel", "suggestions");
    suggestUrl.setAttribute("method", "GET");
    suggestUrl.setAttribute("template", data.get("suggest-url"));
  } else {
    suggestUrl.remove();
  }

  // Input Encoding
  const encoding = doc.getElementsByTagName("InputEncoding")[0];
  if (data.get("encoding")) {
    encoding.textContent = data.get("encoding");
  }

  // Description
  const description = doc.getElementsByTagName("Description")[0];
  if (data.get("description")) {
    description.textContent = data.get("description");
  } else {
    description.remove();
  }

  const serialzer = new XMLSerializer();
  const string = serialzer.serializeToString(doc);

  // Name
  // Work around textContent not passing through HTML entities.
  return string.replace("####REPLACE####", htmlEntityEncode(data.get("name")))
}

document.querySelector("form").addEventListener("submit", async event => {
  event.preventDefault();

  const string = createXMLString();

  // Upload the OpenSearch XML description to file.io, because AddSearchProvider
  // requires http(s) URLs. After the XML is downloaded to start the installation
  // process, the file should be automatically removed.

  try {
    let response = await fetch("https://paste.mozilla.org/api/", {
      method: "POST",
      body: new URLSearchParams({
        content: string,
        format: "json",
        expires: "onetime",
        lexer: "xml"
      })
    });

    let json = await response.json();
    // We need the raw XML instead of the pretty HTML view
    // Mozilla's dpaste instance is misconfigured, we have to fix the URL.
    let url = json.url.replace("dpaste-base-url.example.org", "paste.mozilla.org") + "/raw";

    let link = document.createElement("link");
    link.rel = "search";
    link.type = "application/opensearchdescription+xml";
    link.title = document.querySelector("#input-name").value;
    link.href = url;

    // This doesn't actually seem to work. Firefox seems to cache.
    let existing = document.querySelector("link[rel=search]");
    if (existing) {
      existing.remove();
    }

    document.head.append(link);

    document.querySelector("#main").style.display = "none";
    document.querySelector("#instructions").style.display = "block";
  } catch(error) {
    alert(error);
  };
});

document.querySelector("#close").addEventListener("click", event => {
  event.preventDefault();

  document.querySelector("#main").style.display = "block";
  document.querySelector("#instructions").style.display = "none";
})

document.querySelector("#show-preview").addEventListener("click", event => {
  const string = createXMLString();

  const code = document.querySelector("#preview");
  code.textContent = string;

  event.preventDefault();
});

function usePost() {
  const checked = document.querySelector("#use-post").checked;
  document.querySelector("#input-post").disabled = !checked;
  if (!checked) {
    document.querySelector("#input-post").value = "";
  }
}
document.querySelector("#use-post").addEventListener("change", usePost);

document.querySelector("#input-url").addEventListener("change", event => {
  try {
    const url = new URL(event.target.value);
    const icon = document.querySelector("#input-icon");
    if (!icon.value) {
      icon.value = url.origin + "/favicon.ico";
      icon.dispatchEvent(new Event("change"));
    }
  } catch (e) {}
});

document.querySelector("#input-file-icon").addEventListener("change", event => {
  const reader = new FileReader();
  reader.addEventListener("load", function () {
    document.querySelector("#input-icon").value = reader.result;
    loadIcon();
  }, false);

  if (event.target.files && event.target.files[0]) {
    reader.readAsDataURL(event.target.files[0]);
  }
});

function loadIcon() {
  const url = document.querySelector("#input-icon").value;
  document.querySelector("#icon-preview").src = url || "icons/search.svg";
}
document.querySelector("#input-icon").addEventListener("change", loadIcon);

function showAdvanced() {
  const checked = document.querySelector("#show-advanced").checked;

  document.querySelectorAll(".advanced").forEach(element => {
    element.classList.toggle("adv-hidden", !checked);
  });

  if (!checked) {
    document.querySelector("#preview").textContent = "";
    document.querySelector("#input-post").value = "";
    document.querySelector("#use-post").checked = false;
  }
}
document.querySelector("#show-advanced").addEventListener("change", showAdvanced);

async function checkName(event) {
  const searchEngines = await browser.search.get();

  for (const engine of searchEngines) {
    if (engine.name === event.target.value) {
      event.target.setCustomValidity("Search engine with this name already exists.");
      event.target.reportValidity();
      event.target.preventDefault();
      return;
    }
  }

  event.target.setCustomValidity("");
  event.target.reportValidity();
}
document.querySelector("#input-name").addEventListener("change", checkName);

document.addEventListener("DOMContentLoaded", () => {
  showAdvanced();
  usePost();
  loadIcon();
});

// One-click selection for convience, because we can't directly link about:preferences
document.querySelectorAll("mark").forEach(mark => mark.addEventListener("click", event => {
  let range = document.createRange();
  range.selectNodeContents(event.target);

  let selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}));
