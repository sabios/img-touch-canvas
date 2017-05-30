/*
=================================
img-touch-canvas-fork - v0.2
http://github.com/sabios/img-touch-canvas

Original Project
http://github.com/rombdn/img-touch-canvas
=================================
*/


(function() {
    var root = this; //global object

    var ImgTouchCanvas = function(options) {
        if( !options || !options.canvas || !options.path) {
            throw 'ImgZoom constructor: missing arguments canvas or path';
        }

        this.options = options
        
        this.canvas         = options.canvas;
        this.canvas.width   = window.innerWidth;
        this.canvas.height  = window.innerHeight;
        if(this.options.percent) {
            this.canvas.height = window.innerHeight * this.options.percent
        }
        this.context        = this.canvas.getContext('2d');

        this.imgTexture = new Image();
        this.imgTexture.src = options.path;

        this.position = {
            x: 0,
            y: 0
        };
        this.scale = {
            x: 0.5,
            y: 0.5
        };

        this.lastZoomScale = null;
        this.lastX = null;
        this.lastY = null;

        this.mdown = false; //desktop drag
        this.scaleRatio = null

        this.events = {}

        this.init = false;
        this.checkRequestAnimationFrame();
        requestAnimationFrame(this.animate.bind(this));

        this.setEventListeners();
    };


    ImgTouchCanvas.prototype = {
        animate: function() {
            //set scale such as image cover all the canvas
            if(!this.init) {
                if(this.imgTexture.width) {
                    var scaleRatio = null;

                    var hRatio = this.canvas.width / this.imgTexture.width;
                    var vRatio = this.canvas.height / this.imgTexture.height;
                    scaleRatio = Math.min ( hRatio, vRatio );

                    this.scaleRatio = scaleRatio

                    this.scale.x = scaleRatio;
                    this.scale.y = scaleRatio;

                    this.position.x = (this.canvas.width - (this.scale.x * this.imgTexture.width)) / 2
                    this.position.y = (this.canvas.height - (this.scale.y * this.imgTexture.height)) / 2

                    this.init = true;
                }
            }

            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.context.drawImage(
                this.imgTexture, 
                this.position.x, this.position.y, 
                this.scale.x * this.imgTexture.width, 
                this.scale.y * this.imgTexture.height);

            requestAnimationFrame(this.animate.bind(this));
        },


        gesturePinchZoom: function(event) {
            var zoom = false;

            if( event.targetTouches.length >= 2 ) {
                var p1 = event.targetTouches[0];
                var p2 = event.targetTouches[1];
                var zoomScale = Math.sqrt(Math.pow(p2.pageX - p1.pageX, 2) + Math.pow(p2.pageY - p1.pageY, 2)); //euclidian distance

                if( this.lastZoomScale ) {
                    zoom = zoomScale - this.lastZoomScale;
                }

                this.lastZoomScale = zoomScale;
            }    

            return zoom;
        },

        doZoom: function(zoom) {
            if(!zoom) return;

            //new scale
            var currentScale = this.scale.x;
            var newScale = this.scale.x + zoom/100;
            

            //some helpers
            var deltaScale = newScale - currentScale;
            var currentWidth    = (this.imgTexture.width * this.scale.x);
            var currentHeight   = (this.imgTexture.height * this.scale.y);
            var deltaWidth  = this.imgTexture.width*deltaScale;
            var deltaHeight = this.imgTexture.height*deltaScale;


            //by default scale doesnt change position and only add/remove pixel to right and bottom
            //so we must move the image to the left to keep the image centered
            //ex: coefX and coefY = 0.5 when image is centered <=> move image to the left 0.5x pixels added to the right
            var canvasmiddleX = this.canvas.width / 2;
            var canvasmiddleY = this.canvas.height / 2;
            var xonmap = (-this.position.x) + canvasmiddleX;
            var yonmap = (-this.position.y) + canvasmiddleY;
            var coefX = -xonmap / (currentWidth);
            var coefY = -yonmap / (currentHeight);
            var newPosX = this.position.x + deltaWidth*coefX;
            var newPosY = this.position.y + deltaHeight*coefY;

            //edges cases
            var newWidth = currentWidth + deltaWidth;
            var newHeight = currentHeight + deltaHeight;
            
            if( newWidth < this.imgTexture.width *  this.scaleRatio) return;
            if(newPosX > 0 && newWidth + newPosX > this.canvas.width) {
                // vai pro topo
                newPosX = 0
            } else if(newPosX < 0 && newPosX + newWidth < this.canvas.width) {
                // vai pro fundo
                newPosX = this.canvas.width - newWidth
            } else if(newPosX + newWidth < this.canvas.width) {
                // vai pro centro
                newPosX = canvasmiddleX - (newWidth / 2)
            }this.events.mousewheel.bind(this)

            if(newHeight < this.imgTexture.height * this.scaleRatio) return;
            if(newPosY > 0 && newHeight + newPosY > this.canvas.height) {
                // vai pro topo
                newPosY = 0
            } else if(newPosY < 0 && newPosY + newHeight < this.canvas.height) {
                // vai pro fundo
                newPosY = this.canvas.height - newHeight
            } else if(newPosY + newHeight < this.canvas.height) {
                // vai pro centro
                newPosY = canvasmiddleY - (newHeight / 2)
            }


            //finally affectations
            this.scale.x    = newScale;
            this.scale.y    = newScale;
            this.position.x = newPosX;
            this.position.y = newPosY;
        },

        doMove: function(relativeX, relativeY) {
            if(this.lastX && this.lastY) {
              var deltaX = relativeX - this.lastX;
              var deltaY = relativeY - this.lastY;
              var currentWidth = (this.imgTexture.width * this.scale.x);
              var currentHeight = (this.imgTexture.height * this.scale.y);

              var newPosition = {
                  x: this.position.x + deltaX,
                  y: this.position.y + deltaY
              }

              if(!(newPosition.x > 0 || newPosition.x + currentWidth < this.canvas.width)) {
                  this.position.x = newPosition.x
              }

              if(!(newPosition.y > 0 || newPosition.y + currentHeight < this.canvas.height)) {
                  this.position.y = newPosition.y
              }
            }

            this.lastX = relativeX;
            this.lastY = relativeY;
        },

        destroy: function() {
            window.removeEventListener('resize', this.events.resize)
            this.canvas.removeEventListener('touchstart', this.events.touchstart)
            this.canvas.removeEventListener('touchmove', this.events.touchmove)
            window.removeEventListener('mousewheel', this.events.mousewheel)
            window.removeEventListener('DOMMouseScroll', this.events.mousewheel)
            window.removeEventListener('mousedown', this.events.mousedown)
            window.removeEventListener('mouseup', this.events.mouseup)
            window.removeEventListener('mousemove', this.events.mousemove)
        },
        

        setEventListeners: function() {

            this.events = {
                resize:  function(e) {
                    this.init = false
                    this.canvas.width   = window.innerWidth;
                    this.canvas.height  = window.innerHeight;
                    if(this.options.percent) {
                        this.canvas.height  = window.innerHeight * this.options.percent;        
                    } 
                }.bind(this),
                touchstart: function(e) {
                    this.lastX          = null;
                    this.lastY          = null;
                    this.lastZoomScale  = null;
                }.bind(this),
                touchmove: function(e) {
                    e.preventDefault();
                    
                    if(e.targetTouches.length == 2) { //pinch
                        this.doZoom(this.gesturePinchZoom(e));
                    }
                    else if(e.targetTouches.length == 1) {
                        var relativeX = e.targetTouches[0].pageX - this.canvas.getBoundingClientRect().left;
                        var relativeY = e.targetTouches[0].pageY - this.canvas.getBoundingClientRect().top;                
                        this.doMove(relativeX, relativeY);
                    }
                }.bind(this),
                mousewheel: function(e) {
                    var e = window.event || e; // old IE support
                    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
                    this.doZoom(15 * delta);
                }.bind(this),
                mousedown: function(e) {
                    this.mdown = true;
                    this.lastX = null;
                    this.lastY = null;
                }.bind(this),
                mouseup: function(e) {
                    this.mdown = false;
                }.bind(this),
                mousemove: function(e) {
                    var relativeX = e.pageX - this.canvas.getBoundingClientRect().left;
                    var relativeY = e.pageY - this.canvas.getBoundingClientRect().top;

                    if(e.target == this.canvas && this.mdown) {
                        this.doMove(relativeX, relativeY);
                    }

                    if(relativeX <= 0 || relativeX >= this.canvas.width || relativeY <= 0 || relativeY >= this.canvas.height) {
                        this.mdown = false;
                    }
                }.bind(this)
            }

            // resize
            window.addEventListener('resize',this.events.resize);
            
            // touch
            this.canvas.addEventListener('touchstart', this.events.touchstart);
            this.canvas.addEventListener('touchmove', this.events.touchmove);

            // zoom
            window.addEventListener('mousewheel', this.events.mousewheel)
            window.addEventListener('DOMMouseScroll', this.events.mousewheel)

            // move
            window.addEventListener('mousedown', this.events.mousedown);
            window.addEventListener('mouseup', this.events.mouseup);
            window.addEventListener('mousemove', this.events.mousemove);
        },

        checkRequestAnimationFrame: function() {
            var lastTime = 0;
            var vendors = ['ms', 'moz', 'webkit', 'o'];
            for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
                window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
                window.cancelAnimationFrame = 
                  window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
            }

            if (!window.requestAnimationFrame) {
                window.requestAnimationFrame = function(callback, element) {
                    var currTime = new Date().getTime();
                    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                    var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
                      timeToCall);
                    lastTime = currTime + timeToCall;
                    return id;
                };
            }

            if (!window.cancelAnimationFrame) {
                window.cancelAnimationFrame = function(id) {
                    clearTimeout(id);
                };
            }
        }
    };

    root.ImgTouchCanvas = ImgTouchCanvas;
}).call(this);
