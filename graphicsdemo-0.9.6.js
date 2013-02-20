/*
 * graphicsdemo (aka 64kdemo)
 * Original author: @ashesid
 * Last updated: 16 Feb 2013
 * Desc: Provides basic routines for creating random textures on a canvas
 *       as well as an underlying graphics object that can be used independantly
 *       for custom graphics and animations.
 */

// the semi-colon before the function invocation is a safety
// net against concatenated scripts and/or other plugins
// that are not closed properly.

;(function ( $, window, document, undefined ) {

    // undefined is used here as the undefined global
    // variable in ECMAScript 3 and is mutable (i.e. it can
    // be changed by someone else). undefined isn't really
    // being passed in so we can ensure that its value is
    // truly undefined. In ES5, undefined can no longer be
    // modified.

    // window and document are passed through as local
    // variables rather than as globals, because this (slightly)
    // quickens the resolution process and can be more
    // efficiently minified (especially when both are
    // regularly referenced in your plugin).
    
    // Create the defaults once
    var pluginName = "graphicsdemo",
        defaults = {
            version: "0.9.6",
            screen: 0,
            graininess: 1,
            blocky: false,
            scale: 1,
            wrapTexture: false,
            colourMapFunction: null,
            steps: null,
            fps:24
        };

    // The actual plugin constructor
    function Plugin( element, options ) {
        this.element = element;
        // jQuery has an extend method that merges the
        // contents of two or more objects, storing the
        // result in the first object. The first object
        // is generally empty because we don't want to alter
        // the default options for future instances of the plugin
        this.options = $.extend( {}, defaults, options) ;
        this._defaults = defaults;
        this._name = pluginName;

        var start = new Date();

        this.init();

        var end = new Date();
        this.timeTaken = end - start;
    }

    // Initialisation and generate the random texture
    Plugin.prototype.init = function () {
        // Create a new graphics object for the canvas and a screen 0
        this.graphics = new GraphicsDemo.Graphics(this.element);

        // Execute each step passed in (note can handle looping)
        if (this.options.steps != null){
            GraphicsDemo.StepsExecution.workingParams[GraphicsDemo.StepsExecution.processCount] = { stepNo: 0, graphics: this.graphics, steps: this.options.steps, defaults: defaults, fps:this.options.fps };
            GraphicsDemo.StepsExecution.executeSteps(GraphicsDemo.StepsExecution.processCount++);
        } else {
            // No steps so we assume we're just rendering a texture
            this.graphics.createScreen(0);
            GraphicsDemo.Step.generateTexture(this.graphics, this.graphics.Screen[0], this.options);
            GraphicsDemo.Step.renderScreen(this.graphics, this.graphics.Screen[0], this.options);
        }
    };
    
    // A really lightweight plugin wrapper around the constructor,  
    // preventing against multiple instantiations 
    $.fn[pluginName] = function ( options ) { 
        var graphicsObjects = [];
        
        this.each(function () { 
            var graphics = $.data(this, 'plugin_' + pluginName);
            if (!graphics) { 
                graphics = new Plugin( this, options );
                $.data(this, 'plugin_' + pluginName, graphics); 
            }
            graphicsObjects.push(graphics);
        });
    
        // If there is only one object then return that, other return an array of graphics objects
        return graphicsObjects.length == 1 ? graphicsObjects[0] : graphicsObjects;
    }
    
    /*
     * Internal functions
     */
     
    // Regenerate
    Plugin.prototype.regenerate = function(options){
        if (options != null){
            this.options = $.extend( {}, defaults, options) ;
            this._defaults = defaults;
            this._name = pluginName;
        }

        var start = new Date();

        this.graphics.clear();

        if (this.options.steps != null){
            // Execute each step passed in (note can handle looping)
            // TODO: This needs to kill any previously running animations first!
            GraphicsDemo.StepsExecution.workingParams[GraphicsDemo.StepsExecution.processCount] = { stepNo: 0, graphics: this.graphics, steps: this.options.steps, defaults: defaults, fps:this.options.fps };
            GraphicsDemo.StepsExecution.executeSteps(GraphicsDemo.StepsExecution.processCount++);
        } else {
            // No steps so we assume we're just rendering a texture
            this.graphics.createScreen(0);
            GraphicsDemo.Step.generateTexture(this.graphics, this.graphics.Screen[0], this.options);
            GraphicsDemo.Step.renderScreen(this.graphics, this.graphics.Screen[0], this.options);
        }

        // Work out time taken in ms
        var end = new Date();
        this.timeTaken = end - start;
    }

})( jQuery, window, document );

