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
let cy: any = null;

function updateComponent(cy: any) {
  Streamlit.setComponentValue({
    'nodes': cy.$('node:selected').map((x: any) => x['_private']['data']['id']),
    'edges': cy.$('edge:selected').map((x: any) => x['_private']['data']['id'])
  })
}

let buttonContainer: HTMLDivElement | null = null;

function addDownloadButtons(cy: any) {
  // Button container
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

  // Reset buttonContainer div
  buttonContainer.innerHTML = "";
  let isActive = false; // Flag button activation

  // Main export button
  const mainBtn = document.createElement("button");
  mainBtn.innerHTML = "⤓";
  mainBtn.title = "Exportar";
  // Style the button
  Object.assign(mainBtn.style, {
    backgroundColor: "#ffffff",
    fontWeight: "bold",
    fontSize: "20px",
    minHeight: "0",
    height: "36px",
    width: "36px",
    border: "1px solid #ffffff",
    borderRadius: "0.5rem",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.3s ease",
    position: "absolute",
    top: "0px",
    right: "60px",
    zIndex: "1000",
    outline: "none",
    boxShadow: "none",
  });
  buttonContainer.appendChild(mainBtn);

  // Hover effect
  mainBtn.addEventListener("mouseover", () => {
    if (!isActive) mainBtn.style.backgroundColor = "#f0f0f0";});
  mainBtn.addEventListener("mouseout", () => {
    if (!isActive) mainBtn.style.backgroundColor = "#ffffff";});

  // Popover
  const popover = document.createElement("div");
  Object.assign(popover.style, {
    position: "relative",
    top: "50%",
    right: "50%",
    display: "none",
    flexDirection: "column",
    backgroundColor: "white",
    padding: "6px 8px",
    borderRadius: "6px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
    whiteSpace: "nowrap",
    transform: "translateY(100%)",
    zIndex: "2000",
  });
  buttonContainer.appendChild(popover);

  // Helper to create export options inside popover
  function createOption(label: string, onClick: () => void) {
    const opt = document.createElement("button");
    opt.innerHTML = label;
    Object.assign(opt.style, {
      margin: "2px 0",
      padding: "2px 6px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      cursor: "pointer",
      borderRadius: "4px",
      border: "1px solid #ccc",
      backgroundColor: "white",
      fontSize: "14px",
      whiteSpace: "nowrap",
    });
    opt.onclick = () => {
      onClick();
      popover.style.display = "none";
    };
    popover.appendChild(opt);
  }

  // Export actions
  createOption("📷 PNG", () => {
    const pngData = cy.png({
      full: true,
      scale: 5,
      bg: "white"});
    const a = document.createElement("a");
    a.href = pngData;
    a.download = "graph.png";
    a.click();
  });

  // Toggle popover visibility
  mainBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    isActive = !isActive;
    mainBtn.style.backgroundColor = isActive ? "#e7f1fb" : "#ffffff";
    popover.style.display = isActive ? "flex" : "none";
  });

  // Close popover when clicking outside
  document.addEventListener("click", (event) => {
    if (isActive
      && !popover.contains(event.target as Node)
      && event.target !== mainBtn) {
      isActive = false;
      mainBtn.style.backgroundColor = "#ffffff";
      popover.style.display = "none";
    }
  });
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

    // Block comment to allow custom styling through Streamlit
    // // Theme-aware styling
    // let nodeColor: any[] = [];
    // if (data.theme) {
    //   if (data.theme?.backgroundColor) {
    //     div.style.background = data.theme.backgroundColor;
    //   }
    //   nodeColor = [{
    //     selector: "node:selected",
    //     style: { backgroundColor: data.theme?.primaryColor }
    //   }, {
    //     selector: "node",
    //     style: {
    //       color: data.theme?.textColor,
    //       fontFamily: data.theme?.font
    //     }
    //   }, {
    //     selector: "edge:selected",
    //     style: {
    //       targetArrowColor: data.theme?.primaryColor,
    //       lineColor: data.theme?.primaryColor
    //     }
    //   }]
    // }

    // Create Cytoscape graph
    cy = cytoscape({
      container: div,
      elements: data.args["elements"],
      style: data.args["stylesheet"],
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
    addDownloadButtons(cy);
  }

  Streamlit.setFrameHeight();
}

// Log current cy object
console.log(cy);

// Attach `onRender` handler
Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, onRender)
Streamlit.setComponentReady()
Streamlit.setFrameHeight()
