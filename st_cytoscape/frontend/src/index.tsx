import {
  Streamlit,
  RenderData
} from "streamlit-component-lib"
// @ts-ignore
import cytoscape from 'cytoscape';
// @ts-ignore
import fcose from 'cytoscape-fcose';
// @ts-ignore
import klay from 'cytoscape-klay';
// @ts-ignore
import svg from "cytoscape-svg";

cytoscape.use(svg);
cytoscape.use(fcose);
cytoscape.use(klay);

const div = document.body.appendChild(document.createElement("div"));
let args = '';
let cy: any = null;  // keep reference to Cytoscape instance

function updateComponent(cy: any) {
  Streamlit.setComponentValue({
    'nodes': cy.$('node:selected').map((x: any) => x['_private']['data']['id']),
    'edges': cy.$('edge:selected').map((x: any) => x['_private']['data']['id'])
  })
}

let buttonContainer: HTMLDivElement | null = null;  // global reference

function addDownloadButtons(cy: any) {
  // Button container (so we can group buttons neatly)
  if (!buttonContainer) {
    buttonContainer = document.createElement("div");
    buttonContainer.id = "download-container";
    Object.assign(buttonContainer.style, {
      position: "absolute",
      top: "10px",
      right: "10px",
      zIndex: "1000",
      display: "flex",
      gap: "8px",
    });

    if (div.parentElement) {
      div.parentElement.style.position = "relative";
      div.parentElement.appendChild(buttonContainer);
    }
  }

  // Clear buttonContainer div
  buttonContainer.innerHTML = "";

  // --- Main button ---
  const mainBtn = document.createElement("button");
  mainBtn.innerHTML = "⤓";
  mainBtn.title = "Exportar";
  // Style the button
  Object.assign(mainBtn.style, {
    position: "absolute",
    top: "0px",
    right: "40px",
    zIndex: "1000",
    width: "40px",        // square
    height: "40px",
    cursor: "pointer",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "white",
    color: "black",
    fontSize: "20px",     // emoji size
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
  });
  buttonContainer.appendChild(mainBtn);

  // --- Popover ---
  const popover = document.createElement("div");
  Object.assign(popover.style, {
    position: "absolute",
    top: "0px",                // align top with button
    right: "40px",             // distance from container's right edge (same as button)
    display: "none",           // hidden by default
    flexDirection: "row",   // horizontal menu
    backgroundColor: "white",
    padding: "4px 6px",
    borderRadius: "6px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
    whiteSpace: "nowrap",      // prevent line break
    transform: "translateX(-50%)",
  });
  buttonContainer.appendChild(popover);


  // Helper to create export options inside popover
  function createOption(label: string, onClick: () => void) {
    const opt = document.createElement("button");
    opt.innerHTML = label;
    Object.assign(opt.style, {
      margin: "2px 0",
      padding: "2px 6px",   // enough padding to avoid cramped text
      display: "flex",
      alignItems: "center",
      gap: "4px",           // space between emoji and text
      cursor: "pointer",
      borderRadius: "4px",
      border: "1px solid #ccc",
      backgroundColor: "white",
      fontSize: "14px",
      whiteSpace: "nowrap", // keep emoji + text on one line
    });
    opt.onclick = () => {
      onClick();
      popover.style.display = "none";
    };
    popover.appendChild(opt);
  }

  // --- Export actions ---
  createOption("🖼️ PNG", () => {
    const pngData = cy.png({ full: true, scale: 4, bg: "white" });
    const a = document.createElement("a");
    a.href = pngData;
    a.download = "graph.png";
    a.click();
  });

  createOption("📷 JPG", () => {
    const jpgData = cy.jpg({ full: true, scale: 4, quality: 1, bg: "white" });
    const a = document.createElement("a");
    a.href = jpgData;
    a.download = "graph.jpg";
    a.click();
  });

  createOption("🖊️ SVG", () => {
    if (typeof cy.svg === "function") {
      const svgData = cy.svg({ full: true, scale: 1, bg: "white" });
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "graph.svg";
      a.click();

  // // helper to create a button
  // function createButton(label: string, title: string, onclick: () => void) {
  //   const btn = document.createElement("button");
  //   btn.innerHTML = label;
  //   btn.title = title;
  //   Object.assign(btn.style, {
  //     width: "40px",
  //     height: "40px",
  //     cursor: "pointer",
  //     borderRadius: "6px",
  //     border: "none",
  //     backgroundColor: "white",
  //     color: "black",
  //     fontSize: "20px",
  //     display: "flex",
  //     justifyContent: "center",
  //     alignItems: "center",
  //     boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  //   });
  //   btn.onclick = onclick;
  //   buttonContainer!.appendChild(btn);
  //   }

  // // PNG export
  // createButton("🖼️", "Exportar como PNG", () => {
  //   requestAnimationFrame(() => {
  //     const pngData = cy.png({
  //       full: true,
  //       scale: 4,
  //       bg: "white",
  //     });
  //     const a = document.createElement("a");
  //     a.href = pngData;
  //     a.download = "graph.png";
  //     a.click();
  //   });
  // });

  // // JPG export
  // createButton("📷", "Exportar como JPG", () => {
  //   requestAnimationFrame(() => {
  //     const jpgData = cy.jpg({
  //       full: true,
  //       scale: 4,
  //       quality: 1,
  //       bg: "white",
  //     });
  //     const a = document.createElement("a");
  //     a.href = jpgData;
  //     a.download = "graph.jpg";
  //     a.click();
  //   });
  // });

  // // SVG export
  // createButton("🖊️", "Exportar como SVG", () => {
  //   const svgData = cy.svg({ full: true, scale: 1, bg: "white" });
  //   const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  //   const url = URL.createObjectURL(blob);

  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = "graph.svg";
  //   a.click();

      URL.revokeObjectURL(url);
    }
  });

  // --- Toggle popover visibility ---
  mainBtn.onclick = () => {
    popover.style.display = popover.style.display === "none" ? "flex" : "none";
  };
}


