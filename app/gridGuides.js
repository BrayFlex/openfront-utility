export function setupGridGuides(toolbox, onChange) {
    const container = document.createElement("div");
    container.style.cssText = "display:flex;align-items:center;gap:6px;margin-left:4px;";
    const blackGuideBtn = document.createElement("button");
    blackGuideBtn.textContent = "Grid Guide";
    blackGuideBtn.id = "gridGuideBlackBtn";
    const centerGuideBtn = document.createElement("button");
    centerGuideBtn.textContent = "Center Guide";
    centerGuideBtn.id = "gridGuideCenterBtn";
    if (toolbox) {
        // Add separator before guides
        const sep = document.createElement("div");
        sep.className = "tool-strip-separator";
        toolbox.appendChild(sep);
        container.appendChild(blackGuideBtn);
        container.appendChild(centerGuideBtn);
        toolbox.appendChild(container);
    }
    let gridGuideBlack = false;
    let gridGuideCenter = false;
    function updateGuideBtnStyle() {
        blackGuideBtn.className = "guide-btn " + (gridGuideBlack ? "guide-btn-on" : "guide-btn-off");
        centerGuideBtn.className = "guide-btn " + (gridGuideCenter ? "guide-btn-on" : "guide-btn-off");
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
