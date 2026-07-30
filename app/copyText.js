export function copyText(value) {
    var _a;
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
    if ((_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText) {
        navigator.clipboard.writeText(value).catch(fallbackCopy);
        return;
    }
    fallbackCopy();
}
