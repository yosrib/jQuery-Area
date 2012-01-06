/*
Copyright (C) 2012 by Web Creative5 - Samuel Ronce
www.webcreative5.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/**
 * @author Web Creative5 - Samuel Ronce
 * @version Beta 1.0
 * @use
 
  1) Create an element
  
  <div id="area"></div>
  
  2) Set the element as an area
  
  $('#area').area();
  
  ------------------
  
  Create two layers:
  
  1) Create an element
  
  <div id="area"></div>
  
  2) Set the element as an area
  
  $('#area').area();
  $('#area').area(); // A second time
  $('#area').area('layer', 0); // Select the first layer created
  
  ------------------
  
  Retrieve API (current zone)
  
  var area = $('#area').area('get');
  area.reverse(); // Reverse the area
  
  Retrieve API (area determined)
  
  var area = $('#area').area('get', 1); // second area
  area.showLine(false); // Hide lines
 
 */

(function($) {

	var CSS_PREF = "area-";
	var Layer = {};
	
	function Area(el, opt, layer_depth, layer_id) {
		this.el = el;
		this.canvas;
		this.ctx;
		this.layer_id = layer_id;
		this.layer_depth = layer_depth;
		this.options = opt;
		this.points = [];
		this._construct();
	}
	
	Area.prototype = {
		_construct: function() {
			var canvas = document.createElement("canvas");
			canvas.width = this.el.width();
			canvas.height = this.el.height();
			this.ctx = canvas.getContext("2d"),
			this.canvas = $(canvas);
			this.canvas.addClass('area-canvas');
			this.el.append(this.canvas);
			if (this.el.css('position') == "static") {
				this.el.css('position', 'relative');
			}
		
			this.el.click($.proxy(function(e) {
				if (!this.isThisLayer()) return;
				var pos = this.getPositionMouse(e);
				this.addPoint(pos.x, pos.y);
			}, this));
			
			if (this.options.keyDelete) {
				$(document).keydown($.proxy(function(e) {
					if (!this.isThisLayer()) return;
					if (e.which == 46) {
						var points = this.getPointSelected();
						$.each(points, $.proxy(function(index, p) {
							this.removePoint(p);
						}, this));
					}
				}, this));
			}
		},
		
		/**
		 * Add a point
		 * @method addPoint
		 * @param {Integer} x
		 * @param {Integer} y
		 * @return {Point}
		*/
		addPoint: function(x, y) {
			var point = new Point(x, y, this);
			point.display(this.el, this.options.colorPoints);
			this.points.push(point);
			if (this.options.onAddPoint) this.options.onAddPoint.call(this, point);
			this.refresh();
			return point;			
		},
		
		/**
		 * Remove all points
		 * @method removeAllPoints
		*/
		removeAllPoints: function() {
			for (var i=0 ; i < this.points.length ; i++) {
				this.removePoint(this.points[i]);
			}
		},
		
		/**
		 * Hide points
		 * @method hidePoints
		*/
		hidePoints: function() {
			for (var i=0 ; i < this.points.length ; i++) {
				this.points[i].getElement().hide();
			}
		},
		
		/**
		 * Show Points
		 * @method showPoints
		*/
		showPoints: function() {
			for (var i=0 ; i < this.points.length ; i++) {
				this.points[i].getElement().show();
			}
		},
		
		/**
		 * Remove a point
		 * @method removePoint
		 * @param {Integer|Point} id The identifier of the point (attribute "data-id") or the Point object
		*/
		removePoint: function(id) {
			if (id instanceof Point) {
				id = id.id;
			}
			var pos;
			var old_point;
			for (var i=0 ; i < this.points.length ; i++) {
				if (this.points[i].id == id) {
					pos = i;
					old_point = this.points[i];
					break;
				}
			}
			if (pos === undefined) {
				console.log("jQuery Area : Point #" + id + " does not exists");
				return;
			}
			var last = this.points.length-1;
			if (pos == 0) {
				this.points.shift();
			}
			else if (pos == last) {
				this.points.pop();
			}
			else {
				this.points.splice(pos, 1);
			}
			this.el.children('div.' + CSS_PREF + 'point[data-id="' + id + '"]').remove();
			if (this.options.onRemovePoint) this.options.onRemovePoint.call(this, old_point);
			this.refresh();		
		},
		
		/**
		 * Delete last point
		 * @method removeLastPoint
		*/
		removeLastPoint: function() {
			var last = this.points[this.points.length-1];
			this.removePoint(last);
		},
		
		/**
		 * Get selected points
		 * @method getPointSelected
		 * @return {Array} array containing idenfiants of point
		*/
		getPointSelected: function() {
			var points = [], self = this;
			this.el.children('div.' + CSS_PREF + 'point-selected').each(function() {
				points.push(self.getPointById($(this).attr('data-id')));
			});
			return points;
		},
		
		/**
		 * Getting a point according to its ID (attribute "data-id")
		 * @method getPointById
		 * @param {Integer} id Point ID
		 * @return {Boolean} true if the point was found
		*/
		getPointById: function(id) {
			for (var i=0 ; i < this.points.length ; i++) {
				if (this.points[i].id == id) {
					return this.points[i];
				}
			}
			return false;
		},
		
		/**
		 * Refreshes the canvas
		 * @method refresh
		*/
		refresh: function() {
			this.ctx.clearRect(0, 0, this.el.width(), this.el.height());
			this.ctx.globalCompositeOperation = "source-over";
			this.ctx.globalAlpha = this.options.opacity;
			if (this.options.reverse) {
				this.ctx.fillStyle = this.options.color;
				this.ctx.fillRect(0, 0, this.el.width(), this.el.height());
				this.ctx.globalCompositeOperation = "destination-out";
				this.ctx.globalAlpha = 1;
			}
			
			this.ctx.beginPath();		
			this.ctx.strokeStyle = this.options.color;
			this.ctx.moveTo(this.points[0].x, this.points[0].y);
			$.each(this.points, $.proxy(function(i, point) {
				if (this.points[i+1]) {
					this.ctx.lineTo(this.points[i+1].x, this.points[i+1].y);
				}
			}, this));
			this.ctx.closePath();
			if (this.options.fill) {
				if (this.options.showLine) this.ctx.stroke();
				this.ctx.fill();
				this.ctx.fillStyle = this.options.color;
			}
			else {
				if (this.options.showLine) this.ctx.stroke();
			}
		
		},
		
		/**
		 * Get the mouse coordinates in the area
		 * @method getPositionMouse
		 * @param {Event} e Event of the mouse (see "click", "mousemove", etc.)
		 * @return {Object} Object {x, y}
		*/
		getPositionMouse: function(e) {
			var pos = this.el.offset();
			return {
				x: e.pageX - pos.left,
				y: e.pageY - pos.top
			};
		},
		isThisLayer: function() {
			return this.layer_depth == Layer[this.layer_id].current;
		},
		
		/**
		 * Assign a color to the area, points and lines
		 * @method setColor
		 * @param {String} color Color
		*/
		setColor: function(color) {
			this.options.color = color;
			for (var i=0 ; i < this.points.length ; i++) {
				this.points[i]._setColor(color);
			}
			this.refresh();
		},
		
		/**
		 * Show or hide the lines of the area
		 * @method showLine
		 * @param {Boolean} (optional) true: show; false: hide. true by default
		*/
		showLine: function(bool) {
			bool = bool === undefined ? true : bool;
			this.options.showLine = bool;
			this.refresh();
		},
		
		/**
		 * Reverse zone
		 * @method reverse
		*/
		reverse: function() {
			this.options.reverse = this.options.reverse ? false : true;
			this.refresh();
		},
		
		/**
		 * Set opacity to the area
		 * @method setOpacity
		 * @param {Float} Opacity between 0 and 1
		*/
		setOpacity: function(opacity) {
			this.options.opacity = opacity;
			this.refresh();
		},
		
		/**
		 * Obtain the coordinates of each point in the form of an array
		 * @method serialize
		 * @param {Boolean} Returns true if JSON format
		 * @return {Array|String} Array: [{"x": ..., "y": ...}, ...]
		*/
		serialize: function(json) {
			var data = [], p;
			for (var i=0 ; i < this.points.length ; i++) {
				p = this.points[i];
				data.push({
					x: p.x,
					y: p.y
				});
			}
			return json ? JSON.stringify(data) : data;
		},
		
		/**
		 * Load an array or JSON to dynamically add points
		 * @method load
		 * @param {Array|String}  Array  or JSON : [{"x": ..., "y": ...}, ...]
		*/
		load: function(data) {
			if (!$.isArray(data)) {
				data = $.parseJSON(data);
			}
			for (var i=0 ; i < data.length ; i++) {
				this.addPoint(data[i].x, data[i].y);
			}
		}
	}
	
	function Point(x, y, area) {
		this.x = x;
		this.y = y;
		this.id = new Date().getTime();
		this.area = area;
		this._construct();
	}
	
	Point.prototype = {
		_construct: function() {
			var self = this;
			var p = $('<div>');
			p.addClass(CSS_PREF + 'point');
			p.css({
				left: this.x,
				top: this.y
			});
			p.attr('data-id', this.id);
			this.element = p;
			
		},
		display: function(div, color) {
			var self = this;
			this.element.css({
				backgroundColor: color
			})
			div.append(this.element);
			if (this.element.draggable) {
				this.element.draggable({
					drag: function(event, ui) {
						if (!self.area.isThisLayer()) return;
						var pos = ui.position;
						self.x = pos.left;
						self.y = pos.top;
						self.area.refresh();
						if (self.area.onDragPoint) self.area.onDragPoint.call(self, self.area, event, ui);
					},
					start: function(event, ui) {
						if (self.area.onDragStartPoint) self.area.onDragStartPoint.call(self, self.area, event, ui);
					},
					stop: function(event, ui) {
						if (self.area.onDragStopPoint) self.area.onDragStopPoint.call(self, self.area, event, ui);
					}
				});
			}
			this.element.toggle(function(e) {
				if (!self.area.isThisLayer()) return;
				$(this).addClass(CSS_PREF + 'point-selected');
				if (self.area.onSelectPoint) self.area.onSelectPoint.call(self, self.area, e);
				return false;
			}, function(e) {
				if (!self.area.isThisLayer()) return;
				$(this).removeClass(CSS_PREF + 'point-selected');
				if (self.area.onUnselectPoint) self.area.onUnselectPoint.call(self, self.area, e);
				return false;
			});
		},
		
		/**
		 * Get element from the point
		 * @method getElement
		 * @return {jQuery('element')}
		*/
		getElement: function() {
			return this.element;
		},
		_setColor: function(color) {
			this.element.css('color', color);
		}
	}

	$.fn.area = function(params, layer) {	
		var id = $(this).attr('data-id');
		if (layer === undefined && id) {
			layer = Layer[id].current;
		}
		if (params == 'layer') {
			Layer[id].current = layer;
			return Layer[id].content[layer];
		}
		else if (params == 'get') {
			return Layer[id].content[layer];
		}
	
		var opt = $.extend({
			color: 'red',
			colorPoints: false,
			reverse: false,
			opacity: .5,
			showLine: true,
			fill: true,
			keyDelete: true,
			onSelectPoint: false,
			onUnselectPoint: false,
			onDragPoint: false,
			onDragStartPoint: false,
			onDragStopPoint: false,
			onAddPoint: false,
			onRemovePoint: false
		}, params);
		
		if (!opt.colorPoints) opt.colorPoints = opt.color;
		
		this.each(function() {
			var id = $(this).attr('data-id');
			if (!id) {
				id = new Date().getTime();
				$(this).attr('data-id', id);
				Layer[id] = {
					current: 0,
					content: []
				}
			}
			Layer[id].current = Layer[id].content.length;
			Layer[id].content.push(new Area($(this), opt, Layer[id].current, id));	 			
		});

		return this;
	};

})(jQuery);