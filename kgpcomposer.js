module.exports = function(RED) {
    function kgpComposerNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
		node.portNo = config.port;
		node.rules = config.rules;

		var udata;
		var Bpos = 0;
		var bPos = 7;
		var data = Buffer.alloc(4);

        function setBits(val, len)
		{
			if ( len > bPos + 1 )
			{
				let len0 = len - 1 - bPos;
				data[0] = val;
				data[0] = data[0] >> len0;
				udata[Bpos++] |= data[0];
				
				data[0] = val;
				data[0] = data[0] << (8 - len0);
				udata[Bpos] |= data[0];
				bPos = 7 - len0;
			}
			else
			{
				data[0] = val;
				data[0] = data[0] << (bPos + 1 - len);
				udata[Bpos] |= data[0];
				bPos -= len;
				if (bPos < 0 )
				{
				    bPos = 7;
				    Bpos++;
				}
			}
		}

        function set_bool(val)
		{
			data[0] = 0;
			if ( val )
			{
				data[0] = 1;
			}
			setBits( data[0], 1);
		}

		function set_uint4(val)
		{
			data[0] = val;
			setBits(data[0], 4);
		}

		function set_uint8(val)
		{
			data[0] = val;
			setBits(data[0], 8);
		}

		function set_uint16(val)
		{
			var dt = val << 24;
			data[1] =  dt >>> 24;
			data[0] = val >>> 8;
			setBits(data[0], 8);
			setBits(data[1], 8);
		}

		function set_uint32(val)
		{
			var dt = val << 24;
			data[3] = dt >>> 24;
			dt = val << 16;
			data[2] = dt >>> 24;
			dt = val << 8;
			data[1] = dt >>> 24;
			data[0] = val >>> 24;
			setBits(data[0], 8);
			setBits(data[1], 8);
			setBits(data[2], 8);
			setBits(data[3], 8);
		}

    function set_int4(val)
		{
			if ( val > 8 || val < -7 )
			{
				val = 0;
			}
			if ( val >= 0 && val < 8 )
			{
				data[0] = val;
			}
			else
			{
				data[0] = val + 16;
			}
			setBits(data[0], 4);
		}

		function set_int8(val)
		{
			set_uint8(val);
		}

		function set_int16(val)
		{
			set_uint16(val);
		}

		function set_int32(val)
		{
			set_uint32(val);
		}

		function set_float(val)
		{
			set_uint32(val);
		}

		function set_string(val)
		{
			var str = String(val);
			var len = str.length;
			if ( len > 15 )
			{
				len = 15;
			}
		
			data[0] = len;
			setBits(data[0], 4);
		
			for ( var i = 0; i < len; i++ )
			{
				data[0] = str.codePointAt(i);
				setBits(data[0], 8);
			}
		}

        var operators = {
        'true': function(a) { set_bool(true); },
        'false': function(a) { set_bool(false);},
        'uint4': function(a) { set_uint4(a); },
        'uint8': function(a) { set_uint8(a); },
        'uint16': function(a) { set_uint16(a); },
        'uint32': function(a) { set_uint32(a); },
        'int4': function(a) { set_int4(a); },
        'int8': function(a) { set_int8(a); },
        'int16': function(a) { set_int16(a); },
        'int32': function(a) { set_int32(a); },
        'float': function(a) { set_float(a); },
        'string': function(a) { set_string(a); }
        };

 

        node.on('input', function(msg) {
            Bpos = 0;
		    bPos = 7;
		    udata = Buffer.alloc(256, 0);

            var valid = true;
            for (var i=0; i<this.rules.length; i+=1) {
                var rule = this.rules[i];
                if (!rule.vt) {
                    if (!isNaN(Number(rule.v))) {
                        rule.vt = 'num';
                    } else {
                        rule.vt = 'str';
                    }
                }
                if (rule.vt === 'num') {
                    if (!isNaN(Number(rule.v))) {
                        rule.v = Number(rule.v);
                    }
                } 
            }
            if (!valid) {
                return;
            }

            try {
                for (var i=0; i<node.rules.length; i+=1) {
                    var rule = node.rules[i];
                    var v = rule.v;
			        if (typeof v !== 'undefined') {
                        try {
                            v = RED.util.evaluateNodeProperty(rule.v,rule.vt,node,msg);
                        } catch(err) {
                            v = undefined;
                        }
                    }                  
                    operators[rule.t](v);
                }
            } catch(err) {
                node.warn(err);
            }
	        var str = "";	
            for ( var i = 0; i <= Bpos; i++ )
			{   
                var hex = ('00' + (udata[i]).toString(16)).substr(-2);	
				str += hex;
			}	

            msg.port = node.portNo;
            msg.payload = str;
            node.send(msg);
        });
    }
    RED.nodes.registerType("kgpcomposer",kgpComposerNode);
}
