
  function addCheckbox(div, name, checked) {
    var checkboxDiv = div.append("div")
        .style("font-size", "30px")
        .style("margin", "8px")

    
    var checkbox = checkboxDiv.append("input")
        .attr("type", "checkbox")
        .style("width", "20px")
        .style("height", "20px")
        .style("accent-color", "lightgreen")
        .style("opacity", 0.7)
        .property("checked", checked)
        

    checkboxDiv.append("label")
        .text(name)

    return checkbox

}
function popUp(event, html) {
    var x = event.pageX
    var y = event.pageY
    var popup = d3.select("#popup")
    popup
        .style("display", "flex")
        //.style("width", "200px")
        //.style("height", "100px")
        .style("left", (x + 10) + "px")
        .style("top", (y + 10) + "px")
        .append("div").style("margin", "10px")
        .html(html)
}
function popUpremove()
{
    d3.select("#popup")
                .transition()
                .style("display", "none")
                .duration(100)
                .selectAll("*").remove()
}
function clickDiscord() {

    openLink("https://discord.gg/FQEthg67")
}
function clickGithub() {
    openLink("https://github.com/luobogao/meditationmaps")
}
function clickContribute()
{

}
function clickDatasets()
{

}
function openLink(url) {
    window.open(
        url,
        '_blank' // <- This is what makes it open in a new window.
    );
}
function openNav() {
    document.getElementById("mySidebar").style.left = "0px";
    document.getElementById("open_btn").style.display = "none"
    document.getElementById("main").style.marginLeft = "300px";
    d3.select("#chartsvg").attr("width", window.innerWidth - 300)
}

function closeNav() {
    document.getElementById("mySidebar").style.left = "-300px";
    document.getElementById("open_btn").style.display = "flex"
    document.getElementById("main").style.marginLeft = "0";
    d3.select("#chartsvg").attr("width", window.innerWidth)
}
function buildBrowseFile(div, label, id) {
    var width = "80px"
    let holder = div.append("div")
        .style("position", "relative")
        .attr("font-family", fontFamily)
        .attr("font-size", textSizeMed + "px")
        .attr("id", id + "-all")
        .style("width", width)

    holder
        .append("input")
        .style("position", "relative")
        .style("text-align", "right")
        .style("opacity", 0)
        .style("z-index", 2)
        .attr("class", "browse-id")
        .style("width", width)
        .attr("type", "file")
        .on("mouseover", function (d) {
            d3.select(this).style("cursor", "pointer");
            d3.select("#" + id)
                .style("background", "grey")
                .style("border-radius", "5px")

        })

        .on("mouseout", function (d) {
            d3.select(this).style("cursor", "default");
            d3.select("#" + id)
                .style("border-radius", "5px")
                .style("background", "#f0f0f0")
        })

        .on("change", function (evt) {
            document.getElementById(id).click()
            d3.select("#chart_user").selectAll("*").remove() // Clear last chart, if any

            let file = evt.target.files[0]

            fr = new FileReader()
            fr.onload = receivedFile
            fr.readAsText(file)




        })


    let fakefile = holder.append("div")
        .style("position", "absolute")
        .style("top", "0px")
        .style("left", "0px")
        .style("z-index", 1)

    let btn = fakefile.append("button")
        .style("font-size", "18px")
        .attr("font-family", fontFamily)
        .attr("color", "#ececf1ff")
        //.style ("height", "30px")
        .attr("id", id)
        .text(label)

}
function buildLoading(div) {
    div.style("display", "flex").style("justify-content", "center")
    var width = 50,
        height = 50,
        n = 18,
        r = 2,
        ?? = Math.PI,
        p = 1000;
    var container = div.append("div")
        .attr("id", "loader")
        .style("position", "absolute")
        .style("justify-content", "center")
        .style("margin-top", "10px")
        .style("display", "none")

    var svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)

    var g = svg.selectAll("g")
        .data(d3.range(0, 2 * ??, 2 * ?? / n))
        .enter().append("g")
        .attr("transform", function (d) {
            var x = width * (0.35 * Math.cos(d) + 0.5),
                y = height * (0.35 * Math.sin(d) + 0.5);
            return "translate(" + [x, y] + ")rotate(" + d * 180 / ?? + ")";
        });
    var moons = g.append("path")
        .attr("fill", "white");

    d3.timer(function (t) {
        var ?? = 2 * ?? * (t % p / p);
        moons.attr("d", function (d) { return moon((?? + d) % (2 * ??)); });
    });
    function moon(??) {
        var rx0 = ?? < ?? ? r : -r,
            s0 = ?? < ?? ? 0 : 1,
            rx1 = r * Math.cos(??),
            s1 = ?? < ?? / 2 || (?? <= ?? && ?? < 3 * ?? / 2) ? 0 : 1;
        return "M" + [0, r] +
            "A" + [rx0, r, 0, 0, s0, 0, -r] +
            "A" + [rx1, r, 0, 0, s1, 0, r];
    }
}
