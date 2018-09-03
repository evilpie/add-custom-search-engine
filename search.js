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
  let name = doc.getElementsByTagName("ShortName")[0];
  name.textContent = data.get("name");

  // Search URL
  let url = doc.querySelector(`Url[type="text/html"]`);
  url.setAttribute("method", "GET");
  url.setAttribute("template", data.get("url").replace("%s", "{searchTerms}"));

  // Icon
  let image = doc.getElementsByTagName("Image")[0];
  if (data.get("icon")) {
    image.textContent = data.get("icon");
  } else {
    image.remove();
  }

  // == Advanced ==

  // Suggest URL
  let suggestUrl = doc.querySelector(`Url[type="application/x-suggestions+json"]`);
  if (data.get("suggest-url")) {
    suggestUrl.setAttribute("method", "GET");
    suggestUrl.setAttribute("template", data.get("suggest-url"));
  } else {
    suggestUrl.remove();
  }

  // Input Encoding
  let encoding = doc.getElementsByTagName("InputEncoding")[0];
  if (data.get("encoding")) {
    encoding.textContent = data.get("encoding");
  }

  // Description
  let description = doc.getElementsByTagName("Description")[0];
  if (data.get("description")) {
    description.textContent = data.get("description");
  } else {
    description.remove();
  }

  let serialzer = new XMLSerializer();
  return serialzer.serializeToString(doc);
}

document.querySelector("form").addEventListener("submit", event => {
  const string = createXMLString();

  fetch("https://file.io/?expires=1d", {
    method: "POST",
    body: new URLSearchParams({text: string})
  }).then(response => {
    return response.json();
  }).then(json => {
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

function loadIcon() {
  const url = document.querySelector("#input-icon").value;
  if (url) {
    document.querySelector("#icon-preview").src = url;
  }
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
