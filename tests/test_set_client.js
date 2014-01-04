var assert = require('assert');
var rlock = require('../index.js');
var vows = require('vows');
var redis = require('redis');
var testUtil = require('./util.js');

vows.describe('Test suite for set redis client').addBatch({
	'it should be able to set redis client' : {
		topic : function() {
			rlock.setRedisClient(redis.createClient(64545));
			lock = new rlock.Lock('rlock.setClient1');
			lock.acquire(this.callback);
		},
		'It should give error due to wrong port' : function(err, result) {
			assert.ok(result === null);
			assert.ok(err !== null);
		}
	}
}).export(module);
