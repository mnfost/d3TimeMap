function d3TimeMap() {

    var width = 600, // default width
    height = 600, // default height
    margin = {top: 20, right: 20, bottom: 30, left: 40},
    settings = {}, legend_x, min_x, min_y, max_x, max_y, gap, legend, legendNew,
    data = [], x, y, lx, bx, color_scale,
    xAxis, yAxis,
    svg;

    function set_options(){
      width = width - margin.left - margin.right;
      height = height - margin.top - margin.bottom;

      legend_x = width + margin.left + 24;

      // define x,y, and scales
        min_x = d3.min(data, function(d) { return(d.x);} );
        min_y = d3.min(data, function(d) { return(d.y);} );
        max_x = d3.max(data, function(d) { return(d.x);} );
        max_y = d3.max(data, function(d) { return(d.y);} );
        gap = (max_x - min_x) * 0.005;

        x = d3.scale.linear()
            .range([0, width]);
        if (settings.xlim) x.domain(settings.xlim);
        else x.domain([min_x-gap, max_x+gap]).nice();

        y = d3.scale.linear()
            .range([height, 0]);
        if (settings.ylim) y.domain(settings.ylim);
        else y.domain([min_y-gap, max_y+gap]).nice();

        lx = d3.min(data, function(d) { return(d.col_var);});
        bx = d3.max(data, function(d) { return(d.col_var);});
        if(typeof(lx) === "number"){
          color_scale = d3.scale.quantile().domain([lx,bx]).range(settings.colors);}
        else{color_scale = d3.scale.ordinal().range(settings.colors);}



        brush = d3.svg.brush()
          .x(x)
          .y(y)
          .on("brush", function() {brushmove();})
          .on("brushend", function() {brushend();});

        // x and y axis functions
        xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .tickSize(-height)
                .tickFormat(function (d) {
                  if (d < 0) return ''; // No negative labels
                  else return d;});

        yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickSize(-width)
                .tickFormat(function (d) {
                  if (d < 0) return ''; // No negative labels
                  else return d;});

    }



    // Key function to identify rows when interactively filtering
    function key(d) {
        return d.key_var;
    }

    // Default translation function for points and labels
    function translation(d) {
        return "translate(" + x(d.x) + "," + y(d.y) + ")";
    }

    // Brush functions
    function brushmove() {
      var extent = brush.extent();
      dot.classed("selected", function(d) {
      is_brushed = extent[0][0] <= d.x && d.x < extent[1][0]
                && extent[0][1] <= d.y && d.y < extent[1][1];
      return is_brushed;});}


    function brushend() {
      extent = brush.extent();
      x.domain([extent[0][0],extent[1][0]]);
      y.domain([extent[0][1],extent[1][1]]);

      lx = d3.min(data.filter(function(d) { return (d.x >= extent[0][0] && d.x <= extent[1][0] && d.y >= extent[0][1] && d.y <= extent[1][1])}), function(d) { return(d.col_var);});
      bx = d3.max(data.filter(function(d) {return (d.x >= extent[0][0] && d.x <= extent[1][0] && d.y >= extent[0][1] && d.y <= extent[1][1])}), function(d) { return(d.col_var);});
      if(typeof(lx) === "number"){
      color_scale = d3.scale.quantile().domain([lx,bx]).range(settings.colors);}
      else{color_scale = d3.scale.ordinal().range(settings.colors);}

      transition_data();
      reset_axis();

      dot.classed("selected", false);
      d3.select(".brush").call(brush.clear());}

      function reset_brush(){
      transition_data();
      reset_axis();}

      function transition_data() {
      svg.selectAll(".dot")
        .attr("transform", translation)
        .style("fill", function(d) { return color_scale(d.col_var); });}

      function reset_axis() {
      svg.select(".x.axis").call(xAxis);
      svg.select(".y.axis").call(yAxis);
      }


    // Create and draw x and y axes
    function add_axes(selection) {

                selection.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis)
                    .append("text")
                      .attr("class", "axis-label")
                      .attr("y", -6)
                      .style("text-anchor", "end")
                      .attr("x", width)
                      .text(settings.xlab);

              selection.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                    .append("text")
                    .attr("class", "axis-label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .text(settings.ylab);

    }


    // Create tooltip content function
    function tooltip_content(d) {
        // no tooltips
        if (!settings.has_tooltips) return null;
        if (settings.has_custom_tooltips) {
            // custom tooltips
            return d.tooltip_text;
        } else {
            // default tooltips
            var text = Array();
            if (settings.has_labels) text.push("<b>"+d.lab+"</b>");
            text.push("<b>"+settings.xlab+":</b> "+d.x.toFixed(3));
            text.push("<b>"+settings.ylab+":</b> "+d.y.toFixed(3));
            if (settings.has_color_var) text.push("<b>"+settings.col_lab+":</b> "+d.col_var);
            return text.join("<br />");
        }
    }

    // Initial dot attributes
    function dot_init (selection) {
         // tooltips when hovering points
        if (settings.has_tooltips) {
            var tooltip = d3.select(".d3TimeMap-tooltip");
            selection.on("mouseover", function(d, i){
                tooltip.style("visibility", "visible")
                .html(tooltip_content(d));
            });
            selection.on("mousemove", function(){
                tooltip.style("top", (d3.event.pageY+15)+"px").style("left",(d3.event.pageX+15)+"px");
            });
            selection.on("mouseout", function(){
                tooltip.style("visibility", "hidden");
            });
        }
    }

    // Apply format to dot
    function dot_formatting(selection) {
        selection
        .attr("transform", translation)
        .style("opacity", settings.point_opacity)
        // fill color
        .style("fill", function(d) { return color_scale(d.col_var); })
        .attr("d", d3.svg.symbol()
            .size(function(d) {return settings.point_size;})
        )
        .attr("class", function(d,i) {
          return "dot color color-c" + d.col_var;
        });
    }


    // Initial text label attributes
    function label_init (selection) {
        selection
        .attr("text-anchor", "middle");
    }

    // Compute default vertical offset for labels
    function default_label_dy(size, y, type_var) {
          return (-Math.sqrt(size) / 2) - 6;
    }

    // Apply format to text label
    function label_formatting (selection) {
        selection
        .text(function(d) {return(d.lab)})
        .style("font-size", settings.labels_size + "px")
        .attr("class", function(d,i) { return "point-label color color-c" + d.col_var; })
        .attr("transform", translation)
        .style("fill", function(d) { return color_scale(d.col_var); })
        .attr("dx", function(d) {
            if (d.lab_dx === undefined) return("0px");
            else return(d.lab_dx + "px");
        })
        .attr("dy", function(d) {
            if (d.lab_dy !== undefined) return(d.lab_dy + "px");
            var size = (d.size_var === undefined) ? settings.point_size : size_scale(d.size_var);
            return default_label_dy(size, d.y, d.type_var) + "px";
        });
    }


    // Create legend
    function add_legend() {

        legend = svg.select(".legend")
                    .data(color_scale.domain().sort());

        legendNew = legend.enter().append("g")
                        .attr("class", "legend")
                        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; })
                        .append("rect")
                        .attr("x", width - 18)
                        .attr("width", 18)
                        .attr("height", 18)
                        .append("text")
                        .attr("x", width - 24)
                        .attr("y", 9)
                        .attr("dy", ".35em")
                        .style("text-anchor", "end");

            legend.exit().remove();

            legend.selectAll("rect")
                  .attr("x", width - 18)
                  .style("fill", color);
            legend.selectAll("text")
                  .attr("x", width - 24)
                  .text(function(d) { return d; });
    }



    // Filter points data
    function point_filter(d) {
      return d.type_var === undefined || d.type_var == "point";
    }


    function chart(selection) {
        selection.each(function() {

            set_options();

            // Root chart element and axes
            root = svg.append("g")
            .attr("class", "root")
            .style("fill", "#FFF")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(add_axes);

            // <defs>
            var defs = svg.append("defs");
            // clipping rectangle
            defs.append("clipPath")
            .attr('id', 'scatterclip-' + settings.html_id)
            .append('rect')
            .attr('class', 'cliprect')
            .attr('width', width)
            .attr('height', height);

            // Brush
            root.append("g")
              .attr("class", "pane")
              .attr("width", width)
              .attr("height", height)
              .style("fill-opacity", ".125")
              .style("pointer-events", "all")
              .call(brush);

            // chart body
            var chart_body = root.append("g")
            .attr("class", "chart-body")
            .attr("width", width)
            .attr("height", height)
            .attr("clip-path", "url(" + document.location.href + "#scatterclip-" + settings.html_id + ")");


            // Add points
            var dot = chart_body
            .selectAll(".dot")
            .data(data.filter(point_filter), key(point_filter));
            dot.enter()
            .append("path")
            .call(dot_formatting)
            .call(dot_init);

            dot.on('mousedown', function(){
            brush_elm = svg.select(".brush").node();
            new_click_event = new Event('mousedown');
            new_click_event.pageX = d3.event.pageX;
            new_click_event.clientX = d3.event.clientX;
            new_click_event.pageY = d3.event.pageY;
            new_click_event.clientY = d3.event.clientY;
            brush_elm.dispatchEvent(new_click_event);});


            // Add text labels
            if (settings.has_labels) {
                var labels = chart_body.selectAll(".point-label")
                .data(data, key);

                labels.enter()
                .append("text")
                .call(label_init)
                .call(label_formatting);
            }

            // Legends
            if (settings.has_legend && settings.legend_width > 0) {
                var legend = svg.append("g").attr("class", "legend");
                // Color legend
                if (settings.has_color_var) {
                    add_legend.svg = svg;
                    add_legend(legend);
                }
            }

        });
    }


    // Update chart with transitions
    function update_settings(old_settings) {

        if (old_settings.point_opacity != settings.point_opacity)
            svg.selectAll(".dot").transition().style("opacity", settings.point_opacity);
        if (old_settings.labels_size != settings.labels_size)
            svg.selectAll(".point-label").transition().style("font-size", settings.labels_size + "px");
        if (old_settings.point_size != settings.point_size)
            svg.selectAll(".dot").transition().call(dot_formatting);
        if (old_settings.has_labels != settings.has_labels) {
            if (!settings.has_labels) {
                svg.selectAll(".point-label").remove();
            }
            if (settings.has_labels) {
                var chart_body = svg.select(".chart-body");
                var labels = chart_body.selectAll(".point-label")
                            .data(data, key);
                labels.enter()
                .append("text")
                .call(label_init)
                .call(label_formatting);
            }
        }
    }

    // Update data with transitions
    function update_data() {

      if (settings.has_legend_changed && settings.legend_width > 0)
            resize_chart();

      set_options();

      var t0 = svg.transition().duration(1000);
      svg.select(".x.axis .axis-label").text(settings.xlab);
      t0.select(".x.axis").call(xAxis);
      svg.select(".y.axis .axis-label").text(settings.ylab);
      t0.select(".y.axis").call(yAxis);


      svg.select(".pane");

      var chart_body = svg.select(".chart-body");

      // Add points
      var dot = chart_body
      .selectAll(".dot")
      .data(data.filter(point_filter), key(point_filter));
      dot.enter().append("path").call(dot_init);
      dot.transition().duration(1000).call(dot_formatting);
      dot.exit().transition().duration(1000).attr("transform", "translate(0,0)").remove();


      if (settings.has_labels) {
          var labels = chart_body.selectAll(".point-label")
          .data(data, key);
          labels.enter().append("text").call(label_init);
          labels.transition().duration(1000).call(label_formatting);
          labels.exit().transition().duration(1000).attr("transform", "translate(0,0)").remove();
      }

      if (settings.legend_changed) {
          var legend = svg.select(".legend");
          // Remove existing legends
          legend.selectAll("*").remove();
          // Recreate them
          if (settings.has_legend && settings.legend_width > 0) {
              // Color legend
              if (settings.has_color_var) {
                add_legend(legend);
              }

          }
      }
    };


    // Dynamically resize chart elements
    function resize_chart () {
        set_options();
        // Change svg attributes
        svg.select(".root").attr("width", width).attr("height", height);
        svg.select(".cliprect").attr("width", width).attr("height", height);
        svg.select(".pane").attr("width", width).attr("height", height);
        svg.select(".chart-body").attr("width", width).attr("height", height);
        svg.select(".x.axis").attr("transform", "translate(0," + height + ")").call(xAxis);
        svg.select(".x.axis .axis-label").attr("x", width - 5);
        svg.select(".y.axis").call(yAxis);

        svg.selectAll(".dot").attr("transform", translation);
        if (settings.has_labels) {
            svg.selectAll(".point-label")
            .attr("transform", translation);
        }

        // Move legends
        if (settings.has_color_var) {
            svg.select(".color-legend-label")
            .attr("transform", "translate(" + legend_x + "," + margin.legend_top + ")");
            svg.select(".color-legend")
            .attr("transform", "translate(" + legend_x + "," + (margin.legend_top + 12) + ")");
        }



    };



    // Add controls handlers for shiny
    chart.add_controls_handlers = function() {

        // Brush reset
        d3.select("#" + settings.dom_id_reset_brush).on("click", function() {
            d3.transition().duration(750).tween("brush", function() {
                var ix = d3.interpolate(x.domain(), [0, width]),
                iy = d3.interpolate(y.domain(), [height, 0]);
                return function(t) {
                    brush.x(x.domain(ix(t))).y(y.domain(iy(t)));
                    reset_brush();
                };
            })
        });

        // SVG export
        d3.select("#" + settings.dom_id_svg_export)
        .on("click", function(){
            var svg_content = svg
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("version", 1.1)
            .node().parentNode.innerHTML;
            svg_content = svg_content.replace(/clip-path="url\(.*?(#.*?)\)"/,
                                              'clip-path="url($1)"');
            var imageUrl = "data:image/octet-stream;base64,\n" + btoa(svg_content);
            d3.select(this)
            .attr("download", "d3TimeMap.svg")
            .attr("href", imageUrl);
        });
    };

    // resize
    chart.resize = function() {
        resize_chart();
    }

    // settings getter/setter
    chart.data = function(value, redraw) {
        if (!arguments.length) return data;
        data = value;
        if (!redraw) update_data();
        return chart;
    };

    // settings getter/setter
    chart.settings = function(value) {
        if (!arguments.length) return settings;
        if (Object.keys(settings).length === 0) {
            settings = value;
            set_options();
        } else {
            var old_settings = settings;
            settings = value;
            update_settings(old_settings);
        }
        return chart;
    };

    chart.svg = function(value) {
        if (!arguments.length) return svg;
        svg = value;
        return chart;
    }

    // width getter/setter
    chart.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        return chart;
    };

    // height getter/setter
    chart.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        return chart;
    };

    return chart;
}



