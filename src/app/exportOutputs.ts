export function buildDevTestOutput(
  patternCode: string,
  primary: string,
  secondary: string
) {
  return `localStorage.setItem("dev-pattern", "${patternCode}");\nlocalStorage.setItem("dev-primary", "${primary}");\nlocalStorage.setItem("dev-secondary", "${secondary}");`;
}

export function buildPreviewLink(
  currentHref: string,
  patternCode: string,
  primary: string,
  secondary: string
) {
  const params = new URLSearchParams({
    primary: primary.replace("#", ""),
    secondary: secondary.replace("#", ""),
    preview: "1",
  });
  const hash = patternCode ? `#${patternCode}?${params.toString()}` : "";
  const url = new URL(currentHref);
  url.hash = hash;
  return url.toString();
}

export function buildDevStorageOutput(
  patternCode: string,
  primary: string,
  secondary: string
) {
  return [
    `localStorage.setItem("dev-pattern", ${JSON.stringify(patternCode)});`,
    `localStorage.setItem("dev-primary", ${JSON.stringify(primary)});`,
    `localStorage.setItem("dev-secondary", ${JSON.stringify(secondary)});`,
  ].join("\n");
}
