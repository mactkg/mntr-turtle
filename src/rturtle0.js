//
// The TURTLE interpreter / javascript
//
//

function println(str) {
	console.log(str)
}
function init() {
	var canvas = document.getElementById("canvas");
	var console = document.getElementById("console");
	var pointer = canvas.lastChild;
	var source = console.source;
	var intervalNum = console.interval;
	var startButton = console.start;
	var imagenizeButton = console.imagenize;
	var samples = console.samples;
	
	var _ = "  ";
	var turtle = new Turtle(canvas.firstChild);

	startButton.disabled = false;
	
	turtle.on("start", function() {
		startButton.disabled = true;
		startButton.value = "描画中...";
	});
	
	turtle.on("end", function() {
		startButton.disabled = false;
		startButton.value = "実行";
	});

	turtle.on("point", function(x,y) {
		pointer.style.left = (x-1) + "px";
		pointer.style.top = (y-1) + "px";
	});

	intervalNum.onchange = function() {
		turtle.skipRadius = Math.pow(10e3, Number(this.value));
	};
	startButton.onclick = function() {
		turtle.skipRadius = Math.pow(10e3, Number(intervalNum.value));
		turtle.run(source.value);
	};
	imagenizeButton.onclick = function() {
		try {
			var url = turtle.getImageURL();
			window.open(url, null);
		} catch (e) {
			alert("このブラウザでは画像のエクスポートができません。");
		}
	};	


	// tab inserter
	var insertTab = function(e) {
		if (e.keyCode == 9) {
			var startPos = source.selectionStart;
			var endPos = source.selectionEnd;
			var before = source.value.slice(0, startPos);
			var after = source.value.slice(endPos);

			source.value = before + _ + after;
			source.setSelectionRange(endPos+_.length, endPos+_.length);
			return false;
		}
	};
	source.onblur = function() {
		window.onkeydown = function() {};
	};
	source.onfocus = function() {
		setTimeout(function() {
			window.onkeydown = insertTab;
		}, 300);
	};

	// sample draws
	var draws = {
		"四角":
			"Center\n"+
			"Repeat 4 [\n"+
			_+"Forward 100\n"+
			_+"Turn 90\n"+
			"]",
		"星":
			"Center\n"+
			"Turn 90\n"+
			"Repeat 5 [\n"+
			_+"Forward 100\n"+
			_+"Turn 144\n"+
			"]",
		"円":
			"Center\n"+
			"Turn 60\n"+
			_+"Repeat 360 [\n"+
			_+"Forward 1\n"+
			_+"Turn 1\n"+
			"]",
		"花":
			"Center\n"+
			"Repeat 6 [\n"+
			_+"Turn 60\n"+
			_+"Repeat 360 [\n"+
			_+_+"Forward 1\n"+
			_+_+"Turn 1\n"+
			_+"]\n"+
			"]",
	};
	
	for (var name in draws) {
		var opt = document.createElement("option");
		opt.setAttribute("value", draws[name]);
		opt.innerHTML = name;
		samples.appendChild(opt);
	}
	samples.onchange = function() {
		var index = samples.selectedIndex;
		if (index <= 0) return false;
		
		source.value = samples.options[index].getAttribute("value");
	}

}

var Vector2D = {
	degreeToRadian: function (deg) {
		return (deg/360)*2*Math.PI;
	},
	rotate: function (x, y, rad) {
		x = Number(x); y = Number(y);
		return {
			x: x*Math.cos(rad)-y*Math.sin(rad),
			y: x*Math.sin(rad)+y*Math.cos(rad)
		};
	}
};


function TokenArray() {
	// inherit
	Array.apply(this);

	// properties
	this.current = -1;
	
	// construtor
	this.initialize.apply(this, arguments);
}
TokenArray.prototype = (function() {
	var proto = new Array;

	// constructor
	proto.initialize = function(code) {
		var list = code.split(/\r?\n\r?/);
		while (list.length) {
			var line = list.shift();
			if (line != "") {
				// Forwardコマンドに限り、数ピクセル刻みで分割
				if(line.toLowerCase().indexOf("forward") != -1) {
				 	var nums = line.trim().split(" ")[1];
				 	for(var i = 0; i < nums; i++) {
						this.push("Forward 1");
					}
				} else {
					this.push(line);
				}
			}
		}
		this.first();
	};
	
	// public
	proto.first = function() {
		this.current = -1;
	};
	
	proto.next = function() {
		if (this.length <= 0) return null;
		if (this.current >= this.length-1) {
			this.current = this.length-1;
			return null;
		}
		return this._parseToken(++this.current);
	};
	

	// private
	proto._parseToken = function(lineNum) {
		var raw = this[lineNum].split(" ");
		var token = [];

		while (raw.length) {
			var args = raw.shift();
			if (args != "") token.push(args);
		}
		return token;
	};

	// aspect
	/*
	var _aspect = function() {
		if (this.length <= 0) throw new Error("oops! there's no codes!");
		if (this.length <= this.current) {
			this.current = this.length-1;
			return null;
		}
	};
	var _methods = ["next"];
	while(_methods.length) (function(name) {
		var f = proto[name];
		proto[name] = function() {
			_aspect.apply(this, arguments);
			f.apply(this, arguments);
		};
	})(_methods.shift());
	*/
	
	return proto;
})();


