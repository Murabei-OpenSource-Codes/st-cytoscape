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

// Cache of the last positions sent by the backend. 
let lastBackendPositions: { [id: string]: { x: number, y: number } } = {};
let lastLayoutJSON: string = "";
let fitTimeoutId: any = null;

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
    fontSize: "20px",
    minHeight: "0",
    height: "40px",
    width: "40px",
    border: "1px solid #ffffff",
    borderRadius: "0.5rem",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.3s ease",
    position: "absolute",
    top: "-13px",
    right: "80px",
    zIndex: "1000",
    outline: "none",
    boxShadow: "none",
  });
  buttonContainer.appendChild(mainBtn);

  // Hover effect
  mainBtn.addEventListener("mouseover", () => {
    if (!isActive) mainBtn.style.backgroundColor = "#f0f0f0";
  });
  mainBtn.addEventListener("mouseout", () => {
    if (!isActive) mainBtn.style.backgroundColor = "#ffffff";
  });

  // Popover
  const popover = document.createElement("div");
  Object.assign(popover.style, {
    position: "absolute",
    top: "45px",
    right: "0px",
    display: "none",
    flexDirection: "column",
    backgroundColor: "white",
    padding: "6px 8px",
    borderRadius: "6px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
    whiteSpace: "nowrap",
    zIndex: "2000",
  });
  mainBtn.appendChild(popover);

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
      bg: "white"
    });
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

    // Extraction of Backend Positions
    const newBackendPositions: { [id: string]: { x: number, y: number } } = {};
    const elms = data.args["elements"];
    const nodesOnly = Array.isArray(elms)
      ? elms.filter((e: any) => e.group === "nodes" || !e.group)
      : (elms.nodes || []);
    nodesOnly.forEach((el: any) => {
      if (el.position) {
        const id = el.data?.id || el.data?.source;
        if (id) newBackendPositions[id] = { ...el.position };
      }
    });

    if (cy === null) {
      // ═══════════════════════════════════════════
      // First mount — create Cytoscape instance
      // ═══════════════════════════════════════════
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
      }).on('select unselect', () => updateComponent(cy));

      addDownloadButtons(cy);
      lastLayoutJSON = JSON.stringify(data.args["layout"]);
      lastBackendPositions = { ...newBackendPositions };

    } else {
      // ═══════════════════════════════════════════
      // In-place update — preserve zoom and pan
      // ═══════════════════════════════════════════

      // Save current positions before update
      const oldPositions: { [id: string]: { x: number, y: number } } = {};
      cy.nodes().forEach((node: any) => {
        oldPositions[node.id()] = { ...node.position() };
      });

      // Check if layout changed
      const currentLayoutJSON = JSON.stringify(data.args["layout"]);
      const isLayoutSwitch = currentLayoutJSON !== lastLayoutJSON;
      lastLayoutJSON = currentLayoutJSON;

      // Check if backend coordinates changed
      let backendChangedCoords = false;
      Object.keys(newBackendPositions).forEach(id => {
        const last = lastBackendPositions[id];
        const current = newBackendPositions[id];
        if (last && current && (Math.abs(last.x - current.x) > 1 ||
          Math.abs(last.y - current.y) > 1)) {
          backendChangedCoords = true;
        }
      });
      lastBackendPositions = { ...newBackendPositions };

      // Remove listeners to avoid unselect loop
      cy.removeAllListeners();

      // Update elements and stylesheet in-place
      cy.json({ elements: data.args["elements"] });
      cy.style().fromJson(data.args["stylesheet"]).update();

      // Animate nodes from old to new positions
      let hasNewNodes = false;
      cy.nodes().forEach((node: any) => {
        const oldVis = oldPositions[node.id()];
        const backend = newBackendPositions[node.id()];

        if (oldVis) {
          if (isLayoutSwitch) {
            // Layout changed -> Smooth animation (300ms)
            node.position(oldVis);
            node.animate({ position: backend }, { duration: 300 });
          } else if (backendChangedCoords) {
            // Dispersion slider changed -> Move immediately
            node.position(backend);
          } else {
            // Keep positions
            node.position(oldVis);
          }
        } else {
          // New node -> Animate from a neighbor
          hasNewNodes = true;
          const neighbors = node.connectedNodes();
          let startP = { x: cy.width() / 2, y: cy.height() / 2 };
          for (let i = 0; i < neighbors.length; i++) {
            const nOld = oldPositions[neighbors[i].id()];
            if (nOld) { startP = { ...nOld }; break; }
          }
          node.position(startP);
          node.animate({ position: backend }, { duration: 400 });
        }
      });

      // Fit if the algorithm changed or there are new nodes.
      if (isLayoutSwitch || (hasNewNodes && cy.nodes().length > 0)) {
        if (fitTimeoutId) clearTimeout(fitTimeoutId);
        fitTimeoutId = setTimeout(() => {
          cy.animate({ fit: { eles: cy.elements(), padding: 30 } }, {
            duration: 300
          });
        }, 350);
      }

      // Re-register event listeners
      cy.on('select unselect', () => updateComponent(cy));
    }
    updateComponent(cy);
  }
  Streamlit.setFrameHeight();
}

// Log current cy object
console.log(cy);

// Attach `onRender` handler
Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, onRender)
Streamlit.setComponentReady()
Streamlit.setFrameHeight()