// Object namespace
var GraphicsDemo = {};

/*
 * Steps execution
 */
GraphicsDemo.StepsExecution = {
    processCount : 0,    // Track the number of processes running
    workingParams : [],  // An array of workingParams for different threads
    
    // Method for executing steps, can loop
    executeSteps : function (processNo) {
        var wParams = this.workingParams[processNo];
        var stepNo = wParams.stepNo;
        while(stepNo < wParams.steps.length){
            var value = wParams.steps[stepNo];
            var params = $.extend( {}, wParams.defaults, value.params);
            var screen = wParams.graphics.Screen[params.screen];
            if (screen == null){
                wParams.graphics.createScreen(params.screen);
                screen = wParams.graphics.Screen[params.screen];
            }
            
            if (value.step == GraphicsDemo.Step.goTo){
                GraphicsDemo.StepsExecution.workingParams[processNo].stepNo = value.params.step;
                setTimeout('GraphicsDemo.StepsExecution.executeSteps(' + processNo + ')', Math.round(1000 / this.workingParams[processNo].fps));
                return;
            } else {
                value.step(wParams.graphics, screen, params);
                stepNo++;
            }
        }
    }
};

/*
 * Graphics object
 */
GraphicsDemo.Graphics = function(canvas){
    this.canvas = canvas;
    this.canvasContext = this.canvas.getContext("2d");
    
    // Array of screens
    this.Screen = [];
    
    // Creates a new screen
    this.createScreen = function(i){
        this.Screen[i] = new GraphicsDemo.Screen(this.canvasContext.createImageData(this.canvas.width, this.canvas.height));
    };
    
    // Render screen
    this.renderScreen = function(i){
        this.canvasContext.putImageData(this.Screen[i].screenData, 0, 0);
    };

    // Clear canvas and remove any screens
    this.clear = function(){
        this.canvasContext.clearRect(0 , 0, this.canvas.width, this.canvas.height);
        this.Screen = [];
    }
}

/*
 * Screen object
 */
GraphicsDemo.Screen = function(screenData){
    this.screenData = screenData;
    this.data = screenData.data;
    
    this.width = screenData.width;
    this.height = screenData.height;

    // set pixel
    this.setPixel = function(x, y, col) {
        var index = (x + y * this.width) << 2;
        this.data[index] = col.r;
        this.data[++index] = col.g;
        this.data[++index] = col.b;
        this.data[++index] = col.a;
    };

    // get pixel
    this.getPixel = function(x, y){
        var index = (x + y * this.width) << 2;
        return { r : this.data[index], g : this.data[++index], b : this.data[++index], a: this.data[++index] };
    };
    
    // Clears the screen
    this.clear = function(canvasContext){
        for(var y = 0; y < this.height; y++){
            for(var x = 0; x < this.width; x++){
                this.setPixel(x, y, { r:0, g:0, b:0, a:0 });
            }
        }
    };
    
    // Applies a colour mapping
    this.applyColourMapping = function(colourMapFunction){
        for(var y = 0; y < this.height; y++){
            for(var x = 0; x < this.width; x++){
                this.setPixel(x, y, colourMapFunction(this.getPixel(x, y)));
            }
        }
    };
}

/*
 * Colour object
 */
GraphicsDemo.Colour = {
    // Returns a random colour
    random : function(){
        return { 
		    r : (Math.random() * 256) >> 0,   // Math.floor(Math.random() * 256)
            g : (Math.random() * 256) >> 0, 
            b : (Math.random() * 256) >> 0, 
            a : 255
        };
    },
    
    // Averages the current colour with another
    averageWith : function(col1, col2){
        return {
            r : ((col1.r + col2.r) >> 1) >> 0,   // Math.floor((col1.r + col2.r) / 2)
            g : ((col1.g + col2.g) >> 1) >> 0, 
            b : ((col1.b + col2.b) >> 1) >> 0, 
            a : ((col1.a + col2.a) >> 1) >> 0
        };
    },
    
    // return a colour that has deviated from the current colour by up to amount (but not in alpha channel)
    deviateUpTo : function(col, amount){
        var tempCol = {
            r : col.r + Math.floor(Math.random() * amount * 2 + 0.75) - amount,
            g : col.g + Math.floor(Math.random() * amount * 2 + 0.75) - amount,
            b : col.b + Math.floor(Math.random() * amount * 2 + 0.75) - amount,
            a : col.a
        };
    
        if (tempCol.r < 0) { tempCol.r = 0; } else if (tempCol.r > 255) { tempCol.r = 255; }
        if (tempCol.g < 0) { tempCol.g = 0; } else if (tempCol.g > 255) { tempCol.g = 255; }
        if (tempCol.b < 0) { tempCol.b = 0; } else if (tempCol.b > 255) { tempCol.b = 255; }
    
        return tempCol;
    }
};

