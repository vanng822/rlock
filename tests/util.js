var redis = require('redis');

var getClient = module.exports.getClient = function() {
	return redis.createClient();
};

module.exports.deleteRedisKey = function(key) {
	getClient().del(key);
};

module.exports.setRedisKey = function(key, timeout, callback) {
	getClient().set(key, timeout, callback);
};

module.exports.getRedisKey = function(key, callback) {
	return getClient().get(key, callback);
};