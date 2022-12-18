var line = d3.line()
    // Basic line function - takes a list of points and plots them x-y, x-y one at a time
    .x(function (d, i) { return d[0]; })
    .y(function (d, i) {
        return d[1]

    })
    .curve(d3.curveMonotoneX) // apply smoothing to the line

function updateChartWaypoints() {
    var linkSize = 1
    var labelSize = "14px"
    var stateSize = 10
    d3.select("#chart").selectAll("*").remove() // Clear everything


    let zoom = d3.zoom()
        .on('zoom', handleZoom);

    function handleZoom(e) {
        // When user zooms, all chart "g" elements are changed accordingly
        d3.select("#chartsvg").selectAll("g").attr("transform", e.transform)


    }


    // Add a series of "g" containers to the SVG in order of "elevation"
    // This allows for future chart updates to act on shapes below these shapes
    var svg_user = d3.select("#chart").append("g").attr("id", "chart_user")
    var svg = d3.select("#chart").append("g").attr("id", "chart_labels")
    var svg2 = d3.select("#chart").append("g").attr("id", "chart_standards")

    d3.select("#chartsvg").call(zoom)



    var standardCoordinates = waypoints.map(e => e.coordinates)


    // Find the minimum and maxiumum range of the model, set the chart size a bit larger than those bounds
    var minx = d3.min(standardCoordinates.map(e => e[0]))
    var miny = d3.min(standardCoordinates.map(e => e[1]))
    var maxx = d3.max(standardCoordinates.map(e => e[0]))
    var maxy = d3.max(standardCoordinates.map(e => e[1]))

    minx = minx * 2
    maxx = maxx * 2
    miny = miny * 2
    maxy = maxy * 2

    // These D3 functions return the properly scaled x and y coordinates
    x = d3.scalePow()
        .exponent(0.7)
        .domain([minx, maxx]) // input
        //.domain ([-500, 1000])
        .range([0, chartWidth]); // output

    y = d3.scalePow()
        .exponent(0.7)
        .domain([miny, maxy])
        //.domain ([-500, 500])
        .range([chartHeight, 0])


    function add(xi, yi, size, color, opacity) {
        svg2.append("circle")
            .attr("cx", x(xi))
            .attr("cy", y(yi))
            .attr("r", size)
            .attr("opacity", opacity)
            .attr("fill", color)

    }

    waypoints.forEach(entry => {
        var xi = entry.coordinates[0]
        var yi = entry.coordinates[1]
        add(xi, yi, stateSize, "blue", 1)

    })



    // Draw labels - the first time they are drawn, there are probably bad positions and overlaps

    var label_array = []
    var anchor_array = []
    waypoints.forEach(entry => {
        var xi = entry.coordinates[0]
        var yi = entry.coordinates[1]
        label_array.push({ x: x(xi), y: y(yi), width: 10, height: 4, name: entry.user + " " + entry.label })
        anchor_array.push({ x: x(xi), y: y(yi), r: stateSize * 2 })
    })
    var labels = svg.selectAll(".label")
        .data(label_array)
        .enter()
        .append("text")
        .attr("class", "label")
        .style("font-size", labelSize)
        .attr("x", function (d) { return d.x })
        .attr("y", function (d) { return d.y })
        .text(function (d) { return d.name })

    var links = svg.selectAll(".link")
        .data(label_array)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("opacity", 0.2)
        .attr("x1", function (d) { return (d.x); })
        .attr("y1", function (d) { return (d.y); })
        .attr("x2", function (d) { return (d.x); })
        .attr("y2", function (d) { return (d.y); })
        .attr("stroke-width", linkSize)
        .attr("stroke", "black");

    var index = 0
    labels.each(function () {
        label_array[index].width = this.getBBox().width;
        label_array[index].height = this.getBBox().height;
        index++

    })

    // Use d3-labeler library to move each label so that it doesn't overlap
    d3.labeler()
        .label(label_array)
        .anchor(anchor_array)
        .width(chartWidth)
        .height(chartHeight)
        .start(1000)


    labels
        .transition()
        .duration(1000)
        .attr("x", function (d) { return d.x })
        .attr("y", function (d) { return d.y })

    links
        .transition()
        .duration(800)
        .attr("x2", function (d) { return d.x; })
        .attr("y2", function (d) { return d.y - 2; });







}
function updateChartUser(data, type) {

    var userSize = 25
    var userOpacity = 0.1
    if (type == "large") {
        userSize = 5
        userOpacity = 0.9
    }


    var svg = d3.select("#chart_user")
    svg.selectAll("*").remove() // Clear last chart, if any

    var vectors = data.map(e => getRelativeVector(e.vector))

    var mapped = runModel(vectors)

    var index = 0

    var lineData = []



    mapped.forEach(entry => {


        var moment = data[index]
        var xi = x(entry[0])
        var yi = y(entry[1])

        lineData.push([xi, yi])

        setTimeout(function () {
            svg.append("circle")
                .attr("cx", xi)
                .attr("cy", yi)
                .attr("r", userSize)
                .attr("opacity", userOpacity)
                .attr("fill", "grey")
                .on("mouseover", function (d) {
                    d3.select(this).style("opacity", 0.9)
                    //console.log(moment.vector)
                    console.log(moment.Gamma_AF8)

                })
                .on("click", function (d) {
                    console.log(moment.vector)
                })
                .on("mouseout", function (d) {
                    d3.select(this).style("opacity", userOpacity)
                })



        }, index * (1000 / mapped.length))

        index++

    })

    if (type == "large") {
        setTimeout(function () {
            svg.append("path")
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("d", function () { return line(lineData) })
        }, 1000)

    }




}

