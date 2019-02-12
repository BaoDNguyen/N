// config
let widthSvg = 500;//document.getElementById("mainPlot").clientWidth-101;
let heightSvg = 500;
let margin = ({top: 20, right: 50, bottom: 50, left: 50});



//dataprt

let service_part =0;

let currentColor ="black";
const mainsvg = d3.select("#content"),
    netsvg = d3.select("#networkcontent");
let x,y,color,brush,legendScale,scaleX,scaleY;

let isColorMatchCategory = false;

let dataRaw = [];
let data,nestbyKey, sumnet=[];
// mainsvg.attrs({
//     width: widthSvg,
//     height: heightSvg,
// });
mainsvg.attrs({
    ViewBox:"0 0 "+widthSvg+" " +heightSvg,
    preserveAspectRatio:"xMidYMid meet"
}).styles({
    width: '90%',
    overflow: "visible",

});

/* Initialize tooltip */
let tip = d3.tip().attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) { return d.values[0].key; });



init();






function init(){
    dataRaw = object2Data(readData());
    data = calData(UnzipData(dataRaw));
    nodenLink = callgapsall(data);
    drawSumgap();
    drawNetgap(nodenLink,isColorMatchCategory);

}

$( document ).ready(function(){
    $(".dropdown-trigger").dropdown();

    let menucombo = d3.select("#listvar")
        .selectAll('li')
        .data(serviceLists.map(d=>d),d=>d)
        .join('li').attr('tabindex',"0");
    menucombo.selectAll('.collapsible-header')
        .data(d=>{console.log(d); return [d]})
        .join('div')
        .attr('class','collapsible-header')
        .text(d=>{return d.text;});
    let cbody = menucombo.selectAll('.collapsible-body')
        .data(d=>{console.log(d); return [d]})
        .join('ul')
        .attr('class','collapsible-body');
    cbody.selectAll('li').data(d=>d.sub).join('li').text(d=>d.text);

    // menucombo.select('.collapsible-header')
    //     .join('div')
    //     .attr('class','collapsible-header')
    //     .text(d=>d.text);
    //     .join("a").on('click',changeVar)
    //     .text(d=>d.text);
});
function changeVar(d){
    chosenService =d.id;
    reset();
    $('#currentservice').text(d.text);
}

function reset(){
    mainsvg.selectAll('*').remove();
    d3.select('#legend-svg').selectAll('*').remove();
    netsvg.selectAll('*').remove();

    data = calData(UnzipData(dataRaw));
    nodenLink = callgapsall(data);
    drawSumgap();
    drawNetgap(nodenLink);
}
function mouseoverHandel(datain){
    tip.show(datain);
    let timestep = datain.key;
    let datapoint = datain.values[0];
    let cpoint = mainsvg.selectAll(".gCategory").filter(f=>f.key!==datapoint.key);
    cpoint.transition().duration(500)
        .call(deactivepoint);
    let currentHost = mainsvg.select("#"+datapoint.key);

    netsvg.selectAll(".linkLineg").style('opacity',0.2);
    d3.select('#mini'+datapoint.key).style('opacity',1);
    d3.selectAll(".linkGap").style('stroke-opacity',0.1);
    d3.selectAll(".linkGap").filter(d=>d.source.key===datapoint.key||d.target.key===datapoint.key).style('stroke-opacity',1);
    if (!currentHost.select('.linkLine').empty())
        currentHost.select('.linkLine').datum(d=>d.values).call(lineConnect)
            .transition()
            .duration(2000)
            .attrTween("stroke-dasharray", tweenDash);
    else
        currentHost.append('path').datum(d=>d.values).call(lineConnect)
            .transition()
            .duration(2000)
            .attrTween("stroke-dasharray", tweenDash);
    function tweenDash() {
        var l = this.getTotalLength(),
            i = d3.interpolateString("0," + l, l + "," + l);
        return function (t) { return i(t); };
    }
}
function mouseleaveHandel(datain){
    tip.hide();
    // let timestep = datain.key;
    // let datapoint = datain.values;
    let cpoint = mainsvg.selectAll(".gCategory")
        .transition().duration(200)
        .call(activepoint);
    mainsvg.selectAll(".linkLine").style("opacity",0.5);
    netsvg.selectAll(".linkLineg").style('opacity',1);
    netsvg.selectAll(".linkGap").style('stroke-opacity',0.3);
}