/* 
 * Colour mappings 
 */
GraphicsDemo.ColourMap = { 
    // Empty object for storing colour tables
    colourTable: {},

    // Black and white
    blackAndWhite : function(col){
        return { r : col.r, g : col.r, b : col.r, a : col.a };
    },

    // Red
    red : function(col){
        return { r : col.r, g : 0, b : 0, a : col.a };
    },

    // Green
    green : function(col){
        return { r : 0, g : col.g, b : 0, a : col.a };
    },

    // Blue
    blue : function(col){
        return { r : 0, g : 0, b : col.b, a : col.a };
    },

    // Clouds
    clouds : function(col){
        return { 
            r : col.r, 
            g : col.r, 
            b : 255, 
            a : col.a 
        };
    },

    // Marble (bright green)
    marble1 : function(col){
        if (GraphicsDemo.ColourMap.colourTable.marble1 == null){
            var colmap = [];
            colmap[0] = { r:240, g:255, b:240, a:255};
            colmap[8] = { r:216, g:233, b:209, a:255};
            colmap[100] = { r:64, g:128, b:64, a:255 };
            colmap[128] = { r:8, g:16, b:8, a:255 };
            colmap[255] = { r:8, g:16, b:8, a:255 };
            GraphicsDemo.ColourMap.colourTable.marble1 = GraphicsDemo.ColourMap.buildColourMap(colmap);
        }

        var colNo = col.r > 128 ? 255 - col.r : col.r;  // Inverse colours about halfway (128) axis
        return GraphicsDemo.ColourMap.colourTable.marble1[colNo];
    },
  
    // Marble (cream with green viens)
    marble2 : function(col){
        var colNo = col.r > 128 ? 255 - col.r : col.r;  // Inverse colours about halfway (128) axis
        var p = colNo > 100 ? (colNo - 100) / 28 : 0;

        return { 
            r : 254 - (colNo >> 1) - (121 * p),
            g : 239 - (colNo >> 1) - (82 * p),
            b : 218 - (colNo >> 1) - (113 * p),
            a : col.a 
        };
    },
  
    // Marble (blue and white)
    marble3 : function(col){
        if (GraphicsDemo.ColourMap.colourTable.marble3 == null){
            var colmap = [];
            colmap[0] = { r:255, g:255, b:255, a:255};
            colmap[64] = { r:138, g:166, b:188, a:255 };
            colmap[106] = { r:81, g:124, b:163, a:255 };
            colmap[128] = { r:12, g:57, b:96, a:255 };
            colmap[255] = { r:12, g:57, b:96, a:255 };
            GraphicsDemo.ColourMap.colourTable.marble3 = GraphicsDemo.ColourMap.buildColourMap(colmap);
        }

        var colNo = col.r > 128 ? 255 - col.r : col.r;  // Inverse colours about halfway (128) axis
        return GraphicsDemo.ColourMap.colourTable.marble3[colNo];
    },
  
    // Marble (blue and white)
    marble4 : function(col){
        if (GraphicsDemo.ColourMap.colourTable.marble4 == null){
            var colmap = [];
            colmap[0] = { r:254, g:255, b:242, a:255 };
            colmap[100] = { r:255, g:147, b:98, a:255 };
            colmap[128] = { r:192, g:35, b:0, a:255};
            colmap[255] = { r:255, g:255, b:255, a:255};
            GraphicsDemo.ColourMap.colourTable.marble4 = GraphicsDemo.ColourMap.buildColourMap(colmap);
        }

        var colNo = col.r > 128 ? 255 - col.r : col.r;  // Inverse colours about halfway (128) axis
        return GraphicsDemo.ColourMap.colourTable.marble4[colNo];
    },
  
    // Fire (black to red to orange to yellow)
    fire : function(col){
        if (GraphicsDemo.ColourMap.colourTable.fire == null){
            var colmap = [];
            colmap[0] = { r:0, g:0, b:0, a:255 };
            colmap[100] = { r:255, g:0, b:0, a:255 };
            colmap[172] = { r:255, g:80, b:0, a:255 };
            colmap[255] = { r:255, g:255, b:0, a:255 };
            GraphicsDemo.ColourMap.colourTable.fire = GraphicsDemo.ColourMap.buildColourMap(colmap);
        }

        return GraphicsDemo.ColourMap.colourTable.fire[col.r];
    },
  
    /* Function to build a colour map */
    buildColourMap: function(colours){
        if (colours[0] == null || colours[255] == null){
            alert('Error, colours 0 and 255 must be defined!');
            return;
        }

        var lastColourPoint = 0;
        for(var index = lastColourPoint + 1; index < 256; index++){
            if (colours[index] != null){
                this.interpolateColours(colours, lastColourPoint, index);
                lastColourPoint = index;
            }
        }

        return colours;
    },

    /* Internal function to interpolate colours */
    interpolateColours: function(colours, start, end){
        var dif = end - start;
        var rDif = (colours[start].r - colours[end].r);
        var gDif = (colours[start].g - colours[end].g);
        var bDif = (colours[start].b - colours[end].b);

        for(var i = start + 1; i < end; i++){
            var p = (i - start) / dif;
            colours[i] = { 
                r: (colours[start].r - rDif * p) >> 0,
                g: (colours[start].g - gDif * p) >> 0, 
                b: (colours[start].b - bDif * p) >> 0, 
                a: 255 
            };
        }
    }
}