/**
 * The component's render function.
 */
function onRender(event: Event): void {
  const data = (event as CustomEvent<RenderData>).detail;
  let newArgs = JSON.stringify(data.args);
  if (!data.args["key"] || args !== newArgs) {
    args = newArgs;

    // Update container size
    div.style.width = data.args["width"];
    div.style.height = data.args["height"];

    // Theme-aware styling
    let nodeColor: any[] = [];
    if (data.theme) {
      if (data.theme?.backgroundColor) {
        div.style.background = data.theme.backgroundColor;
      }
      nodeColor = [{
        selector: "node:selected",
        style: { backgroundColor: data.theme?.primaryColor }
      }, {
        selector: "node",
        style: {
          color: data.theme?.textColor,
          fontFamily: data.theme?.font
        }
      }, {
        selector: "edge:selected",
        style: {
          targetArrowColor: data.theme?.primaryColor,
          lineColor: data.theme?.primaryColor
        }
      }]
    }

    // Create Cytoscape graph
    cy = cytoscape({
      container: div,
      elements: data.args["elements"],
      style: data.args["stylesheet"].concat(nodeColor),
      layout: data.args["layout"],
      selectionType: data.args["selectionType"],
      userZoomingEnabled: data.args["userZoomingEnabled"],
      userPanningEnabled: data.args["userPanningEnabled"],
      minZoom: data.args["minZoom"],
      maxZoom: data.args["maxZoom"],
      wheelSensitivity: data.args["wheelSensitivity"],
    }).on('select unselect', function () {
      updateComponent(cy);
    });

    updateComponent(cy);
    addDownloadButtons(cy);   // add PNG download button
  }

  Streamlit.setFrameHeight();
}

// Log current cy object
console.log(cy);

// Attach `onRender` handler
Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, onRender)
Streamlit.setComponentReady()
Streamlit.setFrameHeight()
