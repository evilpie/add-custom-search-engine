"use strict";
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

const XML_TEMPLATE = `<?xml version="1.0" encoding="utf-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
<ShortName></ShortName>
<Description></Description>
<InputEncoding>UTF-8</InputEncoding>
<Image height="16" width="16"></Image>
<Url type="text/html" method="get" template=""></Url>
<Url type="application/x-suggestions+json" method="get" template=""></Url>
</OpenSearchDescription>`;

function createXMLString() {
  const parser = new DOMParser();
  const doc = parser.parseFromString(XML_TEMPLATE, "application/xml");

  const form = document.querySelector("form");
  const data = new FormData(form);

  // Name
  const name = doc.getElementsByTagName("ShortName")[0];
  name.textContent = data.get("name");

  // Search URL
  const url = doc.querySelector("Url[type=\"text/html\"]");
  url.setAttribute("template", data.get("url").replace("%s", "{searchTerms}"));
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
  return serialzer.serializeToString(doc);
}

document.querySelector("form").addEventListener("submit", async event => {
  event.preventDefault();

  const string = createXMLString();

  // Upload the OpenSearch XML description to file.io, because AddSearchProvider
  // requires http(s) URLs. After the xml is downloaded to start the installation
  // process, the file should be automatically removed.

  // NB: The documentation on file.io is wrong: 1d is 1 day, but just 1 is 1 week!
  try {
    let response = await fetch("https://file.io/?expires=1d", {
      method: "POST",
      body: new URLSearchParams({text: string})
    });
    let json = await response.json();

    let {version} = await browser.runtime.getBrowserInfo();
    if (+/(\d+)\./.exec(version)[1] >= 65) {
      // Mozilla intentionally disabled AddSearchProvider :(
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1503551

      let link = document.createElement("link");
      link.rel = "search";
      link.type = "application/opensearchdescription+xml";
      link.title = document.querySelector("#input-name").value;
      link.href = json.link;

      // This doesn't actually seem to work. Firefox seems to cache.
      let existing = document.querySelector("link[rel=search]");
      if (existing) {
        existing.remove();
      }

      document.head.append(link);

      document.querySelector("#main").style.display = "none";
      document.querySelector("#instructions").style.display = "block";
    } else {
      // Where the magic happens!
      window.external.AddSearchProvider(json.link);
    }
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