/*
 * Step object
 */
GraphicsDemo.Step = {
    // Renders a screen
    renderScreen : function(graphics, screen, params){
        graphics.renderScreen(params.screen);
    },
    
    // Goto
    goTo : function(){
    },

    // Scrolls a screen by the amount given
    scrollBy : function(graphics, screen, options){
        var bytesPerLine = screen.width << 2;
        var bytesPerRow = screen.height << 2;
        
        // scroll by x amount
        if (options.xAmount != 0){
            var currentByte = 0;
            var xAmountx4 = options.xAmount << 2;       
            var data = screen.screenData.data;
            for (var y = 0; y < screen.height; y++){
                var lineBuffer = [];
                var currentXByte = 0;
                for (var x = 0; x < screen.width; x++){
                    // Calculate line wrap amount
                    var lineWrap = (x - options.xAmount >= screen.width)
                        ? -bytesPerLine
                        : (x - options.xAmount < 0)
                            ? bytesPerLine
                            : 0;

                    var offsetIndex = currentXByte - xAmountx4 + lineWrap;

                    // Shift current pixel to line buffer
                    lineBuffer[currentXByte] = data[currentByte];
                    lineBuffer[currentXByte + 1] = data[currentByte + 1];
                    lineBuffer[currentXByte + 2] = data[currentByte + 2];
                    lineBuffer[currentXByte + 3] = data[currentByte + 3];

                    // Write over it by pixel at -xAmount (if value at -xAmount in line buffer then use that instead)
                    if (lineBuffer[offsetIndex] != null){
                        data[currentByte] = lineBuffer[offsetIndex];
                        data[currentByte + 1] = lineBuffer[++offsetIndex];
                        data[currentByte + 2] = lineBuffer[++offsetIndex];
                        data[currentByte + 3] = lineBuffer[++offsetIndex];
                    } else {
                        offsetIndex = currentByte - xAmountx4 + lineWrap;
                        data[currentByte] = data[offsetIndex];
                        data[currentByte + 1] = data[++offsetIndex];
                        data[currentByte + 2] = data[++offsetIndex];
                        data[currentByte + 3] = data[++offsetIndex];
                    }
                    
                    currentXByte = currentXByte + 4;
                    currentByte = currentByte + 4;
                }
            }
        }
        
        // scroll by y amount
        if (options.yAmount != 0){
            var yAmountx4 = options.yAmount << 2;
            var data = screen.screenData.data;
            for (var x = 0; x < screen.width; x++){
                var rowBuffer = [];
                var currentYByte = 0;
                var currentByte = x << 2;
                for (var y = 0; y < screen.width; y++){
                    // Calculate line wrap amount
                    var rowWrap = (y - options.yAmount >= screen.height)
                        ? -bytesPerRow
                        : (y - options.yAmount < 0)
                          ? bytesPerRow
                          : 0;
                          
                    var rowWrap2 = (y - options.yAmount >= screen.height)
                        ? -(screen.width * (screen.height - 1) << 2)
                        : (y - options.yAmount < 0)
                          ? (screen.width * (screen.height - 1) << 2)
                          : 0;

                    var offsetIndex = currentYByte - yAmountx4 + rowWrap;
                          
                    // Shift current pixel to line buffer
                    rowBuffer[currentYByte] = data[currentByte];
                    rowBuffer[currentYByte + 1] = data[currentByte + 1];
                    rowBuffer[currentYByte + 2] = data[currentByte + 2];
                    rowBuffer[currentYByte + 3] = data[currentByte + 3];
                              
                    // Write over it by pixel at -yAmount (if value at -yAmount in row buffer then use that instead)
                    if (rowBuffer[offsetIndex] != null){
                        data[currentByte] = rowBuffer[offsetIndex];
                        data[currentByte + 1] = rowBuffer[++offsetIndex];
                        data[currentByte + 2] = rowBuffer[++offsetIndex];
                        data[currentByte + 3] = rowBuffer[++offsetIndex];
                    } else {
                        offsetIndex = currentByte - (options.yAmount * bytesPerLine) + rowWrap2;
                        data[currentByte] = data[offsetIndex];
                        data[currentByte + 1] = data[++offsetIndex];
                        data[currentByte + 2] = data[++offsetIndex];
                        data[currentByte + 3] = data[++offsetIndex];
                    }
                        
                    currentYByte = currentYByte + 4;
                    currentByte = currentByte + bytesPerLine;
                }
            }
        }
    },
    
    // Apply colourmap
    applyColourMap : function(graphics, screen, options){
        screen.applyColourMapping(options.colourMapFunction);
    },
    
    // Average (blur) a screen
    average : function(graphics, screen, options){
        var data = screen.screenData.data;
		var col, c1O, c2O, c3O, c4O, c5O;
        
        for (var y = 0; y < screen.height; y++){
            for(var x = 0; x < screen.width; x++){
                c1O = (x + (y == 0 ? screen.height - 1 : y - 1) * screen.width) << 2;
                c2O = ((x == 0 ? screen.width - 1 : x - 1) + y * screen.width) << 2;
                c3O = (x + y * screen.width) << 2;
                c4O = ((x == screen.width - 1 ? 0 : x + 1) + y * screen.width) << 2;
                c5O = (x + (y == screen.height - 1 ? 0 : y + 1) * screen.width) << 2;
                
                col = {
                    r : (data[c1O] + data[c2O] + data[c3O] + data[c4O] + data[c5O]) / 5,
                    g : (data[++c1O] + data[++c2O] + data[++c3O] + data[++c4O] + data[++c5O]) / 5,
                    b : (data[++c1O] + data[++c2O] + data[++c3O] + data[++c4O] + data[++c5O]) / 5,
                    a : 255
                };
                
                screen.setPixel(x, y, col);
            }
        }
    },
    
    // Combine two screens with the option of applying a filter
    combine : function(graphics, screen, options){
        var source1 = graphics.Screen[options.source1];
        var source2 = graphics.Screen[options.source2];
        var dest = graphics.Screen[options.dest];
        
        if (dest == null){  // Ensure dest screen exists
            graphics.createScreen(options.destScreen);
            dest = graphics.Screen[options.destScreen];
        }
        
        for(var y = 0; y < dest.height; y++){
            for(var x = 0; x < dest.width; x++){
                var col1 = source1.getPixel(x, y);
                var col2 = source2.getPixel(x, y);
                dest.setPixel(x, y, GraphicsDemo.Colour.averageWith(col1, col2));
            }
        }
    },
    
    // Generate random texture
    generateTexture : function(graphics, screen, options){
        // Seed the four corners with random colours
        var c1 = GraphicsDemo.Colour.random();
        var c2 = options.wrapTexture ? c1 : GraphicsDemo.Colour.random();
        var c3 = options.wrapTexture ? c1 : GraphicsDemo.Colour.random();
        var c4 = options.wrapTexture ? c1 : GraphicsDemo.Colour.random();
        screen.setPixel(0, 0, c1);
        screen.setPixel(screen.width - 1, 0, c2);
        screen.setPixel(0, screen.height - 1, c3);
        screen.setPixel(screen.width - 1, screen.height - 1, c4);

        // Recursively fill in the gaps
        GraphicsDemo.Step.recursivelyGenerateTexture(screen, options, 0, 0, screen.width - 1, screen.height - 1, c1, c2, c3, c4);

        // Apply colour map (if any)
        if (options.colourMapFunction != null){
            screen.applyColourMapping(options.colourMapFunction);
        }
    },

    // Recursively generate the texture.
    // (x1, y1) are top left corner of square.
    // (x2, y2) are bottom right corner of square.
    // c1-c4 are the colours for the corners, TopL, TopR, BotL, BotR.
    recursivelyGenerateTexture : function(screen, options, x1, y1, x2, y2, c1, c2, c3, c4){
        var horizontalDiff = x2 - x1;
        var verticalDiff = y2 - y1;
        if (horizontalDiff == 1 && verticalDiff == 1){
            return;
        }

        // Calculate mid points
        var midx = (horizontalDiff >> 1) + x1;
        var midy = (verticalDiff >> 1) + y1;
        var horizontalVariation = (horizontalDiff + options.graininess) / options.scale;
        var verticalVariation = (verticalDiff + options.graininess) / options.scale;

        // Divide our square into four smaller squares and put pixels on the corners where that currently have no colour

        // Top middle pixel
        var tmC = screen.getPixel(midx, y1);
        if (tmC.a == 0 || options.blocky){
            tmC = GraphicsDemo.Colour.deviateUpTo(GraphicsDemo.Colour.averageWith(c1, c2), horizontalVariation);
        }
        if (horizontalDiff > 1){
            screen.setPixel(midx, y1, tmC);
        }

        // Left middle pixel
        var lmC = screen.getPixel(x1, midy);
        if (lmC.a == 0 || options.blocky){
            lmC = GraphicsDemo.Colour.deviateUpTo(GraphicsDemo.Colour.averageWith(c1, c3), verticalVariation);
        }
        if (verticalDiff > 1){
            screen.setPixel(x1, midy, lmC);
        }
      
        // Right middle pixel
        var rmC = (options.wrapTexture && x2 == screen.width - 1)
          ? GraphicsDemo.Colour.deviateUpTo(screen.getPixel(0, midy), options.graininess / options.scale)
          : GraphicsDemo.Colour.deviateUpTo(GraphicsDemo.Colour.averageWith(c2, c4), verticalVariation);
        if (verticalDiff > 1){
            screen.setPixel(x2, midy, rmC);
        }

        // Bottom middle pixel
        var bmC = (options.wrapTexture && y2 == screen.height - 1)
          ? GraphicsDemo.Colour.deviateUpTo(screen.getPixel(midx, 0), options.graininess / options.scale)
          : GraphicsDemo.Colour.deviateUpTo(GraphicsDemo.Colour.averageWith(c3, c4), horizontalVariation);
        if (horizontalDiff > 1){
            screen.setPixel(midx, y2, bmC);
        }
      
        // Center pixel
        var cC = {  // Average the four pixels to get center one
            r: ((tmC.r + bmC.r + lmC.r + rmC.r) >> 2) >> 0,
            g: ((tmC.g + bmC.g + lmC.g + rmC.g) >> 2) >> 0,
            b: ((tmC.b + bmC.b + lmC.b + rmC.b) >> 2) >> 0,
            a: ((tmC.a + bmC.a + lmC.a + rmC.a) >> 2) >> 0
        }
        /* Possible bias here with horizontalDiff? */
        cC = GraphicsDemo.Colour.deviateUpTo(cC, horizontalVariation);

        if (horizontalDiff > 1 && verticalDiff > 1){
            screen.setPixel(midx, midy, cC);
        }

        // Fill again, for the four new squares
        if (midx - x1 > 1 || midy - y1 > 1){
            GraphicsDemo.Step.recursivelyGenerateTexture(screen, options, x1, y1, midx, midy, c1, tmC, lmC, cC);  // Top left
        }
        if (x2 - midx > 1 || midy - y1 > 1){
            GraphicsDemo.Step.recursivelyGenerateTexture(screen, options, midx, y1, x2, midy, tmC, c2, cC, rmC);  // Top right
        }
        if (midx - x1 > 1 || y2 - midy > 1){
            GraphicsDemo.Step.recursivelyGenerateTexture(screen, options, x1, midy, midx, y2, lmC, cC, c3, bmC);  // Bottom left
        }
        if (x2 - midx > 1 || y2 - midy > 1){
            GraphicsDemo.Step.recursivelyGenerateTexture(screen, options, midx, midy, x2, y2, cC, rmC, bmC, c4);  // Bottom right
        }
    }
};

