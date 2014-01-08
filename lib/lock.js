var DEFAULT_TIMEOUT = 5000;
var DEFAULT_RETRY_DELAY = 50;
var DEFAULT_MAX_RETRY = 10;
var redis = require('redis');
var rclient = null;

var getRedisClient = function() {
	if (rclient === null) {
		rclient = redis.createClient();
	}
	return rclient;
};

module.exports.setRedisClient = function(client) {
	rclient = client;
};

var Lock = module.exports.Lock = function(key, options) {
	options = options || {};
	this.key = key;
	this.retries = 0;
	this.maxRetries = options.maxRetries ? options.maxRetries : DEFAULT_MAX_RETRY;
	this.retryDelay = options.retryDelay ? options.retryDelay : DEFAULT_RETRY_DELAY;
	this.timeout = options.timeout ? options.timeout : DEFAULT_TIMEOUT;
	this.rclient = options.rclient ? options.rclient : getRedisClient();
	this._locked = false;
	this._expire = 0;
};

Lock.prototype = {
	_retry : function(delay, callback) {
		var self;
		if (this._locked) {
			return;
		}
		if(this.retries >= this.maxRetries) {
			return callback(null, null);
		}
		self = this;
		setTimeout(function() {
			self.acquire(callback);
		}, delay);
		this.retries++;
	},
	acquire : function(callback) {
		var self;
		if (!this.key) {
			throw new Error('Can not lock without a key');
		}
		if (!callback) {
			throw new Error('Need to specify a function for callback');
		}
		self = this;
		acquire(this.key, this.timeout, this.rclient, function(err, expire) {
			if(err) {
				return callback(err, null);
			}
			if(expire === false) {
				return self._retry(self.retryDelay, callback);
			}
			/* holding own expire; */
			self._expire = expire;
			self._locked = true;
			return callback(null, function(callback) {
				self.release(callback);
			});
		});
	},
	release : function(callback) {
		var cb = callback || noop, self;
		if(this._locked) {
			/* the job took too long */
			if (this._expire < currentUnixTimestamp()) {
				this._locked = false;
				console.warn('Try to release expired lock "' + this.key + '"! consider increase timeout for this job?');
				return cb(null, true);
			}
			self = this;
			release(this.key, this.rclient, function(err, ok) {
				if(err) {
					return cb(err, null);
				}
				self._locked = false;
				return cb(null, !!ok);
			});
		} else {
			console.warn('Try to release lock "' + this.key + '" which is not owning');
			cb(new Error('Not owning the lock'), null);
		}
	}
};

var noop = function() {
};
var currentUnixTimestamp = function() {
	/* should be secs here :-D */
	return Date.now();
};
var acquire = function(key, timeout, rclient, callback) {
	var expire = currentUnixTimestamp() + timeout + 1;
	rclient.setnx(key, expire, function(err, ok) {
		if(err) {
			return callback(err, false);
		}
		
		if(ok) {
			return callback(null, expire);
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
			expire = currentUnixTimestamp() + timeout + 1;
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
				
				return callback(null, expire);
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
