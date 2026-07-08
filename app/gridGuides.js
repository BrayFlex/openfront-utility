function injectGridGuideStyle() {
    if (document.getElementById("grid-guide-style"))
        return;
    const style = document.createElement("style");
    style.id = "grid-guide-style";
    style.textContent = `
      .cell.guide-v { border-left: 2px solid #222 !important; }
      .cell.guide-h { border-top: 2px solid #222 !important; }
      .guide-btn-on { background: #222; color: #fff; font-weight: bold; }
      .guide-btn-off { background: #eee; color: #222; }
      
      .center-guide-overlay {
        position: absolute;
        pointer-events: none;
        z-index: 10;
        display: none;
      }
      .center-guide-overlay.visible {
        display: block;
      }
      .center-guide-overlay::before,
      .center-guide-overlay::after {
        content: "";
        position: absolute;
        background: blue;
      }
      .center-guide-overlay::before {
        top: -10px; bottom: -10px; left: -1px; width: 2px;
      }
      .center-guide-overlay::after {
        left: -10px; right: -10px; top: -1px; height: 2px;
      }
    `;
    document.head.appendChild(style);
}
export function setupGridGuides(toolbox, onChange) {
    injectGridGuideStyle();
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "4px";
    container.style.marginLeft = "8px";
    const blackGuideBtn = document.createElement("button");
    blackGuideBtn.textContent = "Grid Guide";
    blackGuideBtn.id = "gridGuideBlackBtn";
    blackGuideBtn.className = "ctrl-btn";
    blackGuideBtn.style.fontSize = "10px";
    blackGuideBtn.style.padding = "2px 6px";
    const centerGuideBtn = document.createElement("button");
    centerGuideBtn.textContent = "Center Guide";
    centerGuideBtn.id = "gridGuideCenterBtn";
    centerGuideBtn.className = "ctrl-btn";
    centerGuideBtn.style.fontSize = "10px";
    centerGuideBtn.style.padding = "2px 6px";
    if (toolbox) {
        container.appendChild(blackGuideBtn);
        container.appendChild(centerGuideBtn);
        toolbox.appendChild(container);
    }
    let gridGuideBlack = false;
    let gridGuideCenter = false;
    function updateGuideBtnStyle() {
        blackGuideBtn.className = "ctrl-btn " + (gridGuideBlack ? "guide-btn-on" : "guide-btn-off");
        centerGuideBtn.className = "ctrl-btn " + (gridGuideCenter ? "guide-btn-on" : "guide-btn-off");
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
