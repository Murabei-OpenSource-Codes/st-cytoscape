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

// Cache of the last layout configuration received from the backend.
let lastLayoutJSON: string = "";
let lastLayoutName: string = "";

let fitTimeoutId: number | null = null;

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
      lastLayoutName = data.args["layout"].name || "";

    } else {
      // ═══════════════════════════════════════════
      // In-place update — preserve zoom and pan
      // ═══════════════════════════════════════════

      // Save current positions before update
      const oldPositions: { [id: string]: { x: number, y: number } } = {};
      cy.nodes().forEach((node: any) => {
        oldPositions[node.id()] = { ...node.position() };
      });

      // Save the IDs that already exist in the graph.
      const oldElementIds = new Set<string>();

      cy.elements().forEach((element: any) => {
        oldElementIds.add(element.id());
      });

      // Check if layout changed
      const currentLayoutJSON = JSON.stringify(data.args["layout"]);
      const currentLayoutName = data.args["layout"].name || "";

      const layoutChanged = currentLayoutJSON !== lastLayoutJSON;
      const layoutNameChanged = currentLayoutName !== lastLayoutName;

      // Remove listeners to avoid unselect loop
      cy.removeAllListeners();

      // Update elements and stylesheet in-place
      cy.json({ elements: data.args["elements"] });
      cy.style().fromJson(data.args["stylesheet"]).update();

      // Restore the positions of nodes that already existed.
      cy.nodes().forEach((node: any) => {
        const oldPosition = oldPositions[node.id()];

        if (oldPosition) {
          node.position(oldPosition);
        }
      });

      // Identify the newly added nodes and edges.
      const newNodes = cy.nodes().filter((node: any) => !oldElementIds.has(node.id()));
      const newEdges = cy.edges().filter((edge: any) => !oldElementIds.has(edge.id()));

      // Layout changed.
      if (layoutChanged) {
        const shouldFit = layoutNameChanged && Boolean(data.args["layout"].fit);
        const savedPan = { ...cy.pan() };
        const savedZoom = cy.zoom();
        const padding = data.args["layout"].padding || 30;

        const layoutOpts: any = {
          ...data.args["layout"],
          animate: false,
          fit: false,
        };

        const layoutInstance = cy.layout(layoutOpts);

        layoutInstance.one("layoutstop", () => {
          const targetPositions: { [id: string]: { x: number, y: number } } = {};

          cy.nodes().forEach((node: any) => {
            targetPositions[node.id()] = { ...node.position() };
          });

          cy.nodes().forEach((node: any) => {
            const oldVis = oldPositions[node.id()];
            const target = targetPositions[node.id()];

            if (!target || !oldVis) {
              return;
            }

            node.position(oldVis);
            node.animate({ position: target }, { duration: 300 });
          });

          newNodes.forEach((node: any) => {
            const target = targetPositions[node.id()];
            if (!target) {
              return;
            }

            const neighbors = node.connectedNodes();
            let startP = { x: 0, y: 0 };
            for (let i = 0; i < neighbors.length; i++) {
              const nOld = oldPositions[neighbors[i].id()];
              if (nOld) {
                startP = { ...nOld };
                break;
              }
            }

            node.position(startP);
            node.animate({ position: target }, { duration: 400 });
          });

          if (shouldFit && cy.nodes().length > 0) {
            if (fitTimeoutId !== null) {
              window.clearTimeout(fitTimeoutId);
            }

            fitTimeoutId = window.setTimeout(() => {
              cy.animate({ fit: { eles: cy.elements(), padding: padding } }, { duration: 300 });
              fitTimeoutId = null;
            }, 450);
          } else {
            cy.viewport({ zoom: savedZoom, pan: savedPan });
          }
        });

        layoutInstance.run();

      } else if (newNodes.length > 0 || newEdges.length > 0) {
        const NODE_OFFSET = 80;

        newNodes.forEach((node: any, index: number) => {
          const neighbors = node.connectedNodes();
          let startPosition: { x: number, y: number } | undefined;

          for (let i = 0; i < neighbors.length; i++) {
            const neighborPos = oldPositions[neighbors[i].id()];
            if (neighborPos) {
              startPosition = { ...neighborPos };
              break;
            }
          }

          if (!startPosition) {
            const existing = cy.nodes().filter((n: any) => oldElementIds.has(n.id()));
            if (existing.length > 0) {
              startPosition = { ...existing[0].position() };
            }
          }

          const anchor = startPosition || { x: 0, y: 0 };
          const angle = 2 * Math.PI * index / Math.max(newNodes.length, 1);
          const target = {
            x: anchor.x + Math.cos(angle) * NODE_OFFSET,
            y: anchor.y + Math.sin(angle) * NODE_OFFSET,
          };

          node.position({ ...anchor });
          node.style("opacity", 0);

          requestAnimationFrame(() => {
            node.animate(
              { position: target, style: { opacity: 1 } },
              { duration: 400,
                easing: "ease-in-out-cubic",
                complete: () => node.removeStyle("opacity"),
              },
            );
          });
        });

        newEdges.forEach((edge: any) => {
          edge.style("opacity", 0);

          requestAnimationFrame(() => {
            edge.animate(
              { style: { opacity: 1 } },
              { duration: 300, complete: () => edge.removeStyle("opacity") },
            );
          });
        });
      }

      lastLayoutJSON = currentLayoutJSON;
      lastLayoutName = currentLayoutName;

      // Re-register event listeners.
      cy.on("select unselect", () => updateComponent(cy));
    }
    updateComponent(cy);
  }
  Streamlit.setFrameHeight();
}

Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, onRender)
Streamlit.setComponentReady()
Streamlit.setFrameHeight()
