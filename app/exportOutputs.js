export function buildDiscordOutput(patternCode, primary, secondary) {
    return `\`\`\`${patternCode}\`\`\`\nPrimary ${primary}\nSecondary ${secondary}`;
}
export function buildPreviewLink(currentHref, patternCode, primary, secondary) {
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
export function buildDevStorageOutput(patternCode, primary, secondary) {
    return [
        `localStorage.setItem("dev-pattern", ${JSON.stringify(patternCode)});`,
        `localStorage.setItem("dev-primary", ${JSON.stringify(primary)});`,
        `localStorage.setItem("dev-secondary", ${JSON.stringify(secondary)});`,
    ].join("\n");
}
