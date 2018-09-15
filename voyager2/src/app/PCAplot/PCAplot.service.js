'use strict';

angular.module('voyager2')
// TODO: rename to Query once it's complete independent from Polestar
    .factory('PCAplot', function(Dataset,Pills,NotifyingService) {
        var PCAplot = {};
        PCAplot.plot =function(Dataset) {
            d3.selectAll('.background-biplot')
                .style('fill','#ffffff')
                .attr('width',$('.biplot').width())
                .attr('height',$('.biplot').width());
            // Biplot.data;
            d3.selectAll('g').remove();
            var data = Dataset.data;
            if (typeof data !=='undefined' ) {
                //d3.selectAll('.biplot').append("g");
                var margin = {top: 5, right: 5, bottom: 5, left: 5};
                var width = $('.biplot').width() - margin.left - margin.right;
                var height = $('.biplot').width() - margin.top - margin.bottom;
                var angle = Math.PI * 0;
//var color = d3.scaleOrdinal(d3.schemeCategory10);
                var color = d3.scale.category10();
                var x = d3.scale.linear().range([width, 0]); // switch to match how R biplot shows it
                var y = d3.scale.linear().range([height, 0]);
                var rdot = 3;


                var svg = d3.select("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                var brand_names = Object.keys(data[0]);  // first row of data file ["ATTRIBUTE", "BRAND A", "BRAND B", "BRAND C", ...]

                var inputdata = Array.from(data);
                var matrix = data2Num(inputdata);

                var pca = new PCA();
                console.log(brand_names);
                matrix = pca.scale(matrix,true,true);

                var pc = pca.pca(matrix,2);

                var A = pc[0];  // this is the U matrix from SVD
                var B = pc[1];  // this is the dV matrix from SVD
                var maxxy=0;
                A.forEach(function(d){maxxy=Math.max(maxxy,Math.abs(d[0]),Math.abs(d[1]));});
                x.domain([-maxxy,maxxy]).nice();
                y.domain([-maxxy,maxxy]).nice();
                //x.domain([-3.5,3.5]).nice();
                //y.domain([-3.5,3.5]).nice();
                data.map(function(d,i){
                    label: d[brand_names[0]],
                        d.pc1 = A[i][0];
                    d.pc2 = A[i][1];
                });
                var brands = brand_names
                    .map(function(key, i) {
                        return {
                            brand: key,
                            pc1: B[i][0]*4,
                            pc2: B[i][1]*4
                        }
                    });

                function rotate(x,y, dtheta) {

                    var r = Math.sqrt(x*x + y*y);
                    var theta = Math.atan(y/x);
                    if (x<0) theta += Math.PI;

                    return {
                        x: r * Math.cos(theta + dtheta),
                        y: r * Math.sin(theta + dtheta)
                    }
                }


                data.map(function(d) {
                    var xy = rotate(d.pc1, d.pc2, angle);
                    d.pc1 = xy.x;
                    d.pc2 = xy.y;
                });

                brands.map(function(d) {
                    var xy = rotate(d.pc1, d.pc2, angle);
                    d.pc1 = xy.x;
                    d.pc2 = xy.y;
                });


                svg.selectAll(".dot")
                    .data(data)
                    .enter().append("circle")
                    .attr("class", "dot")
                    .attr("r", rdot)
                    .attr("cx", function(d) { return x(d.pc1); })
                    .attr("cy", function(d) { return y(d.pc2); })
                    .style("fill", function(d) {
                        return '#161616'; })
                    .style("fill-opacity",0.4)
                    .on('mouseover', onMouseOverAttribute)
                    .on('mouseleave', onMouseLeave);

                svg.selectAll("circle.brand")
                    .data(brands)
                    .enter().append("rect")
                    .attr("class", "square")
                    .attr("width", 7)
                    .attr('height',7)
                    .attr("x", function(d) { return x(d.pc1)-3.5; })
                    .attr("y", function(d) { return y(d.pc2)-3.5; })
                    .style("fill", function(d) {
                        return color(d['brand']); })
                    .on('mouseover', onMouseOverBrand)
                    .on('mouseleave', onMouseLeave);


                svg.selectAll("text.brand")
                    .data(brands)
                    .enter().append("text")
                    .attr("class", "label-brand")
                    .attr("x", function(d) { return x(d.pc1) + 10; })
                    .attr("y", function(d) { return y(d.pc2) + 0; })
                    .text(function(d) { return d['brand']});
                var deltaX, deltaY;

                var bi = d3.selectAll(".biplot");
                var temp_drag;
                var current_field;


                var dragHandler = d3.behavior.drag()
                    .on("dragstart", function (d) {

                        var proIwant = d3.selectAll("schema-list-item")
                            .data(Dataset.schema.fieldSchemas)
                            .filter(function(it){
                                if (it.field == d.brand){
                                    current_field = it;
                                    return true;}
                                else
                                    return false})
                            .select('div');
                        //.attr ('class','schema-list-item ng-pristine ng-untouched ng-valid ui-droppable ui-droppable-disabled ng-empty ui-droppable-active drop-active');
                        var pill = {
                            field: current_field.field,
                            title: current_field.title,
                            type: current_field.type,
                            aggregate: current_field.aggregate
                        };
                        Pills.dragStart(pill, null);
                        // NotifyingService.notify();
                        var ori = proIwant.select('span').html();
                        //console.log(ori);
                        /* temp_drag = proIwant.select('span').select(function() {
                             return this.parentNode.insertBefore(this.cloneNode(true), this.nextSibling);
                         });*/
                        temp_drag = d3.select('bi-plot').append('span').html(ori);
                        temp_drag.attr("class",'pill draggable full-width no-right-margin field-info ng-pristine ng-untouched ng-valid ng-isolate-scope ui-draggable ui-draggable-handle ng-empty ui-draggable-dragging')
                            .style("position","absolute")
                            .style("z-index",'9999')
                            .style("left",function(){return ((d3.event.x||d3.event.pageX)) + "px"})
                            .style("top",function(){var con = (d3.event.y||d3.event.pageY) +100;
                                return con + "px"});
                        d3.selectAll('.field-drop')
                            .attr("class","field-drop ng-pristine ng-untouched ng-valid ui-droppable ng-not-empty ui-dropable-active drop-active ");
                        NotifyingService.notify();
                        // NotifyingService.notify();
                        //console.log($(proIwant[0]));
                        //$(proIwant[0]).trigger("mousedown");
                        //$(proIwant[0]).trigger('DOMContentLoaded');
                        //$(proIwant[0]).trigger('blur');
                    })
                    .on("drag", function (d) {
                        temp_drag
                            .style("left",function(){return d3.event.x + "px"})
                            .style("top",function(){return (d3.event.y+100) + "px"});

                    })
                    .on("dragend", function (d) {
                        var proIwant = d3.selectAll("schema-list-item")
                            .data(Dataset.schema.fieldSchemas)
                            .filter(function(it){return it.field == d.brand;})
                            .select('div')
                            .attr ('class','schema-list-item ng-pristine ng-untouched ng-valid ui-droppable ui-droppable-disabled ng-empty');

                        Pills.dragStop;

                        var pos = temp_drag.node().getBoundingClientRect();
                        temp_drag.remove();
                        var tem_group = d3.selectAll(".shelf-group");
                        tem_group = tem_group[0];
                        var tem_group = tem_group.filter(function(d,i){var pos_g = d.getBoundingClientRect();
                            return (pos_g.top<pos.top&&pos_g.bottom>pos.top&&pos_g.left<pos.left&&pos_g.right>pos.left)});

                        try{
                            var chan = $(tem_group[0]).attr('channel-id').replace(/'/g,"");
                            console.log(chan);
                            if (chan!=null){
                                Pills.set(chan, current_field);
                                Pills.listener.dragDrop(chan);
                                //.update(Spec.spec);
                            }}catch(e){}
                        NotifyingService.notify();
                        d3.selectAll("div [d3-over='true']")
                            .attr('d3-over','false');


                        //var event = new Event('submit');  // (*)
                        //$(d3.select('.schema')[0]).dispatchEvent(event);
                        d3.selectAll('.field-drop')
                            .attr("class","field-drop ng-pristine ng-untouched ng-valid ui-droppable ng-not-empty");
                    });
                var listitem = svg.selectAll(".line")
                    .data(brands)
                    .enter().append("line")
                    .attr("class", "line square draggable")
                    .attr('x1', function(d) { return x(-d.pc1);})
                    .attr('y1', function(d) { return y(-d.pc2); })
                    .attr("x2", function(d) { return x(d.pc1); })
                    .attr("y2", function(d) { return y(d.pc2); })
                    .style("stroke", function(d) { return color(d['brand']); })
                    .style("stroke-width", '3px')
                    .on('mouseover', onMouseOverBrand)
                    .on('mouseleave', onMouseLeave)
                    .on("dblclick", function(d) {
                        var proIwant = d3.selectAll("schema-list-item")
                            .data(Dataset.schema.fieldSchemas)
                            .filter(function(it){return it.field == d.brand})
                            .select('div')
                            .select('span');
                        $(proIwant[0]).trigger("dblclick");
                    })
                    .call(dragHandler);
                var tip = d3.tip()
                    .attr('class', 'd3-tip')
                    .offset([10, 20])
                    .direction('e')
                    .html(function(values,title) {
                        var str =''
                        str += '<h3>' + (title.length==1 ? 'Brand ' : '' )+ title  + '</h3>'
                        str += "<table>";
                        for (var i=0; i<values.length; i++) {
                            if ( values[i].key != 'pc1' && values[i].key != 'pc2') {
                                str += "<tr>";
                                str += "<td>" + values[i].key + "</td>";
                                str += "<td class=pct>" + values[i].value + "</td>";
                                str + "</tr>";
                            }
                        }
                        str += "</table>";

                        return str;
                    });
                //dragHandler(svg.selectAll(".line"));
                svg.call(tip);
                // draw line from the attribute a perpendicular to each brand b
                function onMouseOverAttribute(a,j) {
                    brands.forEach(function(b, idx) {
                        var A = { x: 0, y:0 };
                        var B = { x: b.pc1,  y: b.pc2 };
                        var C = { x: a.pc1,  y: a.pc2 };

                        b.D = getSpPoint(A,B,C);
                    });

                    svg.selectAll('.tracer')
                        .data(brands)
                        .enter()
                        .append('line')
                        .attr('class', 'tracer')
                        .attr('x1', function(b,i) { return x(a.pc1); return x1; })
                        .attr('y1', function(b,i) { return y(a.pc2); return y1; })
                        .attr('x2', function(b,i) { return x(b.D.x); return x2; })
                        .attr('y2', function(b,i) { return y(b.D.y); return y2; })
                        .style("stroke", function(d) { return "#ff6f2b"});

                    delete a.D;
                    var tipText = d3.entries(a);
                    tip.show(tipText, a);
                }

// draw line from the brand axis a perpendicular to each attribute b
                function onMouseOverBrand(b,j) {

                    data.forEach(function(a, idx) {
                        var A = { x: 0, y:0 };
                        var B = { x: b.pc1,  y: b.pc2 };
                        var C = { x: a.pc1,  y: a.pc2 };

                        a.D = getSpPoint(A,B,C);
                    });

                    svg.selectAll('.tracer')
                        .data(data)
                        .enter()
                        .append('line')
                        .attr('class', 'tracer')
                        .attr('x1', function(a,i) { return x(a.D.x);  })
                        .attr('y1', function(a,i) { return y(a.D.y);  })
                        .attr('x2', function(a,i) { return x(a.pc1);  })
                        .attr('y2', function(a,i) { return y(a.pc2); })
                        .style("stroke", function(d) { return "#aaa"});

                    var tipText = data.map(function(d) {
                        return {key: d[brand_names[0]], value: d[b['brand']] }
                    })
                    tip.show(tipText, b.brand);
                }

                function onMouseLeave(b,j) {
                    svg.selectAll('.tracer').remove()
                    tip.hide();
                }






                /*svg.selectAll("text.attr")
                    .data(data)
                    .enter().append("text")
                    .attr("class", "label-attr")
                    .attr("x", function(d,i ) { return x(d.pc1)+4 ; })
                    .attr("y", function(d ,i) { return y(d.pc2) + (label_offset[d.type]||0); })
                    .text(function(d,i) { return d.type})*/


                function getSpPoint(A,B,C){
                    var x1=A.x, y1=A.y, x2=B.x, y2=B.y, x3=C.x, y3=C.y;
                    var px = x2-x1, py = y2-y1, dAB = px*px + py*py;
                    var u = ((x3 - x1) * px + (y3 - y1) * py) / dAB;
                    var x = x1 + u * px, y = y1 + u * py;
                    return {x:x, y:y}; //this is D
                }

                function data2Num (input){
                    var clone = {};
                    for ( var key in  input[0]){
                        clone[key] = [];
                    }
                    var output=  Array.from(input);
                    input.forEach(function (d){
                        for ( var key in d){
                            if (clone[key].find(function(it){return it.key == [d[key]];}) == undefined){
                                clone[key].push({'key': d[key]});
                            }
                        }
                    });


                    for (var key in clone){
                        clone[key].sort(function(a,b){
                            if (a.key < b.key)
                                return -1;
                            else
                                return 1;});


                        clone[key].forEach(function(d,i){
                            if (d.key == null)
                                d.newindex = 0;
                            else if (isNaN(parseFloat(d.key) )){
                                d.newindex = i;
                            }else{
                                d.newindex = parseFloat(d.key);
                            }
                        });
                    }


// output with replaced number
                    /*output.forEach(function (d,i){
                        for ( var k in d){
                            output[i][k] = clone[k].find(function(it){return it.key == output[i][k]}).newindex;
                        }
                    });*/

                    var matrix = input.map(function (d,i){
                        return Object.keys(d).map(function(k){
                            return clone[k].find(function(it){return it.key == output[i][k]}).newindex;
                        });
                    });
                    return matrix;
                    //return output.map(function(d){return Object.keys(d).map(function(i){return d[i]})});
                }
            }
        return PCAplot};
        return PCAplot;
    });