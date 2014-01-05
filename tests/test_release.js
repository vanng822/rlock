var assert = require('assert');
var rlock = require('../index.js');
var vows = require('vows');
var redis = require('redis');
var testUtil = require('./util.js');

vows.describe('Test suite for releasing lock').addBatch({
	'release not owned lock release1' : {
		'topic' : function() {
			var self = this;
			self.lock = new rlock.Lock('rlock::release1');
			self.lock.release(self.callback);
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
			self.lock = new rlock.Lock('rlock::release2', {
				retryDelay : 2,
				maxRetries : 5,
				timeout : 1
			});

			self.lock.acquire(function(err, done) {
				setTimeout(function() {
					self.lock.release(self.callback);
				}, 5);
			});
		},
		'it should be ok but see some warning log' : function(err, ok) {
			assert.ok(ok === true);
		}
	},
	'release lock release3' : {
		'topic' : function() {
			var self = this;
			this.lock = new rlock.Lock('rlock::release3');
			this.lock.acquire(function(err, done) {
				self.lock.release(self.callback);
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
				assert.ok(result === null);
			}
		}
	},
	'release lock release4 using done callback' : {
		'topic' : function() {
			var self = this;
			this.lock = new rlock.Lock('rlock::release4');
			this.lock.acquire(function(err, done) {
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
				assert.ok(result === null);
			}
		}
	},
	'release lock release5 after someone deleted' : {
		'topic' : function() {
			var self = this;
			this.lock = new rlock.Lock('rlock::release5');
			this.lock.acquire(function(err, done) {
				testUtil.deleteRedisKey('rlock::release5');
				setTimeout(function() {
					self.lock.release(self.callback);
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
			self.lock1 = new rlock.Lock('rlock::release6', {
				timeout : 5
			});
			self.lock2 = new rlock.Lock('rlock::release6');
			self.lock1.acquire(function(err, done) {
				setTimeout(function() {
					self.lock2.acquire(function() {
						self.lock1.release(self.callback);
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
				assert.ok(parseInt(result) === this.lock2._expire);
			},
			'And the one taking over releases' : {
				'topic' : function() {
					this.lock2.release(this.callback);
				},
				'which should be ok' : function(err, ok) {
					assert.ok(ok);
				},
				'and when getting value from redis' : {
					'topic' : function() {
						testUtil.getRedisKey('rlock::release6', this.callback);
					},
					'it should give null' : function(err, result) {
						assert.ok(result === null);
					}
				}
			}
		}
	}
}).export(module);
