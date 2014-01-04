var DEFAULT_TIMEOUT = 5000;
var DEFAULT_RETRY_DELAY = 100;
var DEFAULT_MAX_RETRY = 20;
var redis = require('redis');

var Lock = module.exports.Lock = function(key, options) {
	options = options || {};
	this.key = key;
	this.retries = 0;
	this.maxRetries = options.maxRetries ? options.maxRetries : DEFAULT_MAX_RETRY;
	this.retryDelay = options.retryDelay ? options.retryDelay : DEFAULT_RETRY_DELAY;
	this.timeout = options.timeout ? options.timeout : DEFAULT_TIMEOUT;
	this.rclient = options.rclient ? options.rclient : redis.createClient();
	this._locked = false;
	this._expire = 0;
};

Lock.prototype = {
	_retry : function(delay, callback) {
		var self = this;
		if (this._locked) {
			return;
		}
		if(this.retries > this.maxRetries) {
			return callback(null, null);
		}
		setTimeout(function() {
			self.acquire(callback);
		}, delay);
		this.retries++;
	},
	acquire : function(callback) {
		var self = this;
		/* holding own expire; */
		this._expire = currentUnixTimestamp() + this.timeout + 1;
		
		acquire(this.key, this._expire, this.rclient, function(err, locked) {
			if(err) {
				return callback(err, null);
			}
			if(locked !== true) {
				return self._retry(self.retryDelay, callback);
			}
			self._locked = true;
			return callback(null, function(callback) {
				self.release(callback);
			});
		});
	},
	release : function(callback) {
		var cb = callback || noop, self = this;
		if(this._locked) {
			/* the job took too long */
			if (this._expire < currentUnixTimestamp()) {
				self._locked = false;
				return cb(null, true);
			}
			release(this.key, this.rclient, function(err, ok) {
				if(err) {
					return cb(err, null);
				}
				self._locked = false;
				return cb(null, !!ok);
			});
		} else {
			cb(new Error('Not own the lock'), null);
		}
	}
};

var noop = function() {
};
var currentUnixTimestamp = function() {
	/* should be secs here :-D */
	return Date.now();
};
var acquire = function(key, expire, rclient, callback) {
	rclient.setnx(key, expire, function(err, ok) {
		if(err) {
			return callback(err, false);
		}
		
		if(ok) {
			return callback(null, true);
		}
		
		rclient.get(key, function(err, result) {
			var oldTimeout;
			if(err) {
				return callback(err, false);
			}
			oldTimeout = parseInt(result, 10);
			/* wrong data or someone deleted */
			if(isNaN(oldTimeout)) {
				return callback(null, false);
			}
			/* not expired; can be problem if multiservers with not sync timestamp */
			if(oldTimeout > currentUnixTimestamp()) {
				return callback(null, false);
			}
			/* expired */
			rclient.getset(key, expire, function(err, result) {
				var stillOldTimeout;
				if(err) {
					return callback(err, false);
				}
				stillOldTimeout = parseInt(result, 10);
				/* ??? */
				if(isNaN(stillOldTimeout)) {
					return callback(null, false);
				}
				/* someone was faster */
				if(oldTimeout !== stillOldTimeout) {
					return callback(null, false);
				}
				return callback(null, true);
			});
		});
	});
};
var release = function(key, rclient, callback) {
	rclient.del(key, function(err, result) {
		if(err) {
			return callback(err, null);
		}
		return callback(null, result);
	});
};
