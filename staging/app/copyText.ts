export function copyText(value: string) {
  const fallbackCopy = () => {
    const temp = document.createElement("textarea");
    temp.value = value;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    document.execCommand("copy");
    temp.remove();
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).catch(fallbackCopy);
    return;
  }
  fallbackCopy();
}