/*
 * Masks
 */
GraphicsDemo.Mask = {
    // Apply a vertical mask to the screen (pos = 0, 1, 2)
    vertical : function(graphics, screen, options){
        for (var y = 0; y < screen.height; y++){
            for(var x = 0; x < screen.width; x++){
                var c1 = screen.getPixel(x, y);
                
                var p1 = y / (screen.height - 1);
                if (options.pos == 0){
                } else if (options.pos == 1){
                    p1 = 1 - p1;
                } else if (options.pos == 2){
                    p1 = 1 - p1 * 2;
                    if (p1 < 0){
                        p1 = -p1;
                    }
                }
                var col = {
                    r : (c1.r > options.bgCol.r) ? c1.r - ((c1.r - options.bgCol.r) * p1) : c1.r + ((options.bgCol.r - c1.r) * p1),
                    g : (c1.g > options.bgCol.g) ? c1.g - ((c1.g - options.bgCol.g) * p1) : c1.g + ((options.bgCol.g - c1.g) * p1),
                    b : (c1.b > options.bgCol.b) ? c1.b - ((c1.b - options.bgCol.b) * p1) : c1.b + ((options.bgCol.b - c1.b) * p1),
                    a : 255
                };
                
                screen.setPixel(x, y, col);
            }
        }
    },
    
    // Apply a horizontal mask to the screen (pos = 0, 1, 2)
    horizontal : function(graphics, screen, options){
        for (var y = 0; y < screen.height; y++){
            for(var x = 0; x < screen.width; x++){
                var c1 = screen.getPixel(x, y);
                
                var p1 = x / (screen.width - 1);
                if (options.pos == 0){
                } else if (options.pos == 1){
                    p1 = 1 - p1;
                } else if (options.pos == 2){
                    p1 = 1 - p1 * 2;
                    if (p1 < 0){
                        p1 = -p1;
                    }
                }
                var col = {
                    r : (c1.r > options.bgCol.r) ? c1.r - ((c1.r - options.bgCol.r) * p1) : c1.r + ((options.bgCol.r - c1.r) * p1),
                    g : (c1.g > options.bgCol.g) ? c1.g - ((c1.g - options.bgCol.g) * p1) : c1.g + ((options.bgCol.g - c1.g) * p1),
                    b : (c1.b > options.bgCol.b) ? c1.b - ((c1.b - options.bgCol.b) * p1) : c1.b + ((options.bgCol.b - c1.b) * p1),
                    a : 255
                };
                
                screen.setPixel(x, y, col);
            }
        }
    },
    
    // Apply a circular mask to the screen
    circular : function(graphics, screen, options){
        var centerX = screen.width >> 1;
        var centerY = screen.height >> 1;
        var maxRadius = centerX < centerY ? centerX : centerY;
        
        for (var y = 0; y < screen.height; y++){
            for(var x = 0; x < screen.width; x++){
                var c1 = screen.getPixel(x, y);
                
                var dist = Math.sqrt((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY));
                
                var col;
                if (dist < maxRadius){
                    var p = dist / maxRadius;
                    col = {
                        r : c1.r + ((options.bgCol.r - c1.r) * p),
                        g : c1.g + ((options.bgCol.g - c1.g) * p),
                        b : c1.b + ((options.bgCol.b - c1.b) * p),
                        a : 255
                    };
                } else {
                    col = {
                        r : c1.r + (options.bgCol.r - c1.r),
                        g : c1.g + (options.bgCol.g - c1.g),
                        b : c1.b + (options.bgCol.b - c1.b),
                        a : 255
                    };
                }
                
                screen.setPixel(x, y, col);
            }
        }
    }
};