var assert = require('assert');
var rlock = require('../index.js');
var vows = require('vows');
var redis = require('redis');

vows.describe('Test suite for set redis client').addBatch({
	'it should be able to set redis client' : function() {
		var rclient = redis.createClient(6378);
		rclient.on('error', function(err) {
			// catch error emit so we not crashing
		});
		rlock.setRedisClient(rclient);
		
		var lock = new rlock.Lock('rlock.setClient1');
		assert.ok(lock.rclient === rclient);
		assert.ok(lock.rclient.port === rclient.port);
	}
}).export(module);
