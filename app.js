(function () {
  "use strict";

  const palette = [
    "#c6f36a", "#f6a66f", "#85c9b8", "#f1d36b", "#9d9bea",
    "#ee8d9d", "#8eb9e8", "#d4a0d8", "#d4c19b", "#79c6d1",
    "#b4d785", "#f4bc8b"
  ];
  const margins = { top: 10, right: 8, bottom: 30, left: 34 };
  const svg = d3.select("#treemap");
  const tooltip = d3.select("#tooltip");
  const shell = document.getElementById("chart-shell");
  const errorBox = document.getElementById("chart-error");
  let chartData;
  let resizeFrame = 0;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    svg.attr("hidden", true);
  }

  function renderLegend(categories, color) {
    const groups = d3.select("#legend")
      .selectAll(".legend-item-group")
      .data(categories, (category) => category)
      .join("div")
      .attr("class", "legend-item-group");

    const swatches = groups.selectAll("svg.legend-swatch")
      .data((category) => [category])
      .join("svg")
      .attr("class", "legend-swatch")
      .attr("viewBox", "0 0 12 12")
      .attr("aria-hidden", "true");

    swatches.selectAll("rect.legend-item")
      .data((category) => [category])
      .join("rect")
      .attr("class", "legend-item")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", (category) => color(category));

    groups.selectAll(".legend-label")
      .data((category) => [category])
      .join("span")
      .attr("class", "legend-label")
      .text((category) => category);
  }

  function showTooltip(event, node) {
    const { name, category, value } = node.data;
    tooltip
      .attr("data-value", value)
      .attr("aria-hidden", "false")
      .html(
        `<div class="tooltip-name">${escapeHtml(name)}</div>` +
        `<div class="tooltip-category">${escapeHtml(category)}</div>` +
        `<div class="tooltip-value">${d3.format(",.1f")(value)}M UNITS</div>`
      )
      .classed("visible", true);

    const bounds = shell.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const tipNode = tooltip.node();
    const left = Math.min(Math.max(8, x + 12), bounds.width - tipNode.offsetWidth - 8);
    const top = Math.min(Math.max(8, y + 12), bounds.height - tipNode.offsetHeight - 8);
    tooltip.style("left", `${left}px`).style("top", `${top}px`);
  }

  function hideTooltip() {
    tooltip.classed("visible", false).attr("aria-hidden", "true");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function render() {
    if (!chartData) return;

    const outerWidth = Math.max(300, shell.clientWidth - 38);
    const outerHeight = Math.max(260, Math.min(outerWidth * 0.53, 660));
    const width = outerWidth - margins.left - margins.right;
    const height = outerHeight - margins.top - margins.bottom;
    const categories = [...new Set(chartData.children.map((game) => game.category))]
      .sort((a, b) => a.localeCompare(b));
    const color = d3.scaleOrdinal().domain(categories).range(palette);
    const root = d3.hierarchy(chartData)
      .sum((game) => game.value || 0)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .tile(d3.treemapSquarify)
      .size([width, height])
      .paddingInner(2)
      .round(true)(root);

    svg.attr("viewBox", `0 0 ${outerWidth} ${outerHeight}`)
      .attr("height", outerHeight)
      .attr("hidden", null);

    const plot = svg.selectAll(".plot")
      .data([null])
      .join("g")
      .attr("class", "plot")
      .attr("transform", `translate(${margins.left},${margins.top})`);

    const tiles = plot.selectAll(".tile-group")
      .data(root.leaves(), (node) => node.data.name)
      .join("g")
      .attr("class", "tile-group")
      .attr("transform", (node) => `translate(${node.x0},${node.y0})`);

    tiles.selectAll("rect")
      .data((node) => [node])
      .join("rect")
      .attr("class", "tile")
      .attr("data-name", (node) => node.data.name)
      .attr("data-category", (node) => node.data.category)
      .attr("data-value", (node) => node.data.value)
      .attr("width", (node) => Math.max(0, node.x1 - node.x0))
      .attr("height", (node) => Math.max(0, node.y1 - node.y0))
      .attr("fill", (node) => color(node.data.category))
      .on("mouseenter", showTooltip)
      .on("mousemove", showTooltip)
      .on("mouseleave", hideTooltip);

    tiles.selectAll(".tile-label")
      .data((node) => [node])
      .join("text")
      .attr("class", "tile-label")
      .attr("x", 7)
      .attr("y", 17)
      .attr("font-size", (node) => Math.min(12, Math.max(8, (node.x1 - node.x0) / 10)))
      .text((node) => node.data.name)
      .each(function (node) {
        const available = node.x1 - node.x0 - 12;
        const label = d3.select(this);
        while (this.getComputedTextLength() > available && this.textContent.length > 4) {
          label.text(`${this.textContent.slice(0, -4)}…`);
        }
      })
      .attr("display", (node) => (node.x1 - node.x0 > 54 && node.y1 - node.y0 > 24) ? null : "none");

    tiles.selectAll(".tile-sub-label")
      .data((node) => [node])
      .join("text")
      .attr("class", "tile-sub-label")
      .attr("x", 7)
      .attr("y", 30)
      .attr("font-size", 8)
      .text((node) => `${d3.format(",.1f")(node.data.value)}M`)
      .attr("display", (node) => (node.x1 - node.x0 > 64 && node.y1 - node.y0 > 39) ? null : "none");

    const xScale = d3.scaleLinear().domain([0, width]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, height]).range([height, 0]);
    const xAxis = d3.axisBottom(xScale).ticks(Math.max(2, Math.floor(width / 110))).tickSize(4).tickFormat("");
    const yAxis = d3.axisLeft(yScale).ticks(Math.max(2, Math.floor(height / 85))).tickSize(4).tickFormat("");

    plot.selectAll(".x-axis")
      .data([null])
      .join("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);
    plot.selectAll(".y-axis")
      .data([null])
      .join("g")
      .attr("class", "axis y-axis")
      .call(yAxis);

    svg.selectAll(".axis-caption-svg")
      .data(["LAYOUT WIDTH", "LAYOUT HEIGHT"])
      .join("text")
      .attr("class", "axis-caption-svg")
      .attr("text-anchor", "middle")
      .attr("transform", (_, index) => index === 0
        ? `translate(${margins.left + width / 2},${outerHeight - 2})`
        : `translate(10,${margins.top + height / 2}) rotate(-90)`)
      .text((caption) => caption);
  }

  async function loadData() {
    try {
      const response = await fetch("/api/data");
      if (!response.ok) throw new Error(`Dataset request failed (${response.status}).`);
      const data = await response.json();
      if (!data || !Array.isArray(data.children) || data.children.length === 0) {
        throw new Error("The dataset is empty or has an invalid format.");
      }
      if (data.children.some((game) =>
        typeof game.name !== "string" ||
        typeof game.category !== "string" ||
        !Number.isFinite(Number(game.value)) ||
        Number(game.value) <= 0
      )) {
        throw new Error("The dataset contains a game with invalid name, category, or sales.");
      }
      chartData = data;
      document.getElementById("game-count").textContent = d3.format(",")(data.children.length);
      renderLegend(
        [...new Set(data.children.map((game) => game.category))].sort((a, b) => a.localeCompare(b)),
        d3.scaleOrdinal()
          .domain([...new Set(data.children.map((game) => game.category))].sort((a, b) => a.localeCompare(b)))
          .range(palette)
      );
      render();
    } catch (error) {
      showError(`We couldn't load the game sales data. ${error.message}`);
    }
  }

  if (typeof d3 === "undefined") {
    showError("D3.js could not be loaded. Check your connection and reload the page.");
    return;
  }

  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(render);
  });
  loadData();
})();
