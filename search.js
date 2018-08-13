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
</OpenSearchDescription>`;

document.querySelector("form").addEventListener("submit", event => {
  var parser = new DOMParser();
  var doc = parser.parseFromString(XML_TEMPLATE, "application/xml");

  var data = new FormData(event.target);

  let name = doc.getElementsByTagName("ShortName")[0];
  name.textContent = data.get("name");

  if (data.get("description")) {
    let description = doc.getElementsByTagName("Description")[0];
    description.textContent = data.get("description");
  }

  let urlTemplate = data.get("url").replace("%s", "{searchTerms}");

  let url = doc.getElementsByTagName("Url")[0];
  url.setAttribute("method", "GET");
  url.setAttribute("template", urlTemplate);

  let image = doc.getElementsByTagName("Image")[0];
  if (data.get("icon")) {
    image.textContent = data.get("icon");
  } else {
    image.remove();
  }

  let serialzer = new XMLSerializer();
  let string = serialzer.serializeToString(doc);

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

document.querySelector("#input-icon").addEventListener("change", event => {
  let url = event.target.value;
  if (url) {
    document.querySelector("#icon-preview").src = url;
  }
})
