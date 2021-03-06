//d3js grouped horizontal bar chart is created by referencing
//http://bl.ocks.org/erikvullings/51cc5332439939f1f292
'use strict';
 angular.module('mms.directives')
    .directive('mmsD3GroupedHorizontalBarPlot', ['TableService','$window', mmsD3GroupedHorizontalBarPlot]);
function mmsD3GroupedHorizontalBarPlot(TableService, $window) {
      
    var mmsChartLink = function(scope, element, attrs, mmsViewCtrl) {
      
      var d3 = $window.d3;  
      var divchart = d3.select(element[0]).append('div');

      var achartdata;
      element.click(function(e) {
        //stop Propogating event to parent(mms-transclude-doc) element.
        e.stopPropagation();
      });

      var d3colorR = d3.scale.category10().range();
      function getColor(data, i){
        return data.colors !== undefined ? d3colorR[data.colors[i]] : d3colorR[i];
      }
      var projectId;
      var refId;
      var commitId;
            
      if (mmsViewCtrl) {
          var viewVersion = mmsViewCtrl.getElementOrigin();
          if (!projectId)
              projectId = viewVersion.projectId;
          if (!refId)
              refId = viewVersion.refId;
          if (!commitId)
              commitId = viewVersion.commitId;
      }

      if ( scope.plot.config.length !== 0){ 
        scope.plot.config = JSON.parse(scope.plot.config.replace(/'/g, '"')); //{"colors: [5,6,7,8,9]"}
      } 



      var opacitydefault = 1,//0.7,
          opacityselected = 1.0,
          opacitynotselected = 0.3;

      function mouseout(){
        d3.selectAll(".ghbbar")
          .transition(200)
          .style("fill-opacity", opacitydefault); 

        d3.selectAll(".legendRect")
          .transition(200)
          .style("fill-opacity", opacitydefault); 

        d3.selectAll(".legentFilter")
          .transition(200)
          .style("opacity", opacitydefault);
      }//end of function mouseout
   
      function mouseover(mouseoverClassId){
            d3.selectAll(".ghbbar")
            .transition(200)
            .style("fill-opacity", opacitynotselected); 

             d3.selectAll(".legendRect")
            .transition(200)
            .style("fill-opacity", opacitynotselected); 

            d3.selectAll(".legentFilter")
            .transition(200)
            .style("opacity", opacitynotselected);
            
            d3.selectAll(mouseoverClassId)
            .transition(200)
            .style("fill-opacity", opacityselected);
           
            d3.selectAll(mouseoverClassId)
            .transition(200)
            .style("opacity", opacityselected);
      } //end of function mouseover

      function createFilters(data){
            //create only one filter display
            d3.selectAll('.graphFilter.'+data.id + scope.$id).remove();
            var graphFilter = d3.select('div.'+data.id + scope.$id).append('div')
              .attr("class", 'graphFilter '+ data.id + scope.$id)
              .style('margin-left', '10px');
            var filterLegendsDiv = graphFilter.append('div')
              .append('label').style('border', '1px solid #ddd')
              .text ("Filter by Legends");
             
              filterLegendsDiv//.append('div')
                .selectAll("div")
                .data(data.legends)
                .enter()  
                .append("div")
                .attr("class", function(d,i){return "legentFilter "+ data.id +scope.$id + " " + TableService.toValidId(d);} )
                .attr("style", function(d,i){return "opacity: " + opacitydefault + ";background-color:" + getColor(data,i) + ";";})
                .on('mouseover', function (d, i) {
                    mouseover("."+data.id+scope.$id+"." + TableService.toValidId(d));
                })
                .on('mouseout', function (d, i) {
                    mouseout();
                })
                .append("label")
                .each(function (d, i) {
                      // create checkbox for each data
                      d3.select(this).append("input")
                        .attr("type", "checkbox")
                        .attr("checked",function(d,i){
                          if (data.legendsFilter[TableService.toValidId(d)] === true)
                            return true;
                          else 
                            return null;
                        })
                        .attr("style", function(d,i){var color = getColor(data,i); return "color: " +color + ";background-color:" + color + ";";})
                        .on("click", function (d) {
                            // filter by legends
                            data.legendsFilter[TableService.toValidId(d)] = this.checked;
                            //createGroupedHorizontalBarChart(chartdata[data.id], null); //2nd argument is not used
                            createGroupedHorizontalBarChart(achartdata, null); //2nd argument is not used
                            //handle by visibility
                            //d3.selectAll(".ghbbar."+ data.id + "." + TableService.toValidId(d) ).style("visibility", this.checked ? "visible": "hidden");
                         });
                      d3.select(this).append("span")
                          .text(function (d) {
                              return d;
                          });
              });
              var filterColoumnsDiv = graphFilter.append('div')
                .append('label').style('border', '1px solid #ddd')
                .text ("Filter by Columns");

              filterColoumnsDiv
                .selectAll("div")
                .data(data.labels)
                .enter()  
                .append("div")
                .on('mouseover', function (d, i){
                      mouseover("."+data.id+"." + TableService.toValidId(d));
                })
                .on('mouseout', function (d, i){
                      mouseout();
                })
                .append("label")
                .each(function (d, i) {
                    // create checkbox for each data
                    d3.select(this).append("input")
                      .attr("type", "checkbox")
                      .attr("checked", function(d,i){
                          if (data.labelsFilter[TableService.toValidId(d)] === true)
                            return true;
                          else 
                            return null;
                      })
                      .on("click", function (d) {
                          //filter by columns(labels)
                          data.labelsFilter[TableService.toValidId(d)] = this.checked;     
                          createGroupedHorizontalBarChart(achartdata, null); //2nd argument is not used
                       });
                    d3.select(this).append("span")
                        .text(function (d) {
                            return d;
                    });
              });
      } //end of function createFilter
  
      function createGroupedHorizontalBarChart(data, dataIdDiv){
        d3.select(".ghbchart." + data.id + scope.$id).selectAll('*').remove();
        var svg = d3.select(".ghbchart." + data.id + scope.$id);
        if ( svg[0][0] === null) //first time
          svg = dataIdDiv.append("svg").attr("class", "ghbchart " + data.id + scope.$id);
       
        var filteredDataValues = [];
        var filteredDataSysmlids=[];
        var filteredDataColors=[];
        var filteredDataLegends=[];//table row headers
        var filteredDataLabels=[];//table column headers
        var datalegendsfilter = data.legendsFilter;
        var datalabelsfilter = data.labelsFilter;            
        var counter = -1;

       
        for (var i=0; i<data.labels.length; i++) {
          if ( datalabelsfilter[TableService.toValidId(data.labels[i])]){
            filteredDataLabels.push(data.labels[i]);
            for (var j=0; j<data.values.length; j++) { //data.values.length == data.legends.length
              counter++;
              if (datalegendsfilter[TableService.toValidId(data.legends[j])]){
                filteredDataValues.push(Number(data.values[j][i]));
                filteredDataSysmlids.push(data.valueIds[j][i]);
                filteredDataColors.push(getColor(data ,counter % data.legends.length));
                filteredDataLegends.push(TableService.toValidId(data.legends[j]));
              }
            }
          }
        }
        var filteredLegendsLength = filteredDataLegends.length/filteredDataLabels.length;
         
        var chartWidth       = 700,
            barHeight        = 20,
            groupHeight      = barHeight * filteredLegendsLength,
            gapBetweenGroups = 10,
            spaceForLabels   = 150,
            spaceForLegend   = 200,
            marginbottom = 50;

        var chartHeight = barHeight * filteredDataValues.length + gapBetweenGroups * filteredDataLabels.length;

        var x = d3.scale.linear()
            .domain([0, d3.max(filteredDataValues)])
            .range([0, chartWidth]);

        var y = d3.scale.linear()
            .range([chartHeight + gapBetweenGroups, 0]);

        var yAxis = d3.svg.axis()
            .scale(y)
            .tickFormat('')
            .tickSize(0)
            .orient("left");
                        
        // Specify the chart area and dimensions
        var chart = svg
            .attr("width", "100%")
            .attr("height", chartHeight + marginbottom);
        
        // Create bars
        var bar = chart.selectAll("g")
            .data(filteredDataValues)
            .enter().append("g")
            .attr("transform", function(d, i) {
              return "translate(" + spaceForLabels + "," + (i * barHeight + gapBetweenGroups * (0.5 + Math.floor(i/filteredLegendsLength))) + ")";
            });
            
        // Create rectangles of the correct width
        bar.append("rect")
            .attr('id', function(d,i){ return filteredDataSysmlids[i];})
            .attr("fill", function(d,i) { return filteredDataColors[i]; })
            .style("fill-opacity", opacitydefault)
            .attr("class", function(d,i){ 
              return "ghbbar "+ data.id + scope.$id + " " + filteredDataLegends[i] + " " + TableService.toValidId(filteredDataLabels[Math.floor(i/filteredDataLegends.length)]);
              })
            .attr("width", x)
            .attr("height", barHeight - 1)
            .on('click', function(d, i) {
              if (mmsViewCtrl)
                  mmsViewCtrl.transcludeClicked(this.id); 
            })
            .on('mouseover', function (d, i){
               mouseover("."+ data.id+"." + filteredDataLegends[i]);
            })
            .on('mouseout', function (d, i){
              mouseout();
            });

        // Add text label in bar
        bar.append("text")
            .attr("class", function(d,i){ return "ghbbar "+data.id+scope.$id + " " + filteredDataLegends[i];})
            .attr("x", function(d) { return x(d) - 3; })
            .attr("y", barHeight / 2)
            .attr("dy", ".35em")
            .text(function(d) { return d; });

        //left side label      
        bar.each(function(d, i){
            if (i % filteredLegendsLength === 0){
               d3.select(this).append("text")
              .attr("class", "label")
              .attr("x", function(d) { return - 10; })
              .attr("y", groupHeight / 2)
              .attr("dy", ".35em")
              .text(filteredDataLabels[Math.floor(i/filteredLegendsLength)]);
            }

        });
        chart.append("g")
              .attr("class", "y axis")
              .attr("id", "ghbaxis")
              .attr("transform", "translate(" + spaceForLabels + ", " + -gapBetweenGroups/2 + ")")
              .call(yAxis);

        // Draw legend
        var legendRectSize = 18,
            legendSpacing  = 4;
        var mouseoverId;
        var legend = chart.selectAll('.legend')
            .data(data.legends)
            .enter()
            .append('g')
            .attr('transform', function (d, i) {
                var height = legendRectSize + legendSpacing;
                var offset = -gapBetweenGroups/2;
                var horz = spaceForLabels + chartWidth + 60 + legendRectSize;
                var vert = i * height - offset;
                return 'translate(' + horz + ',' + vert + ')';
            })
            .on('mouseover', function (d, i){
               mouseover("."+ data.id+scope.$id+"."+ TableService.toValidId(d));
            })
            .on('mouseout', function (d, i){
              mouseout();
            });

       
        legend.append('rect')
            .attr('class', function(d,i){ return 'legendRect ' + data.id+scope.$id+ " " + TableService.toValidId(d);})
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .style("fill-opacity", opacitydefault)
            .style('fill', function (d, i) { return getColor(data,i); /*return color(i);*/ })
            .style('stroke', function (d, i) {return getColor(data,i); /*return color(i);*/ });

        legend.append('text')
            .attr('class', 'legend')
            .attr('x', legendRectSize + legendSpacing)
            .attr('y', legendRectSize - legendSpacing)
            .text(function (d, i) {return d; });
      }
          
      scope.render = function() {

        TableService.readvalues(scope.plot, projectId, refId, commitId)
       .then( function(value){
        
        var tablebody = value.tablebody;
        var tableheader = value.tableheader;
        //scope.isHeader = value.isHeader;
        scope.valuesO = value.tablebody.valuesO; //value objects used in watch
        if (tablebody.c3_data.length === 0) { //no data
          return;
        }
        
        var udcolors;
        if (scope.plot.config.colors !== undefined){
          udcolors = scope.plot.config.colors;
        }

        var rowvalues = [];
        var cellIds = []; //0, 1, 2, 3
        var legends = [];
        var legendsFilter = [];
        var rowvalue;
        var cellId;
        var cid = 0;
        tablebody.c3_data.forEach( function (row){
           legends.push(row[0]);
           legendsFilter[row[0]] = true;
           rowvalue = []; //reset
           cellId = []; //reset
           for ( var i = 1; i < row.length; i++){
            rowvalue.push(row[i]);
            cellId.push(cid++);
           }
           cellIds.push(cellId);
           rowvalues.push(rowvalue);
        });
        // legendsFilter = temp;

        var labelsFilter = []; 
        tableheader.forEach( function (item){
          labelsFilter[item] = true;
        });
        
        //var dataV
        achartdata = {
            id: '_'+scope.$id,
            labels: tableheader,
            legends: legends, //row headers
            colors: udcolors,
            values: rowvalues,//table body without row headers
            valueIds: cellIds,
            legendsFilter: legendsFilter,
            labelsFilter: labelsFilter
           };
           //chartdata[achartdata.id] = achartdata;
          d3.select("."+ achartdata.id + scope.$id).remove();
          var dataIdDiv = divchart.append('div')
                              .attr("class", achartdata.id + scope.$id)
                              .attr("style", 'border:1px solid #ddd');
          createGroupedHorizontalBarChart(achartdata, dataIdDiv);
          createFilters(achartdata);
          });
      }; //end of render
      scope.$watch('valuesO', function(newValue, oldValue) {
        return scope.render();
      },true); 

      //rect bar is clicked or table cell (Except rowHeaders) is clicked
      scope.$on('elementSelected', function(event, eid, type) {
          d3.selectAll("rect").transition(200).style("fill-opacity", opacitynotselected);
      });
     
    }; //end of link

    return {
      restrict: 'EA',
      require: '?^mmsView',
       scope: {
          plot: '<' 
      },
      link: mmsChartLink
    }; //return
}