HTMLWidgets.widget({

    name: 'd3TimeMap',

    type: 'output',

    initialize: function(el, width, height) {

        if (width < 0) width = 0;
        if (height < 0) height = 0;
        // Create root svg element
        var svg = d3.select(el).append("svg");
        svg
        .attr("width", width)
        .attr("height", height)
        .attr("class", "d3TimeMap")
        .append("style")
        .text(".d3TimeMap {font: 10px sans-serif;}" +
        ".d3TimeMap .axis line, .axis path { stroke: #000; fill: none; shape-rendering: CrispEdges;} " +
        ".d3TimeMap .axis .tick line { stroke: #ddd;} " +
        ".d3TimeMap .axis text { fill: #000; } ");

        // Create tooltip content div
        var tooltip = d3.select(".d3TimeMap-tooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body")
            .append("div")
            .style("visibility", "hidden")
            .attr("class", "d3TimeMap-tooltip");
        }

        // Create d3TimeMap instance
        return d3TimeMap().width(width).height(height).svg(svg);
    },

    resize: function(el, width, height, scatter) {

        if (width < 0) width = 0;
        if (height < 0) height = 0;
        // resize root svg element
        var svg = d3.select(el).select("svg");
        svg
        .attr("width", width)
        .attr("height", height);
        // resize chart
        scatter.width(width).height(height).svg(svg).resize();
    },

    renderValue: function(el, obj, scatter) {
        // Check if update or redraw
        var first_draw = (Object.keys(scatter.settings()).length === 0);
        var redraw = first_draw || !obj.settings.transitions;
        var svg = d3.select(el).select("svg").attr("id", "d3TimeMap-svg-" + obj.settings.html_id);
        scatter = scatter.svg(svg);

        // convert data to d3 format
        data = HTMLWidgets.dataframeToD3(obj.data);

        // If no transitions, remove chart and redraw it
        if (!obj.settings.transitions) {
            svg.selectAll("*:not(style)").remove();
        }

        // Complete draw
        if (redraw) {
            scatter = scatter.data(data, redraw);
            scatter = scatter.settings(obj.settings);
            // add controls handlers for shiny apps
            scatter.add_controls_handlers();
            // draw chart
            d3.select(el)
            .call(scatter);
        }
        // Update only
        else {
            // Check what did change
            obj.settings.has_legend_changed = scatter.settings().has_legend != obj.settings.has_legend;
            obj.settings.has_labels_changed = scatter.settings().has_labels != obj.settings.has_labels;
            function changed(varname) {
                return obj.settings.hashes[varname] != scatter.settings().hashes[varname];
            };
            obj.settings.x_changed = changed("x");
            obj.settings.y_changed = changed("y");
            obj.settings.lab_changed = changed("lab");
            obj.settings.legend_changed = changed("col_var");
            obj.settings.data_changed = obj.settings.x_changed || obj.settings.y_changed || obj.settings.lab_changed ||
                                        obj.settings.legend_changed || obj.settings.has_labels_changed;
            scatter = scatter.settings(obj.settings);
            // Update data only if needed
            if (obj.settings.data_changed) scatter = scatter.data(data, redraw);
        }
    }

});
