exports.connect = connect;
exports.findStoresInRangeLocation = findStoresInRangeLocation;
exports.findStoresInRangeAddress = findStoresInRangeAddress;
exports.findStoresInZip = findStoresInZip;
exports.sortStoresByDistance = sortStoresByDistance;

var _ = require('underscore')
  , snapdb = require('./lib/snapdb')
  , geo = require('./lib/geo')
  ;

/**
 * Connect to the snapdb mongo database.
 */
function connect(mongodbUri, callback) {
  snapdb.connect(mongodbUri, function(err, client) {
    if (err) return callback(err);
    callback(null, client);
  });
};

// private helper
function findStoresInRange(georesult, range, callback) {
  snapdb.findStoresInRange(georesult.location, range, function(err, stores) {
    if (err) return callback(err);

    var sorted = sortStoresByDistance(georesult.location, stores);
    georesult.stores = _.filter(sorted, function(store) { return store.distance <= range; });
    return callback(null, georesult);
  });
}

/**
 * Find nearby stores in ascending distance order.
 * @param locaton an object with lat and lng properties
 * @param range a distance in miles, defaults to 3
 */
function findStoresInRangeLocation(location, range, callback) {
  range = range || 3;

  geo.reverseGeocode(location, function(err, georesult) {
    if (err) return callback(err);
    findStoresInRange(georesult, range, callback);
  });
}
  
/**
 * Find nearby stores in ascending distance order.
 * @param address a valid address or address fragment
 * @param range a distance in miles, defaults to 3
 */
function findStoresInRangeAddress(address, range, callback) {
  range = range || 3;

  geo.geocode(address, function(err, georesult) {
    if (err) return callback(err);
    findStoresInRange(georesult, range, callback);
  });
}
  
/**
 * Find stores within a zip code.
 * @param address a valid address, address fragment, or pair of coordinates
 */
function findStoresInZip(address, callback) {
  geo.geocode(address, function(err, georesult) {
    if (err) return callback(err);

    snapdb.findStoresInZip(georesult.zip5, function(err, stores) {
      if (err) return callback(err);
      georesult.stores = stores;
      return callback(null, georesult);
    });
  });
}

/**
 * Sorts the stores array in distance order from location, and also returns it.
 * @param location an object with lat and lng properties
 * @param stores an array of store objects
 */
function sortStoresByDistance(location, stores) {
  var i, s;

  for (i = 0; i < stores.length; i++) {
    s = stores[i];
    s.distance = geo.getDistanceInMiles(location,
        { lat:s.latitude, lng:s.longitude });
  }

  stores.sort(function(a,b) { return a.distance - b.distance; });
  return stores;
}

