exports.client = db;
exports.connect = connect;
exports.findStoresInZip = findStoresInZip;
exports.findStoresInRange = findStoresInRange;
exports.getStore = getStore;

var mongo = require('mongodb')
  , BSON = mongo.BSONPure
  , db = null
  , bson = mongo.BSONPure
  , stores = 'stores'
  ;


/**
 * Connect to snapdb mongo database.
 */
function connect(uri, callback) {
  console.log('connecting to database (' + uri + ')');
  mongo.MongoClient.connect(uri, {safe: true}, function (err, client) {
    if (err) return callback(err);

    db = client;
    db.addListener("error", function (error) {
      console.log("mongo client error: " + error);
    });

    callback(null, db);
  });
}

/**
 * Find all the stores within a certain distance (miles).
 * Uses mongo native geo query support.
 */
function findStoresInRange(location, range, callback) {
  db.collection(stores, function(err, collection) {
    if(err) return callback(err);

    var query = {loc: {$geoWithin: {$centerSphere:
        [[location.lng, location.lat] , range / 3959]}}} ;

    collection.find(query).toArray(function(err, docs) {
      if (err) return callback(err);
      callback(null, docs);
    });
  });
}

/**
 * Find all the stores within a certain distance (miles).
 * Very fast, but mongo's native support will be potentially
 * faster, since natively implemented and returning a smaller
 * result (see findStoresInRange).
 */
function findStoresInRangeApprox(location, range, callback) { var r = range / 60
    , lat0 = location.lat - r
    , lat1 = location.lat + r
    , lng0 = location.lng - r
    , lng1 = location.lng + r
    ;

  db.collection(stores, function(err, collection) {
    if(err) return callback(err);

    var query = {
        latitude: { $gt: lat0, $lt: lat1 }
      , longitude: { $gt: lng0, $lt: lng1}
    };

    collection.find(query).toArray(function(err, docs) {
      if (err) return callback(err);
      callback(null, docs);
    });
  });
}

/**
 * Find all the stores within a zip code.
 */
function findStoresInZip(zip, callback) {
  var zip5 = typeof(zip) == 'string' ? parseInt(zip, 10) : zip;

  db.collection(stores, function(err, collection) {
    if (err) return callback(err);

    collection.find({zip5:zip5}).toArray(function(err, docs) {
      if (err) return callback(err);
      callback(null, docs);
    })
  })
}

/**
 * Get store by _id (string). The id will be BSON encoded.
 */
function getStore(id, callback) {
  db.collection(stores, function(err, collection) {
    if(err) return callback(err);

    collection.findOne({ _id: BSON.ObjectID(id)}, function(err, store) {
      if (err) return callback(err);
      callback(null, store);
    });
  });
}

