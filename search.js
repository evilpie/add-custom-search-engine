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
  url.setAttribute("method", "GET");
  url.setAttribute("template", data.get("url").replace("%s", "{searchTerms}"));

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

document.querySelector("form").addEventListener("submit", event => {
  const string = createXMLString();

  // Upload the OpenSearch XML description to file.io, because AddSearchProvider
  // requires http(s) URLs. After the xml is downloaded to start the installation
  // process, the file should be automatically removed.

  // NB: The documentation on file.io is wrong: 1d is 1 day, but just 1 is 1 week!
  fetch("https://file.io/?expires=1d", {
    method: "POST",
    body: new URLSearchParams({text: string})
  }).then(response => {
    return response.json();
  }).then(json => {
    // Where the magic happens!
    window.external.AddSearchProvider(json.link);
  });

  event.preventDefault();
});

document.querySelector("#show-preview").addEventListener("click", event => {
  const string = createXMLString();

  const code = document.querySelector("#preview");
  code.textContent = string;

  event.preventDefault();
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
  }
}
document.querySelector("#show-advanced").addEventListener("change", showAdvanced);

document.addEventListener("DOMContentLoaded", () => {
  showAdvanced();
  loadIcon();
});
