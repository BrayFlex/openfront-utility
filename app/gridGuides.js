function injectGridGuideStyle() {
    if (document.getElementById("grid-guide-style"))
        return;
    const style = document.createElement("style");
    style.id = "grid-guide-style";
    style.textContent = `
      .cell.guide-v { border-left: 2px solid #222 !important; }
      .cell.guide-h { border-top: 2px solid #222 !important; }
      .cell.center-v { border-left: 2px solid red !important; }
      .cell.center-h { border-top: 2px solid blue !important; }
      .guide-btn-on { background: #222; color: #fff; font-weight: bold; }
      .guide-btn-off { background: #eee; color: #222; }
    `;
    document.head.appendChild(style);
}
export function setupGridGuides(toolbox, onChange) {
    injectGridGuideStyle();
    const blackGuideBtn = document.createElement("button");
    blackGuideBtn.textContent = "Grid Guide (Black)";
    blackGuideBtn.id = "gridGuideBlackBtn";
    blackGuideBtn.style.marginLeft = "8px";
    const centerGuideBtn = document.createElement("button");
    centerGuideBtn.textContent = "Center Guide (Red/Blue)";
    centerGuideBtn.id = "gridGuideCenterBtn";
    centerGuideBtn.style.marginLeft = "8px";
    if (toolbox) {
        toolbox.appendChild(blackGuideBtn);
        toolbox.appendChild(centerGuideBtn);
    }
    let gridGuideBlack = false;
    let gridGuideCenter = false;
    function updateGuideBtnStyle() {
        blackGuideBtn.className = gridGuideBlack ? "guide-btn-on" : "guide-btn-off";
        centerGuideBtn.className = gridGuideCenter
            ? "guide-btn-on"
            : "guide-btn-off";
    }
    blackGuideBtn.onclick = () => {
        gridGuideBlack = !gridGuideBlack;
        updateGuideBtnStyle();
        onChange();
    };
    centerGuideBtn.onclick = () => {
        gridGuideCenter = !gridGuideCenter;
        updateGuideBtnStyle();
        onChange();
    };
    updateGuideBtnStyle();
    return {
        isBlackEnabled: () => gridGuideBlack,
        isCenterEnabled: () => gridGuideCenter,
    };
}