/**
 * class Interpreter
 */
function Interpreter() {
	// properties
	this.interval = 100;
	
	this._tokenList = [];
	this._map = {};
}
Interpreter.prototype = (function() {
	var proto = {};

	// public
	proto.run = function(code) {
		this._interprete(code);
	};

	proto.end = function() {
		this._tokenList.length = 0;
	};

	proto.on = function(key, callback) {
		this._map[key.toLowerCase()] = callback;
	};

	proto.off = function(key) {
		var f = this._map[key.toLowerCase()] || function() {};
		this._map[key.toLowerCase()] = undefined;
		return f;
	};

	proto.dispatch = function(key, args) {
		var that = this;
		
		if (this._map[key.toLowerCase()]) {
			//setTimeout(function() {
				that._map[key.toLowerCase()].apply(that, args)
			//}, 0);
		}
	};
	
	proto.count = function() {
		return this._tokenList.current;
	};
	
	proto.move = function(count) {
		return this._tokenList.current = count;
	};
	
	// private
	proto._interprete = function(code) {
		var that = this;
		// split each lines
		this._tokenList = new TokenArray(code);
		
		// interprete
		(function() {
			var token, key;
			
			do {
				token = that._tokenList.next();
				if (!token) return that.dispatch("end");
				
				key = token.shift();
				that.dispatch(key, token);
				
				if (0 < that.interval) {
					return setTimeout(arguments.callee, that.interval);
				}
			} while(true);
		})();
	};
	
	return proto;
})();


/**
 * class Turtle
 */
function Turtle(element) {
	// inherit
	Interpreter.apply(this);
	
	// properties
	this.canvas = element;
	this.interval = 0;
	
	this.x = 0;
	this.y = 0;
	this.degree = 0;
	this.skipRadius = 1;
	
	this._duration = 0;
	this._varStore = {};

		
	// constructor
	if (!element) throw new Error("element:Element not specified.");
	
	var ctx = element.getContext("2d");
	var that = this;

	this.on("repeat", function(num) {
		var count = this.count();
		var handler = this.off("]");
		
		that.on("]", function() {
			if (--num <= 0) return that.on("]", handler);
			that.move(count);
		});
		
	});
	
	this.on("forward", function(duration) {
		
		duration = Number(duration);

		// あまりに描画が遅いので高速化
		if (that.duration < that.skipRadius) {
			that.duration += duration;
			that.interval = 0;
		} else {
			that.interval = 1;
			that.duration = 0;
		}
		
		var rotated = Vector2D.rotate(
			0, duration, Vector2D.degreeToRadian(that.degree+180)
		);
		var rx = Number(that.x+rotated.x), ry = Number(that.y+rotated.y);
		
		ctx.beginPath();
		ctx.moveTo(that.x, that.y);
		ctx.lineTo(rx, ry);
		ctx.stroke();

		that.dispatch("moveto", [rx, ry]);
		that.dispatch("point", [rx, ry]);
	});

	this.on("moveto", function(x, y) {
		x = Number(x), y = Number(y);

		that.x = x;
		that.y = y;
		ctx.moveTo(x, y);
		that.dispatch("point", [x, y]);
	});

	this.on("center", function() {
		var dim = that.getCanvasSize();
		that.dispatch("moveTo", [parseInt(dim.width/2), parseInt(dim.height/2)]);
	});

	this.on("turn", function(degree) {
		that.degree = that.degree + Number(degree) % 360;
	});

	this.on("setsize", function(width, height) {
		that.setCanvasSize({width: Number(width), height: Number(height)});
	});

	this.on("clear", function() {
		var dim = that.getCanvasSize();
		ctx.clearRect(0, 0, dim.width, dim.height);
	});
	
	this.on("end", function() {
		that.end();
	});
}
Turtle.prototype = (function() {
	var proto = new Interpreter;

	// public
	var _proto_run = proto.run;
	proto.run = function(code) {
		this.clear();
		this.degree = 0;
		this.dispatch("start");
		this.dispatch("moveto", [0, 0]);
		
		_proto_run.call(this, code);
	};

	proto.clear = function() {
		this.dispatch("clear");
		this.dispatch("end");
		this.off("]")
	};

	proto.setCanvasSize = function(dimension) {
		this.canvas.setAttribute("width", String(dimension.width));
		this.canvas.setAttribute("height", String(dimension.height));
	};
	
	proto.getCanvasSize = function() {
		return {
			width: Number(this.canvas.getAttribute("width")),
			height: Number(this.canvas.getAttribute("height")),
		};
	};

	proto.getImageURL = function(type) {
		return this.ctx.toDataURL(type ? type : "image/png");
	};

	// private
	
	return proto;
})();

window.onload = init;
