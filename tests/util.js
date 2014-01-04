var redis = require('redis');

var getClient = module.exports.getClient = function() {
	return redis.createClient();
};

module.exports.deleteRedisKey = function(key) {
	getClient().del(key);
};

module.exports.setRedisKey = function(key) {
	getClient().set(key, Date.now() + 1000000);
};

module.exports.getRedisKey = function(key, callback) {
	return getClient().get(key, callback);
};