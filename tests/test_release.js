var assert = require('assert');
var rlock = require('../index.js');
var vows = require('vows');
var redis = require('redis');
var testUtil = require('./util.js');

vows.describe('Test suite for releasing lock').addBatch({
	'release not owned lock release1' : {
		'topic' : function() {
			var self = this;
			var lock = new rlock.Lock('rlock::release1');
			lock.release(self.callback);
		},
		'it should return error and some warning log' : function(err, ok) {
			assert.ok(err !== null);
			assert.ok(err.message === 'Not owning the lock');
			assert.ok(ok === null);
		}
	},
	'release expire lock release2' : {
		'topic' : function() {
			var self = this;
			var lock = new rlock.Lock('rlock::release2', {
				retryDelay : 2,
				maxRetries : 5,
				timeout : 1
			});

			lock.acquire(function(err, done) {
				setTimeout(function() {
					lock.release(self.callback);
				}, 10);
			});
		},
		'it should be ok but see some warning log' : function(err, ok) {
			assert.ok(ok === true);
		}
	},
	'release lock release3' : {
		'topic' : function() {
			var self = this;
			lock = new rlock.Lock('rlock::release3');
			lock.acquire(function(err, done) {
				lock.release(self.callback);
			});
		},
		'should be ok' : function(err, result) {
			assert.ok(result === true);
		},
		'and when getting value from redis' : {
			'topic' : function() {
				testUtil.getRedisKey('rlock::release3', this.callback);
			},
			'it should give null' : function(err, result) {
				assert.ok(err === null);
				assert.ok(result === null);
			}
		}
	},
	'release lock release4 using done callback' : {
		'topic' : function() {
			var self = this;
			var lock = new rlock.Lock('rlock::release4');
			lock.acquire(function(err, done) {
				done(self.callback);
			});
		},
		'should be ok' : function(err, result) {
			assert.ok(result === true);
		},
		'and when getting value from redis' : {
			'topic' : function() {
				testUtil.getRedisKey('rlock::release4', this.callback);
			},
			'it should give null' : function(err, result) {
				assert.ok(err === null);
				assert.ok(result === null);
			}
		}
	},
	'release lock release5 after someone deleted' : {
		'topic' : function() {
			var self = this;
			var lock = new rlock.Lock('rlock::release5');
			lock.acquire(function(err, done) {
				testUtil.deleteRedisKey('rlock::release5');
				setTimeout(function() {
					lock.release(self.callback);
				}, 20);
			});
		},
		'should not be ok' : function(err, ok) {
			assert.ok(ok === false);
		}
	},
	'release lock release6 after someone took over it' : {
		'topic' : function() {
			var self = this;
			self.release6Lock1 = new rlock.Lock('rlock::release6', {
				timeout : 5
			});
			self.release6Lock2 = new rlock.Lock('rlock::release6');
			self.release6Lock1.acquire(function(err, done) {
				setTimeout(function() {
					self.release6Lock2.acquire(function() {
						self.release6Lock1.release(self.callback);
					});
				}, 10);
			});
		},
		'should be ok but see some warning' : function(err, ok) {
			assert.ok(ok === true);
		},
		'and when getting value from redis' : {
			'topic' : function() {
				testUtil.getRedisKey('rlock::release6', this.callback);
			},
			'it should give same value as the one taking over' : function(err, result) {
				assert.ok(parseInt(result) === this.release6Lock2._expire);
			},
			'And the one taking over releases' : {
				'topic' : function() {
					this.release6Lock2.release(this.callback);
				},
				'which should be ok' : function(err, ok) {
					assert.ok(ok);
				},
				'and when getting value from redis' : {
					'topic' : function() {
						testUtil.getRedisKey('rlock::release6', this.callback);
					},
					'it should give null' : function(err, result) {
						assert.ok(err === null);
						assert.ok(result === null);
					}
				}
			}
		}
	}
}).export(module);
