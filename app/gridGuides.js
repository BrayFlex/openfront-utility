export function setupGridGuides(container, onChange) {
    const guideGroup = document.createElement("div");
    guideGroup.className = "guide-btn-group";
    const blackGuideBtn = document.createElement("button");
    blackGuideBtn.id = "gridGuideBlackBtn";
    blackGuideBtn.textContent = "Grid";
    blackGuideBtn.title = "Show or hide the grid guide lines";
    const centerGuideBtn = document.createElement("button");
    centerGuideBtn.id = "gridGuideCenterBtn";
    centerGuideBtn.textContent = "Center";
    centerGuideBtn.title = "Show or hide the center guide";
    const rulerGuideBtn = document.createElement("button");
    rulerGuideBtn.id = "gridGuideRulerBtn";
    rulerGuideBtn.textContent = "Ruler";
    rulerGuideBtn.title = "Show or hide the outside ruler";
    if (container) {
        // Add separator before guides
        const sep = document.createElement("div");
        sep.className = "canvas-controls-divider";
        guideGroup.appendChild(blackGuideBtn);
        guideGroup.appendChild(centerGuideBtn);
        guideGroup.appendChild(rulerGuideBtn);
        // Place the guide toggles just left of the Main/Test canvas tabs, with a
        // separator between them and the tabs.
        const tabs = container.querySelector(".canvas-tabs");
        if (tabs) {
            container.insertBefore(guideGroup, tabs);
            container.insertBefore(sep, tabs);
        }
        else {
            container.appendChild(sep);
            container.appendChild(guideGroup);
        }
    }
    let gridGuideBlack = false;
    let gridGuideCenter = false;
    let gridGuideRuler = false;
    function updateGuideBtnStyle() {
        blackGuideBtn.className = "guide-btn " + (gridGuideBlack ? "guide-btn-on" : "guide-btn-off");
        centerGuideBtn.className = "guide-btn " + (gridGuideCenter ? "guide-btn-on" : "guide-btn-off");
        rulerGuideBtn.className = "guide-btn " + (gridGuideRuler ? "guide-btn-on" : "guide-btn-off");
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
    rulerGuideBtn.onclick = () => {
        gridGuideRuler = !gridGuideRuler;
        updateGuideBtnStyle();
        onChange();
    };
    updateGuideBtnStyle();
    return {
        isBlackEnabled: () => gridGuideBlack,
        isCenterEnabled: () => gridGuideCenter,
        isRulerEnabled: () => gridGuideRuler,
    };
}
