;
(function($) {
	$.JsSocket = function(options) {
		var defaults = {
			wsUrl: 'ws://localhost:65500',
			ws: undefined, //websocket实例
			lockReconnect: false,
			messagefunc: undefined,
			loginfunc: undefined,
			onstatefunc: undefined,
			heartbeattime:30000,//6秒
			reconnecttime:50000,//10秒
			ConnState: {
				Init: 0,
				Connected: 1,
				Reconnect: 2,
				Close: 3,
				Logining: 4,
				Logined: 5,
				Error: 6
			}
		};
		$.extend(true, defaults, options);　
		$.JsSocket.ConnState = defaults.ConnState;
		window.ConnState = defaults.ConnState;
		//心跳检测
		var heartCheck = {
			timeout: defaults.heartbeattime, //6秒
			timeoutObj: null,
			serverTimeoutObj: null,
			reset: function() {
				clearTimeout(this.timeoutObj);
				clearTimeout(this.serverTimeoutObj);
				return this;
			},
			start: function() {
				var self = this;
				this.timeoutObj = setTimeout(function() {
					//这里发送一个心跳，后端收到后，返回一个心跳消息，
					//onmessage拿到返回的心跳就说明连接正常
					defaults.ws.send("HeartBeat");
					self.serverTimeoutObj = setTimeout(function() { //如果超过一定时间还没重置，说明后端主动断开了
						defaults.wsws.close(); //如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
					}, self.timeout)
				}, this.timeout)
			}
		};
		var socket = {
			createWebSocket: function() {
				try {
					socket.onstate(defaults.ConnState.Init)
					defaults.ws = new WebSocket(defaults.wsUrl);
					socket.initEventHandle(defaults.messagefunc, defaults.loginfunc);
				} catch(e) {
					reconnect(defaults.wsUrl);
					console.log("连接失败");
				}
			},
			initEventHandle: function(onmessage, loginfunc) {
				defaults.ws.onclose = function() {
					socket.onstate(defaults.ConnState.Close);
					socket.reconnect(defaults.wsUrl);
				}; 
				defaults.ws.onerror = function() {
					socket.onstate(defaults.ConnState.Error);
					socket.reconnect(defaults.wsUrl);
				};
				defaults.ws.onopen = function() {

					socket.onstate(defaults.ConnState.Connected);
					//心跳检测重置
					heartCheck.reset().start();
					if(loginfunc && typeof(loginfunc) == "function") {
						socket.onstate(defaults.ConnState.Logining);
						loginfunc(defaults.ws);
					}
					//ws.send("Org " + GetQueryString('org'));
				};
				defaults.ws.onmessage = function(event) {
					//如果获取到消息，心跳检测重置
					//拿到任何消息都说明当前连接是正常的
					heartCheck.reset().start();

					if(event.data == "HeartBeat") {
						console.log(event.data);
						return;
					} else if(event.data == "LoginState") {
						socket.onstate(defaults.ConnState.Logined);
						return;
					}
					if(defaults.messagefunc && typeof(defaults.messagefunc) == "function") {
						defaults.messagefunc(event);
					}
				}
			},
			onstate: function(state) {
				if(defaults.onstatefunc && typeof(defaults.onstatefunc) == "function") {
					defaults.onstatefunc(state);
				}
			},
			reconnect: function(url) {
				if(defaults.lockReconnect) return;
				defaults.lockReconnect = true;
				//没连接上会一直重连，设置延迟避免请求过多
				setTimeout(function() {
					this.onstate(defaults.ConnState.Reconnect);
					defaults.lockReconnect = false;
					socket.createWebSocket(defaults.wsUrl, defaults.messagefunc, defaults.loginfunc, defaults.onstatefunc);

				}, defaults.reconnecttime);
			}
		};　

		socket.createWebSocket();
	}
})(jQuery);