'use strict';
 angular.module('mms.directives')
  .directive('mmsD3RadarPlot', ['TableService','$window', mmsD3RadarPlot]);
  function mmsD3RadarPlot(TableService, $window) {
      
    var mmsRadarChartLink = function(scope, element, attrs, mmsViewCtrl) {
      var d3 = $window.d3;  
      var colorscale = d3.scale.category10();
      var w = 500, h = 500;

      var scopetableColumnHeadersLabel= [];
      var divchart = d3.select(element[0]).append('div');

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
     scope.render = function() {

      TableService.readvalues(scope.plot, projectId, refId, commitId)
       .then( function(value){
        scope.tablebody = value.tablebody;
        scope.tableheader = value.tableheader;
        scope.isHeader = value.isHeader;
        scope.valuesO = value.tablebody.valuesO; //value objects used in watch
        if (scope.tablebody.c3_data.length === 0) { //no data
          return;
        }
        var rowvalues = []; //[][] {{axis: p2, value: 15}, {axis: p3: value: 1}}...
        scope.tablebody.c3_data.forEach( function (row){
          var rowvalue = [];
          for (var i = 1; i < row.length; i++) //ignore row header
            rowvalue.push({axis: scope.tableheader[i-1], value: row[i]});
          rowvalues.push(rowvalue);
        });
      
        d3.select(".radar"+ scope.$id).remove();
        var dataIdDiv = divchart.append('div').attr("class", "radar" + scope.$id)
                                              .attr("style", 'border:1px solid #ddd');

        RadarChart.draw("radar" + scope.$id, rowvalues, dataIdDiv);
        //add legends from tableheader
        var legends = [];
        scope.tablebody.c3_data.forEach( function(item){
          legends.push(item[0]);
        });
      
        initiateLegend(legends, "radar" + scope.$id);
      });  //TableService
    }; //end of scope.render

    scope.$watch('valuesO', function(newVals, oldVals) {
        return scope.render();
    }, true);
   

    var cfg;
    var RadarChart = {
      draw: function(id, d, dataIdDiv){
        cfg = {
         radius: 5,
         w: 500,
         h: 500,
         factor: 1,
         factorLegend: 0.85,
         levels: 3,
         maxValue: 0,
         radians: 2 * Math.PI,
         opacityArea: 0.5,
         ToRight: 5,
         TranslateX: 80,
         TranslateY: 80,
         ExtraWidthX: 100,
         ExtraWidthY:  0, /*100 original */
         color: d3.scale.category10()
        };
     
      cfg.maxValue = Math.max(cfg.maxValue, 
      d3.max(d, function(i){
        return d3.max(i.map(
          function(o){return Number(o.value);}));
        })
      );
   
      var allAxis = (d[0].map(function(i, j){return i.axis;}));
      var total = allAxis.length;
      var radius = cfg.factor*Math.min(cfg.w/2, cfg.h/2);
      
      d3.select(".rdchart." + id).selectAll('*').remove();
      var svg = d3.select(".rdchart." + id);
      if ( svg[0][0] === null) //first time
        svg = dataIdDiv.append("svg").attr("class", "rdchart " + id)
                                     .attr("height", h+200)
                                     .attr("width", w + 200);
      var g = svg
        .append("g")
        .attr("transform", "translate(" + cfg.TranslateX + "," + cfg.TranslateY + ")");
        
      var tooltip;
      //Text indicating at what % each level is
      for(var j=0; j<cfg.levels; j++){
        var levelFactor2 = cfg.factor*radius*((j+1)/cfg.levels);
        g.selectAll(".levels")
         .data([1]) //dummy data
         .enter()
         .append("svg:text")
         .attr("x", levelFactor2*(1-cfg.factor*Math.sin(0)))
         .attr("y", levelFactor2*(1-cfg.factor*Math.cos(0)))
         .attr("class", "legend")
         .style("font-family", "sans-serif")
         .style("font-size", "10px")
         .attr("transform", "translate(" + (cfg.w/2-levelFactor2 + cfg.ToRight) + ", " + (cfg.h/2-levelFactor2) + ")")
         .attr("fill", "#737373")
         .text(d3.format(".3g")((j+1)*cfg.maxValue/cfg.levels));
      }

      function getPosition(i, range, factor, func){
        factor = typeof factor !== 'undefined' ? factor : 1;
        return range * (1 - factor * func(i * cfg.radians / total));
      }
      function getHorizontalPosition(i, range, factor){
        return getPosition(i, range, factor, Math.sin);
      }
      function getVerticalPosition(i, range, factor){
        return getPosition(i, range, factor, Math.cos);
      }
      // //levels && axises
      var levelFactors = d3.range(0, cfg.levels).map(function(level) {
        return radius * ((level + 1) / cfg.levels);
      });

      var levelGroups =  g.selectAll(".levels").data(levelFactors);
      levelGroups.enter().append('g');
      levelGroups.exit().remove();
      levelGroups.attr('class', function(d, i) {
        return 'level-group level-group-' + i;
      });

      var levelLine = levelGroups.selectAll('.level').data(function(levelFactor) {
        return d3.range(0, total).map(function() { return levelFactor; });
      });

      levelLine.enter().append('line');
      levelLine.exit().remove();

      levelLine
        .attr('class', 'level')
        .attr('x1', function(levelFactor, i){ return getHorizontalPosition(i, levelFactor); })
        .attr('y1', function(levelFactor, i){ return getVerticalPosition(i, levelFactor); })
        .attr('x2', function(levelFactor, i){ return getHorizontalPosition(i+1, levelFactor); })
        .attr('y2', function(levelFactor, i){ return getVerticalPosition(i+1, levelFactor); })
        .style("stroke", "grey")
        .style("stroke-opacity", "0.75")
        .style("stroke-width", "0.3px")
        .attr('transform', function(levelFactor) {
          return 'translate(' + (cfg.w/2-levelFactor) + ', ' + (cfg.h/2-levelFactor) + ')';
        });

      var series = 0;
      var axis = g.selectAll(".axis")
            .data(allAxis)
            .enter()
            .append("g")
            .attr("class", "axis");
      axis.append("line")
          .attr("x1", cfg.w/2)
          .attr("y1", cfg.h/2)
          .attr("x2", function(d, i){return cfg.w/2*(1-cfg.factor*Math.sin(i*cfg.radians/total));})
          .attr("y2", function(d, i){return cfg.h/2*(1-cfg.factor*Math.cos(i*cfg.radians/total));})
          .attr("class", "line")
          .style("stroke", "grey")
          .style("stroke-width", "1px");
      axis.append("text")
          .attr("class", "legend")
          .text(function(d){return d;})
          .style("font-family", "sans-serif")
          .style("font-size", "12px")
          .attr("text-anchor", "middle")
          .attr("dy", "1.5em")
          .attr("transform", function(d, i){return "translate(0, -8)";})
          .attr("x", function(d, i){return cfg.w/2*(1-cfg.factorLegend*Math.sin(i*cfg.radians/total))-60*Math.sin(i*cfg.radians/total);})
          .attr("y", function(d, i){return cfg.h/2*(1-Math.cos(i*cfg.radians/total))-20*Math.cos(i*cfg.radians/total);});
        
      var dataValues =[];
      d.forEach(function(y, x){
        dataValues = [];
        g.selectAll(".nodes")
        .data(y, function(j, i){
          dataValues.push([
          cfg.w/2*(1-(parseFloat(Math.max(j.value, 0))/cfg.maxValue)*cfg.factor*Math.sin(i*cfg.radians/total)), 
          cfg.h/2*(1-(parseFloat(Math.max(j.value, 0))/cfg.maxValue)*cfg.factor*Math.cos(i*cfg.radians/total))
          ]);
        });
        dataValues.push(dataValues[0]);
        g.selectAll(".area")
               .data([dataValues])
               .enter()
               .append("polygon")
               .attr("class", "radar-chart-serie"+series + " " + id)
               .style("stroke-width", "2px")
               .style("stroke", cfg.color(series))
               .attr("points",function(d) {
                 var str="";
                 for(var pti=0;pti<d.length;pti++){
                   str=str+d[pti][0]+","+d[pti][1]+" ";
                 }
                 return str;
                })
               .style("fill", function(j, i){return cfg.color(series);})
               .style("fill-opacity", cfg.opacityArea)
               .on('mouseover', function (d){
                        var z = "polygon."+d3.select(this).attr("class");
                        g.selectAll("polygon")
                         .transition(200)
                         .style("fill-opacity", 0.1); 
                        g.selectAll(z)
                         .transition(200)
                         .style("fill-opacity", 0.7);
                        })
               .on('mouseout', function(){
                        g.selectAll("polygon")
                         .transition(200)
                         .style("fill-opacity", cfg.opacityArea);
               });
        series++;
      });
      series=0;
      d.forEach(function(y, x){
        g.selectAll(".nodes")
        .data(y).enter()
        .append("svg:circle")
        .attr("class", "radar-chart-serie"+series + " " + id)
        .attr('r', cfg.radius)
        .attr("alt", function(j){return Math.max(j.value, 0);})
        .attr("cx", function(j, i){
          dataValues.push([
          cfg.w/2*(1-(parseFloat(Math.max(j.value, 0))/cfg.maxValue)*cfg.factor*Math.sin(i*cfg.radians/total)), 
          cfg.h/2*(1-(parseFloat(Math.max(j.value, 0))/cfg.maxValue)*cfg.factor*Math.cos(i*cfg.radians/total))
        ]);
        return cfg.w/2*(1-(Math.max(j.value, 0)/cfg.maxValue)*cfg.factor*Math.sin(i*cfg.radians/total));
        })
        .attr("cy", function(j, i){
          return cfg.h/2*(1-(Math.max(j.value, 0)/cfg.maxValue)*cfg.factor*Math.cos(i*cfg.radians/total));
        })
        .attr("data-id", function(j){return j.axis;})
        .style("fill", cfg.color(series)).style("fill-opacity", 0.9)
        .on('mouseover', function (d){
              var newX =  parseFloat(d3.select(this).attr('cx')) - 10;
              var newY =  parseFloat(d3.select(this).attr('cy')) - 5;
              tooltip
                .attr('x', newX)
                .attr('y', newY)
                .text(d.value.toString())
                .transition(200)
                .style('opacity', 1);
                
              var z = "polygon."+d3.select(this).attr("class");
              g.selectAll("polygon")
                .transition(200)
                .style("fill-opacity", 0.1); 
              g.selectAll(z)
                .transition(200)
                .style("fill-opacity", 0.7);
              })
        .on('mouseout', function(){
              tooltip
                .transition(200)
                .style('opacity', 0);
              g.selectAll("polygon")
                .transition(200)
                .style("fill-opacity", cfg.opacityArea);
              })
        .append("svg:title")
        .text(function(j){return Math.max(j.value, 0);});
        series++;
      });

      //Tooltip
      tooltip = g.append('text')
             .style('opacity', 0)
             .style('font-family', 'sans-serif')
             .style('font-size', '13px');
      }
    }; //end of RadarChart
   
    function initiateLegend (LegendOptions, id){

      var svg = d3.select("." + id) //div
        .selectAll('svg')
        .append('svg')
        .attr("width", w+300)
        .attr("height", h);

        //Initiate Legend 
      var legend = svg.append("g")
        .attr("class", "legend")
        .attr("height", 100)
        .attr("width", 200)
        .attr('transform', 'translate(50,50)');
        
          //Create colour squares
      legend.selectAll('rect')
        .data(LegendOptions)
        .enter()
        .append("rect")
        .attr("x", w - 65)
        .attr("y", function(d, i){ return i * 20;})
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", function(d, i){ return colorscale(i);})
        .attr("rid", function(d){return d;})
        .on('mouseover', function (d, i){
                d3.select("." + id).selectAll("svg").selectAll("polygon")
                 .transition(200)
                 .style("fill-opacity", 0.1); 
                d3.select(".radar-chart-serie"+i + "." + id)
                 .transition(200)
                 .style("fill-opacity", 0.7);
         })
        .on('mouseout', function (d, i){
              d3.select("." + id).selectAll("svg").selectAll("polygon")
                     .transition(200)
                     .style("fill-opacity", cfg.opacityArea);
         });
            
          //Create text next to squares
      legend.selectAll('text')
        .data(LegendOptions)
        .enter()
        .append("text")
        .attr("x", w - 52)
        .attr("y", function(d, i){ return i * 20 + 9;})
        .attr("font-size", "11px")
        .attr("fill", "#737373")
        .text(function(d) { return d; })
        .on('mouseover', function (d, i){
                d3.select("." + id).selectAll("svg").selectAll("polygon")
                 .transition(200)
                 .style("fill-opacity", 0.1); 
                d3.select(".radar-chart-serie"+i + "." + id)
                 .transition(200)
                 .style("fill-opacity", 0.7);
         })
        .on('mouseout', function (d, i){
              d3.select("." + id).selectAll("svg").selectAll("polygon")
                     .transition(200)
                     .style("fill-opacity", cfg.opacityArea);
         });
      }//end of initiateLegend
    }; //end of link

    return {
      restrict: 'EA',
      require: '?^mmsView',
       scope: {
        plot: '<'
      },
      link: mmsRadarChartLink
    }; //return
 }



